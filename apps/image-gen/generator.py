"""Diffusers pipeline manager for local image generation on Apple Silicon."""

import io
import logging
import random
import time

import torch
from diffusers import StableDiffusionXLPipeline
from PIL import Image

import config

logger = logging.getLogger(__name__)


class ImageGenerator:
    def __init__(self):
        self.pipe = None
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"
        self.model_loaded = False
        self.load_time_ms = 0

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
        logger.info("Model loaded in %d ms", self.load_time_ms)

    def generate(
        self,
        prompt: str,
        negative_prompt: str | None = None,
        width: int = config.DEFAULT_WIDTH,
        height: int = config.DEFAULT_HEIGHT,
        num_inference_steps: int = config.DEFAULT_STEPS,
        guidance_scale: float = config.DEFAULT_GUIDANCE_SCALE,
        seed: int | None = None,
    ) -> tuple[Image.Image, int, int]:
        """Generate an image from a text prompt.

        Returns:
            tuple of (PIL Image, seed used, generation time in ms)
        """
        if not self.model_loaded:
            raise RuntimeError("Model not loaded. Call load_model() first.")

        if seed is None:
            seed = random.randint(0, 2**32 - 1)

        if negative_prompt is None:
            negative_prompt = config.DEFAULT_NEGATIVE_PROMPT

        # MPS requires CPU generator for reproducibility
        generator = torch.Generator(device="cpu").manual_seed(seed)

        logger.info(
            "Generating: %dx%d, steps=%d, cfg=%.1f, seed=%d",
            width, height, num_inference_steps, guidance_scale, seed,
        )
        start = time.time()

        result = self.pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            width=width,
            height=height,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            generator=generator,
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
        )


def image_to_base64(image: Image.Image, fmt: str = "PNG") -> str:
    """Convert PIL Image to base64 data URL string."""
    import base64

    buf = io.BytesIO()
    image.save(buf, format=fmt)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    mime = f"image/{fmt.lower()}"
    return f"data:{mime};base64,{b64}"
