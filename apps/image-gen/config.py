"""Configuration for the local image generation service."""

# Model settings
MODEL_ID = "cagliostrolab/animagine-xl-4.0"
VAE_ID = "madebyollin/sdxl-vae-fp16-fix"

# Default generation parameters
DEFAULT_WIDTH = 1024
DEFAULT_HEIGHT = 576  # 16:9 for cinematic panels
DEFAULT_STEPS = 28
DEFAULT_GUIDANCE_SCALE = 7.0
DEFAULT_NEGATIVE_PROMPT = (
    "low quality, worst quality, blurry, deformed, distorted, "
    "disfigured, bad anatomy, watermark, text, signature, "
    "extra fingers, mutated hands, poorly drawn face"
)

# Style presets matching Go server's image_generation.go
STYLE_PRESETS = {
    "cinematic_sketch": {
        "prefix": (
            "Cinematic storyboard thumbnail sketch, rough compositional guide "
            "for animators, gestural figures with simplified facial features, "
            "focus on camera framing staging and body language, "
            "manga panel layout reference. "
        ),
        "suffix": (
            ". Rough sketch aesthetic with loose confident linework, "
            "emphasis on lighting direction and silhouette shapes, "
            "atmospheric mood indicators, faces suggested through simple shapes "
            "rather than detailed features, director's visual notes style, "
            "monochrome with screen tones, cinematic composition."
        ),
    },
    "character_avatar": {
        "prefix": (
            "Professional character portrait, headshot, "
            "Mai Yoneyama illustrator style, High-End Webtoon Aesthetic, "
            "Fine Line Art, Modern Manga Style, clean background. "
        ),
        "suffix": (
            ". Sharp focus on face and expressive eyes, intricate iris detail, "
            "consistent facial features, clean white background, "
            "high resolution, 8k."
        ),
    },
}

# Aspect ratio presets
ASPECT_RATIOS = {
    "16:9": (1024, 576),
    "9:16": (576, 1024),
    "1:1": (1024, 1024),
    "4:3": (1024, 768),
    "3:4": (768, 1024),
    "3:2": (1024, 680),  # closest multiple of 8
    "2:3": (680, 1024),
}

# Server settings
HOST = "0.0.0.0"
PORT = 8100
