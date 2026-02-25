@echo off
setlocal enabledelayedexpansion

echo =========================================
echo   ChattyQwen Installer (Windows)
echo =========================================
echo.

:: Check Python
where python >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Install Python 3.11+ from python.org
    pause
    exit /b 1
)

:: Check version
for /f "tokens=*" %%v in ('python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"') do set PYVER=%%v
echo Found Python %PYVER%

:: Create venv
if not exist .venv (
    echo Creating virtual environment...
    python -m venv .venv
)

:: Activate
call .venv\Scripts\activate.bat

:: Upgrade pip
pip install --upgrade pip setuptools wheel

:: Detect GPU - check for nvidia-smi
where nvidia-smi >nul 2>&1
if not errorlevel 1 (
    echo NVIDIA detected - installing PyTorch for CUDA
    pip install torch torchaudio torchvision --index-url https://download.pytorch.org/whl/cu128
    echo Installing flash-attn...
    pip install flash-attn --no-build-isolation 2>nul || echo WARNING: flash-attn failed. TTS will still work.
) else (
    echo No NVIDIA GPU detected - installing CPU PyTorch
    pip install torch torchaudio torchvision --index-url https://download.pytorch.org/whl/cpu
)

:: Install requirements
echo.
echo Installing dependencies...
pip install -r requirements.txt

:: Install Qwen3-TTS
echo.
echo Installing Qwen3-TTS...
if exist Qwen3-TTS\pyproject.toml (
    pip install -e Qwen3-TTS
) else (
    echo WARNING: Qwen3-TTS submodule not found.
    echo   Run: git submodule update --init --recursive
)

:: Create dirs
if not exist uploads mkdir uploads
if not exist models mkdir models

echo.
echo =========================================
echo   Installation complete!
echo =========================================
echo.
echo Start the server with: run.bat
echo Then open: http://localhost:8000
pause
