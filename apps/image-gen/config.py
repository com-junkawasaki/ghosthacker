"""Configuration for the local image generation service."""

# Model settings
MODEL_ID = "cagliostrolab/animagine-xl-4.0"
PHOTOREALISTIC_MODEL_ID = "SG161222/RealVisXL_V4.0"
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
    "speech bubble, dialogue balloon, japanese text, kana, kanji, "
    "abstract, metallic, chrome, reflective surface, distorted, melting, "
    "surreal, cubism, geometric shapes, 3d render, CGI, plastic, "
    "chibi, super deformed, exaggerated proportions, overly cute, "
    "dark, horror, gore, grotesque, ugly face, deformed face"
)

# Unified visual world style guide for Spirit in Physics.
# Based on drawstyle.jsonld: 天野こずえ × 田村由美, quiet body language,
# precise eyes/gaze, organic future city, silence as storytelling.
CORE_VISUAL_STYLE = (
    "manga illustration, anime style, "
    "natural eyes, quiet gaze, subtle facial expression, "
    "soft luminous lighting, cinematic composition, "
)

# Style presets matching Go server's image_generation.go
STYLE_PRESETS = {
    "cinematic_sketch": {
        "prefix": (
            CORE_VISUAL_STYLE
        ),
        "suffix": (
            ", masterpiece, best quality, very aesthetic, absurdres, "
            "detailed face, soft shading, film grain"
        ),
    },
    "character_avatar": {
        "prefix": (
            "manga illustration, anime style, character portrait, "
            "natural face, quiet gaze, "
            "Amano Kozue soft atmosphere, clean background, "
            "upper body, looking at viewer, "
        ),
        "suffix": (
            ", masterpiece, best quality, very aesthetic, absurdres, "
            "sharp focus, soft lighting"
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

# Photorealistic negative prompt (for stage 1)
PHOTOREALISTIC_NEGATIVE_PROMPT = (
    "lowres, bad anatomy, bad hands, text, error, missing finger, "
    "extra digits, fewer digits, cropped, worst quality, low quality, "
    "signature, watermark, username, blurry, "
    "cartoon, anime, illustration, painting, drawing, "
    "deformed face, ugly face, disfigured"
)

# Style transfer settings (photorealistic → anime)
STYLE_TRANSFER_DENOISING = 0.65
STYLE_TRANSFER_STEPS = 28
STYLE_TRANSFER_GUIDANCE = 7.0

# LCM-LoRA acceleration settings
LCM_LORA_ID = "latent-consistency/lcm-lora-sdxl"
LCM_STEPS = 4
LCM_GUIDANCE_SCALE = 1.5

# Server settings
HOST = "0.0.0.0"
PORT = 8100
