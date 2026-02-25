@echo off
setlocal

cd /d "%~dp0"

if not exist .venv\Scripts\activate.bat (
    echo ERROR: .venv not found. Run install.bat first.
    pause
    exit /b 1
)

call .venv\Scripts\activate.bat

set HOST=%CHATTYQWEN_HOST%
if "%HOST%"=="" set HOST=0.0.0.0

set PORT=%CHATTYQWEN_PORT%
if "%PORT%"=="" set PORT=8000

echo.
echo Starting ChattyQwen on http://%HOST%:%PORT%
echo Press Ctrl+C to stop
echo.

uvicorn app.main:app --host %HOST% --port %PORT%
