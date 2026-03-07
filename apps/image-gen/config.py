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
    "low score, bad score, average score, signature, watermark, username, blurry, "
    "comic strip, manga page, multiple panels, split screen, collage, contact sheet, grid layout, "
    "speech bubble, dialogue balloon, japanese text, kana, kanji"
)

# Unified visual world style guide for Spirit in Physics.
CORE_VISUAL_STYLE = (
    "Amano Kozue inspired color and atmosphere, gentle luminous air, "
    "subtle emotional eyes, contemplative character acting, "
    "environment and character integrated into one coherent physical space, "
    "cinematic depth, clean composition, nuanced light and shadow, "
    "English graphic novel visual language (not manga page formatting). "
)

# Style presets matching Go server's image_generation.go
STYLE_PRESETS = {
    "cinematic_sketch": {
        "prefix": (
            CORE_VISUAL_STYLE +
            "Single-scene illustration, single panel, one moment, one composition, "
            "graphic novel panel rendering, clean linework, clear silhouettes, stable anatomy. "
        ),
        "suffix": (
            ". Crisp graphic novel render, soft shading, expressive eyes, high clarity, "
            "do not draw multiple frames or page layout, no text overlays."
        ),
    },
    "character_avatar": {
        "prefix": (
            CORE_VISUAL_STYLE +
            "Character headshot portrait, graphic novel character design, fine linework. "
        ),
        "suffix": (
            ". Sharp face focus, expressive eyes, clean background, high detail, no text."
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
