"""Configuration for the local image generation service."""

# Model settings
MODEL_ID = "cagliostrolab/animagine-xl-4.0"
VAE_ID = "madebyollin/sdxl-vae-fp16-fix"

# Default generation parameters
DEFAULT_WIDTH = 768
DEFAULT_HEIGHT = 768
DEFAULT_STEPS = 28
DEFAULT_GUIDANCE_SCALE = 7.0
DEFAULT_ENABLE_LCM = False
DEFAULT_NEGATIVE_PROMPT = (
    "lowres, bad anatomy, bad hands, text, error, missing finger, "
    "extra digits, fewer digits, cropped, worst quality, low quality, "
    "low score, bad score, average score, signature, watermark, username, blurry"
)

# Style presets matching Go server's image_generation.go
STYLE_PRESETS = {
    "cinematic_sketch": {
        "prefix": (
            "Amano Kozue inspired, ARIA-inspired, manga style, "
            "cinematic storyboard composition, clean manga line art, "
            "clear character silhouettes, consistent facial anatomy, "
            "focus on camera framing staging and body language, "
            "manga panel layout reference. "
        ),
        "suffix": (
            ". Detailed manga rendering, crisp clean lines, "
            "balanced shading with soft highlights, "
            "clear eyes and facial structure, stable proportions, "
            "Amano Kozue and ARIA mood, high visual clarity, "
            "cinematic composition."
        ),
    },
    "character_avatar": {
        "prefix": (
            "Professional character portrait, headshot, "
            "Amano Kozue inspired, ARIA-inspired, manga style, "
            "fine line art, clean background. "
        ),
        "suffix": (
            ". Sharp focus on face and expressive eyes, intricate iris detail, "
            "consistent facial features, clean white background, "
            "high resolution, 8k."
        ),
    },
}

# Aspect ratio presets (768px base)
ASPECT_RATIOS = {
    "16:9": (1216, 688),   # multiples of 8
    "9:16": (688, 1216),
    "1:1": (1024, 1024),
    "4:3": (1152, 864),
    "3:4": (864, 1152),
    "3:2": (1152, 768),
    "2:3": (768, 1152),
}

# LCM-LoRA acceleration settings
LCM_LORA_ID = "latent-consistency/lcm-lora-sdxl"
LCM_STEPS = 4
LCM_GUIDANCE_SCALE = 1.5

# Server settings
HOST = "0.0.0.0"
PORT = 8100
