import os
import uuid

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import Response

from app.config import MODELS, UPLOADS_DIR
from app.services import tts

router = APIRouter()


@router.post("/generate")
async def generate(
    mode: str = Form(...),
    text: str = Form(...),
    language: str = Form("Auto"),
    model_key: str = Form(...),
    speaker: str = Form(""),
    instruct: str = Form(""),
    ref_text: str = Form(""),
    ref_audio: UploadFile | None = File(None),
):
    model_info = MODELS.get(model_key)
    if not model_info:
        return Response(content="Invalid model", status_code=400)

    if mode == "custom_voice":
        if model_info["type"] != "custom_voice":
            return Response(content="Selected model does not support custom voice", status_code=400)
        wav_bytes = await tts.generate_custom_voice(
            model_key=model_key,
            text=text,
            language=language,
            speaker=speaker,
            instruct=instruct,
        )
    elif mode == "voice_clone":
        if model_info["type"] != "base":
            return Response(content="Selected model does not support voice cloning", status_code=400)
        if not ref_audio:
            return Response(content="Reference audio required for voice cloning", status_code=400)

        ref_path = UPLOADS_DIR / f"{uuid.uuid4().hex[:8]}_{ref_audio.filename}"
        content = await ref_audio.read()
        ref_path.write_bytes(content)

        try:
            wav_bytes = await tts.generate_voice_clone(
                model_key=model_key,
                text=text,
                language=language,
                ref_audio_path=str(ref_path),
                ref_text=ref_text,
            )
        finally:
            ref_path.unlink(missing_ok=True)

    elif mode == "voice_design":
        if model_info["type"] != "voice_design":
            return Response(content="Selected model does not support voice design", status_code=400)
        wav_bytes = await tts.generate_voice_design(
            model_key=model_key,
            text=text,
            language=language,
            instruct=instruct,
        )
    else:
        return Response(content=f"Unknown mode: {mode}", status_code=400)

    return Response(
        content=wav_bytes,
        media_type="audio/wav",
        headers={"Content-Disposition": "attachment; filename=chattyqwen_output.wav"},
    )


@router.get("/speakers")
async def get_speakers(model_key: str):
    if model_key not in MODELS:
        return {"speakers": []}
    model_info = MODELS[model_key]
    if model_info["type"] != "custom_voice":
        return {"speakers": []}
    speakers = await tts.get_speakers(model_key)
    return {"speakers": speakers}
