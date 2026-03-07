"""Diffusers pipeline manager for local image generation on Apple Silicon."""

import io
import logging
import random
import time

import gc

import torch
from diffusers import StableDiffusionXLPipeline, StableDiffusionXLImg2ImgPipeline, LCMScheduler, EulerDiscreteScheduler
from PIL import Image
from transformers import CLIPVisionModelWithProjection

import config

logger = logging.getLogger(__name__)


class ImageGenerator:
    def __init__(self):
        self.pipe = None
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"
        self.model_loaded = False
        self.load_time_ms = 0
        self._current_model_id: str | None = None
        # LCM-LoRA state
        self._lcm_enabled = False
        self._original_scheduler_config = None
        # IP-Adapter state
        self._ip_adapter_loaded = False
        self._image_encoder = None
        # Progress tracking
        self._current_job_id: str | None = None
        self._current_step: int = 0
        self._total_steps: int = 0
        self._step_start_time: float = 0
        self._avg_step_time_ms: float = 0
        self._cancelled: bool = False

    def _step_callback(self, pipe, step_index, timestep, callback_kwargs):
        """Called after each denoising step for progress tracking."""
        self._current_step = step_index + 1
        elapsed = (time.time() - self._step_start_time) * 1000
        if self._current_step > 0:
            self._avg_step_time_ms = elapsed / self._current_step
        if self._cancelled:
            raise InterruptedError("Generation cancelled")
        return callback_kwargs

    def cancel_current(self):
        """Request cancellation of current generation."""
        self._cancelled = True

    @property
    def progress(self) -> dict:
        """Return current generation progress."""
        if not self._current_job_id:
            return {"generating": False}
        remaining = self._total_steps - self._current_step
        eta_ms = remaining * self._avg_step_time_ms if self._avg_step_time_ms > 0 else 0
        return {
            "generating": True,
            "job_id": self._current_job_id,
            "current_step": self._current_step,
            "total_steps": self._total_steps,
            "avg_step_time_ms": round(self._avg_step_time_ms, 1),
            "estimated_remaining_ms": round(eta_ms, 1),
        }

    def load_model(self):
        """Load the SDXL pipeline with MPS-optimized settings.

        Uses float32 because fp16 on MPS produces all-black images.
        Memory usage ~12GB which fits comfortably in M4 Mac 32GB.
        """
        logger.info("Loading model: %s (device=%s, dtype=float32)", config.MODEL_ID, self.device)
        start = time.time()

        self.pipe = StableDiffusionXLPipeline.from_pretrained(
            config.MODEL_ID,
            torch_dtype=torch.float32,
            use_safetensors=True,
        )
        self.pipe.to(self.device)
        self.pipe.enable_attention_slicing()

        self.load_time_ms = int((time.time() - start) * 1000)
        self.model_loaded = True
        self._current_model_id = config.MODEL_ID
        self._original_scheduler_config = self.pipe.scheduler.config
        logger.info("Model loaded in %d ms", self.load_time_ms)

    def enable_lcm(self):
        """Enable LCM-LoRA for fast generation (4 steps)."""
        if self._lcm_enabled:
            return
        if not self.model_loaded:
            raise RuntimeError("Model not loaded. Call load_model() first.")
        logger.info("Enabling LCM-LoRA: %s", config.LCM_LORA_ID)
        start = time.time()
        self.pipe.scheduler = LCMScheduler.from_config(self._original_scheduler_config)
        self.pipe.load_lora_weights(config.LCM_LORA_ID)
        self._lcm_enabled = True
        logger.info("LCM-LoRA enabled in %d ms", int((time.time() - start) * 1000))

    def disable_lcm(self):
        """Disable LCM-LoRA, revert to normal scheduler."""
        if not self._lcm_enabled:
            return
        logger.info("Disabling LCM-LoRA")
        self.pipe.unload_lora_weights()
        self.pipe.scheduler = EulerDiscreteScheduler.from_config(self._original_scheduler_config)
        self._lcm_enabled = False

    @property
    def lcm_enabled(self) -> bool:
        return self._lcm_enabled

    def load_ip_adapter(self):
        """Load IP-Adapter for character reference image conditioning."""
        if self._ip_adapter_loaded:
            return
        if not self.model_loaded:
            raise RuntimeError("Model not loaded. Call load_model() first.")
        logger.info("Loading IP-Adapter for SDXL...")
        start = time.time()
        # Disable attention slicing before loading IP-Adapter (SlicedAttnProcessor conflicts)
        self.pipe.disable_attention_slicing()
        self._image_encoder = CLIPVisionModelWithProjection.from_pretrained(
            "h94/IP-Adapter",
            subfolder="sdxl_models/image_encoder",
            torch_dtype=torch.float32,
        ).to(self.device)
        self.pipe.load_ip_adapter(
            "h94/IP-Adapter",
            subfolder="sdxl_models",
            weight_name="ip-adapter_sdxl.bin",
            image_encoder=self._image_encoder,
        )
        self._ip_adapter_loaded = True
        logger.info("IP-Adapter loaded in %d ms", int((time.time() - start) * 1000))

    def generate(
        self,
        prompt: str,
        negative_prompt: str | None = None,
        width: int = config.DEFAULT_WIDTH,
        height: int = config.DEFAULT_HEIGHT,
        num_inference_steps: int = config.DEFAULT_STEPS,
        guidance_scale: float = config.DEFAULT_GUIDANCE_SCALE,
        seed: int | None = None,
        ip_adapter_images: list[Image.Image] | None = None,
        ip_adapter_scale: float = 0.4,
    ) -> tuple[Image.Image, int, int]:
        """Generate an image from a text prompt, optionally conditioned on reference images.

        Args:
            ip_adapter_images: Character reference images for style/identity consistency.
            ip_adapter_scale: Strength of IP-Adapter influence (0.0-1.0). Default 0.4.

        Returns:
            tuple of (PIL Image, seed used, generation time in ms)
        """
        if not self.model_loaded:
            raise RuntimeError("Model not loaded. Call load_model() first.")

        if seed is None:
            seed = random.randint(0, 2**32 - 1)

        if negative_prompt is None:
            negative_prompt = config.DEFAULT_NEGATIVE_PROMPT

        # Override steps & guidance for LCM mode
        if self._lcm_enabled:
            num_inference_steps = config.LCM_STEPS
            guidance_scale = config.LCM_GUIDANCE_SCALE

        # MPS requires CPU generator for reproducibility
        generator = torch.Generator(device="cpu").manual_seed(seed)

        # IP-Adapter: load on demand, unload when not needed
        extra_kwargs = {}
        if ip_adapter_images:
            self.load_ip_adapter()
            self.pipe.set_ip_adapter_scale(ip_adapter_scale)
            # Wrap in list: single IP-Adapter receives all images as one batch
            extra_kwargs["ip_adapter_image"] = [ip_adapter_images]
            logger.info("Using IP-Adapter with %d ref images, scale=%.2f", len(ip_adapter_images), ip_adapter_scale)
        elif self._ip_adapter_loaded:
            # Unload IP-Adapter to avoid requiring image_embeds when not using references
            logger.info("Unloading IP-Adapter (no reference images for this generation)")
            self.pipe.unload_ip_adapter()
            self._ip_adapter_loaded = False

        logger.info(
            "Generating: %dx%d, steps=%d, cfg=%.1f, seed=%d, lcm=%s",
            width, height, num_inference_steps, guidance_scale, seed, self._lcm_enabled,
        )

        # Reset progress tracking
        self._current_step = 0
        self._total_steps = num_inference_steps
        self._avg_step_time_ms = 0
        self._cancelled = False
        self._step_start_time = time.time()

        start = time.time()

        result = self.pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            width=width,
            height=height,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            generator=generator,
            callback_on_step_end=self._step_callback,
            **extra_kwargs,
        )
        image = result.images[0]

        gen_time_ms = int((time.time() - start) * 1000)
        logger.info("Generated in %d ms (seed=%d)", gen_time_ms, seed)

        return image, seed, gen_time_ms

    def generate_with_style(
        self,
        prompt: str,
        style: str = "cinematic_sketch",
        aspect_ratio: str = "16:9",
        seed: int | None = None,
        ip_adapter_images: list[Image.Image] | None = None,
        ip_adapter_scale: float = 0.4,
    ) -> tuple[Image.Image, int, int]:
        """Generate an image with a predefined style preset.

        Returns:
            tuple of (PIL Image, seed used, generation time in ms)
        """
        preset = config.STYLE_PRESETS.get(style, config.STYLE_PRESETS["cinematic_sketch"])
        full_prompt = preset["prefix"] + prompt + preset["suffix"]

        dims = config.ASPECT_RATIOS.get(aspect_ratio, config.ASPECT_RATIOS["16:9"])

        return self.generate(
            prompt=full_prompt,
            width=dims[0],
            height=dims[1],
            seed=seed,
            ip_adapter_images=ip_adapter_images,
            ip_adapter_scale=ip_adapter_scale,
        )


    def _swap_model(self, model_id: str):
        """Unload current model and load a different SDXL checkpoint."""
        if self._current_model_id == model_id:
            return
        logger.info("Swapping model: %s → %s", self._current_model_id, model_id)
        # Clean up current pipeline
        if self._ip_adapter_loaded:
            self.pipe.unload_ip_adapter()
            self._ip_adapter_loaded = False
        del self.pipe
        self.pipe = None
        self._image_encoder = None
        gc.collect()
        if self.device == "mps":
            torch.mps.empty_cache()

        start = time.time()
        self.pipe = StableDiffusionXLPipeline.from_pretrained(
            model_id,
            torch_dtype=torch.float32,
            use_safetensors=True,
        )
        self.pipe.to(self.device)
        self.pipe.enable_attention_slicing()
        self._current_model_id = model_id
        self._original_scheduler_config = self.pipe.scheduler.config
        self._lcm_enabled = False
        logger.info("Model %s loaded in %d ms", model_id, int((time.time() - start) * 1000))

    def generate_cinematic(
        self,
        prompt: str,
        aspect_ratio: str = "16:9",
        seed: int | None = None,
        denoising_strength: float = config.STYLE_TRANSFER_DENOISING,
    ) -> tuple[Image.Image, int, int]:
        """2-stage pipeline: photorealistic → anime style transfer.

        Stage 1: Generate photorealistic image with CyberRealistic XL.
        Stage 2: Style-transfer to anime with AnimagineXL img2img.

        Returns:
            tuple of (final PIL Image, seed used, total generation time in ms)
        """
        if seed is None:
            seed = random.randint(0, 2**32 - 1)

        dims = config.ASPECT_RATIOS.get(aspect_ratio, config.ASPECT_RATIOS["16:9"])
        total_start = time.time()

        # --- Stage 1: Photorealistic ---
        self._swap_model(config.PHOTOREALISTIC_MODEL_ID)
        generator = torch.Generator(device="cpu").manual_seed(seed)

        self._current_step = 0
        self._total_steps = config.DEFAULT_STEPS
        self._avg_step_time_ms = 0
        self._cancelled = False
        self._step_start_time = time.time()

        logger.info("Stage 1: Photorealistic generation %dx%d seed=%d", dims[0], dims[1], seed)
        photo_result = self.pipe(
            prompt=prompt,
            negative_prompt=config.PHOTOREALISTIC_NEGATIVE_PROMPT,
            width=dims[0],
            height=dims[1],
            num_inference_steps=config.DEFAULT_STEPS,
            guidance_scale=config.DEFAULT_GUIDANCE_SCALE,
            generator=generator,
            callback_on_step_end=self._step_callback,
        )
        photo_image = photo_result.images[0]
        logger.info("Stage 1 complete in %d ms", int((time.time() - self._step_start_time) * 1000))

        # --- Stage 2: Anime style transfer via img2img ---
        self._swap_model(config.MODEL_ID)

        preset = config.STYLE_PRESETS["cinematic_sketch"]
        style_prompt = preset["prefix"] + prompt + preset["suffix"]

        generator = torch.Generator(device="cpu").manual_seed(seed)

        # Build img2img pipeline from the txt2img pipeline components
        img2img_pipe = StableDiffusionXLImg2ImgPipeline(
            vae=self.pipe.vae,
            text_encoder=self.pipe.text_encoder,
            text_encoder_2=self.pipe.text_encoder_2,
            tokenizer=self.pipe.tokenizer,
            tokenizer_2=self.pipe.tokenizer_2,
            unet=self.pipe.unet,
            scheduler=self.pipe.scheduler,
        )

        self._current_step = 0
        self._total_steps = config.STYLE_TRANSFER_STEPS
        self._avg_step_time_ms = 0
        self._step_start_time = time.time()

        logger.info("Stage 2: Style transfer denoising=%.2f", denoising_strength)
        anime_result = img2img_pipe(
            prompt=style_prompt,
            negative_prompt=config.DEFAULT_NEGATIVE_PROMPT,
            image=photo_image,
            strength=denoising_strength,
            num_inference_steps=config.STYLE_TRANSFER_STEPS,
            guidance_scale=config.STYLE_TRANSFER_GUIDANCE,
            generator=generator,
            callback_on_step_end=self._step_callback,
        )
        final_image = anime_result.images[0]

        total_time_ms = int((time.time() - total_start) * 1000)
        logger.info("2-stage generation complete in %d ms (seed=%d)", total_time_ms, seed)

        return final_image, seed, total_time_ms


def image_to_base64(image: Image.Image, fmt: str = "PNG") -> str:
    """Convert PIL Image to base64 data URL string."""
    import base64

    buf = io.BytesIO()
    image.save(buf, format=fmt)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    mime = f"image/{fmt.lower()}"
    return f"data:{mime};base64,{b64}"
