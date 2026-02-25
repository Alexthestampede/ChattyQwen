#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "========================================="
echo "  ChattyQwen Installer"
echo "========================================="
echo ""

# --- Find Python 3.11+ ---
PYTHON=""
for candidate in python3.11 python3.12 python3.13 python311 python312 python3 python; do
    if command -v "$candidate" &>/dev/null; then
        ver=$("$candidate" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null || echo "0.0")
        major=$(echo "$ver" | cut -d. -f1)
        minor=$(echo "$ver" | cut -d. -f2)
        if [ "$major" -ge 3 ] && [ "$minor" -ge 11 ]; then
            PYTHON="$candidate"
            echo "Found Python $ver ($candidate)"
            break
        fi
    fi
done

if [ -z "$PYTHON" ]; then
    echo "ERROR: Python 3.11+ is required but not found."
    echo ""
    echo "Install Python 3.11+:"
    echo "  Ubuntu/Debian: sudo apt install python3.11 python3.11-venv"
    echo "  Fedora:        sudo dnf install python3.11"
    echo "  macOS:         brew install python@3.11"
    echo "  Arch:          sudo pacman -S python"
    exit 1
fi

# --- Create/verify venv ---
if [ -d ".venv" ]; then
    VENV_VER=$(".venv/bin/python" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null || echo "0.0")
    EXPECTED_VER=$("$PYTHON" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
    if [ "$VENV_VER" != "$EXPECTED_VER" ]; then
        echo "Venv Python ($VENV_VER) differs from system ($EXPECTED_VER), recreating..."
        rm -rf .venv
        "$PYTHON" -m venv .venv
    else
        echo "Existing venv OK (Python $VENV_VER)"
    fi
else
    echo "Creating virtual environment..."
    "$PYTHON" -m venv .venv
fi

source .venv/bin/activate
pip install --upgrade pip setuptools wheel

# --- Detect GPU and install PyTorch ---
echo ""
echo "Detecting GPU..."
IS_ROCM=0
IS_MACOS_ARM=0

if command -v nvidia-smi &>/dev/null; then
    echo "NVIDIA detected - installing PyTorch for CUDA"
    pip install torch torchaudio torchvision --index-url https://download.pytorch.org/whl/cu128
elif command -v rocm-smi &>/dev/null; then
    IS_ROCM=1
    echo "ROCm detected - installing PyTorch for ROCm"
    pip install torch torchaudio torchvision --index-url https://download.pytorch.org/whl/rocm6.3
elif [ "$(uname -s)" = "Darwin" ] && [ "$(uname -m)" = "arm64" ]; then
    IS_MACOS_ARM=1
    echo "Apple Silicon detected - installing PyTorch with MPS support"
    pip install torch torchaudio torchvision
else
    echo "No GPU detected - installing CPU PyTorch"
    pip install torch torchaudio torchvision --index-url https://download.pytorch.org/whl/cpu
fi

# --- Install app requirements ---
echo ""
echo "Installing dependencies..."
pip install -r "$ROOT/requirements.txt"

# --- Initialize submodule & install Qwen3-TTS ---
echo ""
echo "Initializing Qwen3-TTS submodule..."
git submodule update --init --recursive 2>/dev/null || true

if [ -d "$ROOT/Qwen3-TTS" ] && [ -f "$ROOT/Qwen3-TTS/pyproject.toml" ]; then
    echo "Installing Qwen3-TTS..."
    pip install -e "$ROOT/Qwen3-TTS"
else
    echo "ERROR: Qwen3-TTS submodule could not be initialized."
    echo "  Make sure you cloned with: git clone --recurse-submodules <url>"
    echo "  Or run manually: git submodule update --init --recursive"
    exit 1
fi

# --- Platform-specific cleanup ---
if [ "$IS_ROCM" -eq 1 ]; then
    echo ""
    echo "ROCm: removing flash-attn (not supported)..."
    pip uninstall -y flash-attn 2>/dev/null || true
fi

if [ "$IS_MACOS_ARM" -eq 1 ]; then
    echo ""
    echo "macOS ARM: removing flash-attn, installing mlx..."
    pip uninstall -y flash-attn 2>/dev/null || true
    pip install "mlx>=0.25.2" "mlx-lm>=0.20.0,<0.30.6"
fi

# --- Install flash-attn for NVIDIA ---
if command -v nvidia-smi &>/dev/null; then
    echo ""
    echo "Installing flash-attn for NVIDIA..."
    pip install flash-attn --no-build-isolation 2>/dev/null || {
        echo "WARNING: flash-attn install failed. TTS will still work but may use more VRAM."
    }
fi

# --- Create data directories ---
mkdir -p "$ROOT/uploads"
mkdir -p "$ROOT/models"

echo ""
echo "========================================="
echo "  Installation complete!"
echo "========================================="
echo ""
echo "Start the server with: ./run.sh"
echo "Then open: http://localhost:8000"
