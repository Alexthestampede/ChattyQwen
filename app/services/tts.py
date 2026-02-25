import asyncio
import io
import logging
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
import torch

from app.config import MODELS, UPLOADS_DIR

logger = logging.getLogger(__name__)

_model = None
_model_key = None
_lock = asyncio.Lock()


def _detect_device():
    if torch.cuda.is_available():
        return "cuda:0"
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def _detect_dtype(device: str):
    if device.startswith("cuda"):
        return torch.bfloat16
    return torch.float32


def _detect_attn(device: str):
    if device.startswith("cuda"):
        try:
            import flash_attn  # noqa: F401
            return "flash_attention_2"
        except ImportError:
            pass
    return "sdpa"


def _offload_model():
    global _model, _model_key
    if _model is not None:
        try:
            _model.to("cpu")
        except Exception:
            pass
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    _model = None
    _model_key = None


def _load_model(model_key: str):
    global _model, _model_key
    from qwen_tts import Qwen3TTSModel

    if _model_key == model_key and _model is not None:
        return _model

    _offload_model()

    model_info = MODELS[model_key]
    device = _detect_device()
    dtype = _detect_dtype(device)
    attn = _detect_attn(device)

    logger.info(f"Loading model {model_info['repo_id']} on {device} ({dtype}, {attn})")

    _model = Qwen3TTSModel.from_pretrained(
        model_info["repo_id"],
        device_map=device,
        dtype=dtype,
        attn_implementation=attn,
    )
    _model_key = model_key
    return _model


async def get_loaded_model_key():
    return _model_key


async def get_speakers(model_key: str):
    async with _lock:
        model = await asyncio.get_event_loop().run_in_executor(None, _load_model, model_key)
        try:
            speakers = model.get_supported_speakers()
            return sorted(speakers)
        except Exception:
            return []


async def generate_custom_voice(
    model_key: str,
    text: str,
    language: str = "Auto",
    speaker: str = "Vivian",
    instruct: str = "",
) -> bytes:
    async with _lock:
        loop = asyncio.get_event_loop()
        model = await loop.run_in_executor(None, _load_model, model_key)

        def _generate():
            kwargs = {
                "text": text,
                "language": language,
                "speaker": speaker,
            }
            if instruct:
                kwargs["instruct"] = instruct
            wavs, sr = model.generate_custom_voice(**kwargs)
            buf = io.BytesIO()
            sf.write(buf, wavs[0], sr, format="WAV")
            buf.seek(0)
            return buf.read()

        return await loop.run_in_executor(None, _generate)


async def generate_voice_clone(
    model_key: str,
    text: str,
    language: str = "Auto",
    ref_audio_path: str = "",
    ref_text: str = "",
) -> bytes:
    async with _lock:
        loop = asyncio.get_event_loop()
        model = await loop.run_in_executor(None, _load_model, model_key)

        def _generate():
            wavs, sr = model.generate_voice_clone(
                text=text,
                language=language,
                ref_audio=ref_audio_path,
                ref_text=ref_text,
                x_vector_only_mode=not bool(ref_text),
            )
            buf = io.BytesIO()
            sf.write(buf, wavs[0], sr, format="WAV")
            buf.seek(0)
            return buf.read()

        return await loop.run_in_executor(None, _generate)


async def generate_voice_design(
    model_key: str,
    text: str,
    language: str = "Auto",
    instruct: str = "",
) -> bytes:
    async with _lock:
        loop = asyncio.get_event_loop()
        model = await loop.run_in_executor(None, _load_model, model_key)

        def _generate():
            wavs, sr = model.generate_voice_design(
                text=text,
                language=language,
                instruct=instruct,
            )
            buf = io.BytesIO()
            sf.write(buf, wavs[0], sr, format="WAV")
            buf.seek(0)
            return buf.read()

        return await loop.run_in_executor(None, _generate)


async def unload_model():
    async with _lock:
        await asyncio.get_event_loop().run_in_executor(None, _offload_model)
