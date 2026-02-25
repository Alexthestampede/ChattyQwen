#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# --- Activate venv ---
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
else
    echo "ERROR: .venv not found. Run ./install.sh first."
    exit 1
fi

# --- Platform-specific env vars ---
if ! command -v nvidia-smi &>/dev/null && command -v rocm-smi &>/dev/null; then
    echo "ROCm detected - configuring environment..."

    GFX_TARGET=$(rocminfo 2>/dev/null | grep -oP 'gfx\d+' | head -1 || echo "")
    if [ -n "$GFX_TARGET" ]; then
        case "$GFX_TARGET" in
            gfx1100) HSA_VER="11.0.0" ;;
            gfx1101) HSA_VER="11.0.0" ;;
            gfx1102) HSA_VER="11.0.0" ;;
            gfx1030) HSA_VER="10.3.0" ;;
            gfx1031) HSA_VER="10.3.0" ;;
            gfx900)  HSA_VER="9.0.0"  ;;
            gfx906)  HSA_VER="9.0.6"  ;;
            gfx908)  HSA_VER="9.0.8"  ;;
            gfx90a)  HSA_VER="9.0.10" ;;
            gfx942)  HSA_VER="9.4.2"  ;;
            gfx1150) HSA_VER="11.5.0" ;;
            gfx1151) HSA_VER="11.5.0" ;;
            gfx1200) HSA_VER="12.0.0" ;;
            gfx1201) HSA_VER="12.0.0" ;;
            *)       HSA_VER="" ;;
        esac

        if [ -n "$HSA_VER" ]; then
            export HSA_OVERRIDE_GFX_VERSION="$HSA_VER"
            echo "  HSA_OVERRIDE_GFX_VERSION=$HSA_VER (for $GFX_TARGET)"
        else
            echo "  WARNING: Unknown GFX target $GFX_TARGET - HSA_OVERRIDE_GFX_VERSION not set"
        fi
    fi

    export MIOPEN_FIND_MODE=FAST
    export TOKENIZERS_PARALLELISM=false
    echo "  MIOPEN_FIND_MODE=FAST"
fi

# --- macOS MPS ---
if [ "$(uname -s)" = "Darwin" ] && [ "$(uname -m)" = "arm64" ]; then
    echo "Apple Silicon detected - MPS backend enabled"
    export PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.0
fi

# --- Launch server ---
HOST="${CHATTYQWEN_HOST:-0.0.0.0}"
PORT="${CHATTYQWEN_PORT:-8000}"

echo ""
echo "Starting ChattyQwen on http://${HOST}:${PORT}"
echo "Press Ctrl+C to stop"
echo ""

exec uvicorn app.main:app --host "$HOST" --port "$PORT"
