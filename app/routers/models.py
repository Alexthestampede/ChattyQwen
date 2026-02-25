import asyncio

from fastapi import APIRouter

from app.config import MODELS
from app.services import tts

router = APIRouter()


@router.get("")
async def list_models():
    loaded = await tts.get_loaded_model_key()
    result = []
    for key, info in MODELS.items():
        result.append({
            "key": key,
            "repo_id": info["repo_id"],
            "type": info["type"],
            "size": info["size"],
            "label": info["label"],
            "loaded": key == loaded,
        })
    return {"models": result, "loaded": loaded}


@router.post("/select")
async def select_model(body: dict):
    model_key = body.get("model_key", "")
    if model_key not in MODELS:
        return {"error": f"Unknown model: {model_key}"}

    # Preload model in background
    loop = asyncio.get_event_loop()

    async def _preload():
        from app.services.tts import _load_model, _lock
        async with _lock:
            await loop.run_in_executor(None, _load_model, model_key)

    asyncio.create_task(_preload())
    return {"status": "loading", "model_key": model_key}


@router.post("/unload")
async def unload_model():
    await tts.unload_model()
    return {"status": "unloaded"}


@router.post("/download")
async def download_model(body: dict):
    model_key = body.get("model_key", "")
    if model_key not in MODELS:
        return {"error": f"Unknown model: {model_key}"}

    repo_id = MODELS[model_key]["repo_id"]

    async def _download():
        from huggingface_hub import snapshot_download
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, lambda: snapshot_download(repo_id))

    asyncio.create_task(_download())
    return {"status": "downloading", "repo_id": repo_id}
