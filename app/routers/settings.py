import platform

import torch
from fastapi import APIRouter

from app.config import MODELS, LANGUAGES
from app.services import updater

router = APIRouter()


def _detect_device_info() -> dict:
    info = {
        "platform": platform.system(),
        "arch": platform.machine(),
        "python": platform.python_version(),
        "torch": torch.__version__,
        "device": "cpu",
        "device_name": "CPU",
    }

    if torch.cuda.is_available():
        info["device"] = "cuda"
        info["device_name"] = torch.cuda.get_device_name(0)
        info["vram_gb"] = round(torch.cuda.get_device_properties(0).total_mem / 1e9, 1)
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        info["device"] = "mps"
        info["device_name"] = "Apple Silicon (MPS)"

    return info


@router.get("")
async def get_settings():
    return {
        "device": _detect_device_info(),
        "languages": LANGUAGES,
        "models": {k: v["label"] for k, v in MODELS.items()},
    }


@router.get("/updates/check")
async def check_updates():
    return await updater.check_for_updates()


@router.post("/updates/apply")
async def apply_updates():
    return await updater.apply_update()
