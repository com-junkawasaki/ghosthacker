"""FastAPI service for local image generation using Diffusers on Apple Silicon."""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

import config
from generator import ImageGenerator, image_to_base64

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

gen = ImageGenerator()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading model on startup...")
    gen.load_model()
    yield
    logger.info("Shutting down.")


app = FastAPI(title="GhostHacker Image Gen", lifespan=lifespan)


# --- Request/Response models ---

class GenerateRequest(BaseModel):
    prompt: str
    negative_prompt: str | None = None
    width: int = config.DEFAULT_WIDTH
    height: int = config.DEFAULT_HEIGHT
    num_inference_steps: int = config.DEFAULT_STEPS
    guidance_scale: float = config.DEFAULT_GUIDANCE_SCALE
    seed: int | None = None


class GenerateResponse(BaseModel):
    image_base64: str
    seed: int
    generation_time_ms: int


class GeneratePanelRequest(BaseModel):
    prompt: str
    style: str = "cinematic_sketch"
    aspect_ratio: str = "16:9"
    seed: int | None = None
    output_path: str | None = None


class GeneratePanelResponse(BaseModel):
    image_base64: str
    seed: int
    generation_time_ms: int
    output_path: str | None = None


class HealthResponse(BaseModel):
    status: str
    model: str
    device: str
    model_loaded: bool
    load_time_ms: int


# --- Endpoints ---

@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="ok",
        model=config.MODEL_ID,
        device=gen.device,
        model_loaded=gen.model_loaded,
        load_time_ms=gen.load_time_ms,
    )


@app.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest):
    if not gen.model_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    image, seed, gen_time = gen.generate(
        prompt=req.prompt,
        negative_prompt=req.negative_prompt,
        width=req.width,
        height=req.height,
        num_inference_steps=req.num_inference_steps,
        guidance_scale=req.guidance_scale,
        seed=req.seed,
    )

    return GenerateResponse(
        image_base64=image_to_base64(image),
        seed=seed,
        generation_time_ms=gen_time,
    )


@app.post("/generate-panel", response_model=GeneratePanelResponse)
async def generate_panel(req: GeneratePanelRequest):
    """Generate a panel image with style presets, matching Go server's conventions."""
    if not gen.model_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    image, seed, gen_time = gen.generate_with_style(
        prompt=req.prompt,
        style=req.style,
        aspect_ratio=req.aspect_ratio,
        seed=req.seed,
    )

    # Save to disk if output_path specified
    saved_path = None
    if req.output_path:
        os.makedirs(os.path.dirname(req.output_path), exist_ok=True)
        image.save(req.output_path, "PNG")
        saved_path = req.output_path
        logger.info("Saved panel image to: %s", saved_path)

    return GeneratePanelResponse(
        image_base64=image_to_base64(image),
        seed=seed,
        generation_time_ms=gen_time,
        output_path=saved_path,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=config.HOST, port=config.PORT)
