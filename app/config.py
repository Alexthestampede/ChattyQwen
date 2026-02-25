import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Server
HOST = os.environ.get("CHATTYQWEN_HOST", "0.0.0.0")
PORT = int(os.environ.get("CHATTYQWEN_PORT", "8000"))

# Paths
UPLOADS_DIR = BASE_DIR / "uploads"
MODELS_DIR = BASE_DIR / "models"
UPLOADS_DIR.mkdir(exist_ok=True)
MODELS_DIR.mkdir(exist_ok=True)

# Model defaults
DEFAULT_MODEL_SIZE = os.environ.get("CHATTYQWEN_MODEL_SIZE", "1.7B")

# All available models
MODELS = {
    "custom_voice_1.7B": {
        "repo_id": "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
        "type": "custom_voice",
        "size": "1.7B",
        "label": "CustomVoice 1.7B",
        "supports_instruct": True,
    },
    "custom_voice_0.6B": {
        "repo_id": "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice",
        "type": "custom_voice",
        "size": "0.6B",
        "label": "CustomVoice 0.6B",
        "supports_instruct": False,
    },
    "voice_design_1.7B": {
        "repo_id": "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
        "type": "voice_design",
        "size": "1.7B",
        "label": "VoiceDesign 1.7B",
        "supports_instruct": True,
    },
    "base_1.7B": {
        "repo_id": "Qwen/Qwen3-TTS-12Hz-1.7B-Base",
        "type": "base",
        "size": "1.7B",
        "label": "VoiceClone 1.7B (Base)",
    },
    "base_0.6B": {
        "repo_id": "Qwen/Qwen3-TTS-12Hz-0.6B-Base",
        "type": "base",
        "size": "0.6B",
        "label": "VoiceClone 0.6B (Base)",
    },
}

TOKENIZER_REPO = "Qwen/Qwen3-TTS-Tokenizer-12Hz"

LANGUAGES = [
    "Auto", "Chinese", "English", "Japanese", "Korean",
    "French", "German", "Italian", "Portuguese", "Spanish", "Russian",
]
