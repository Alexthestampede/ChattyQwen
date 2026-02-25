from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.routers import tts, models, settings

STATIC_DIR = Path(__file__).parent / "static"

app = FastAPI(title="ChattyQwen")

app.include_router(tts.router, prefix="/api/tts", tags=["tts"])
app.include_router(models.router, prefix="/api/models", tags=["models"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
async def index():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/settings")
async def settings_page():
    return FileResponse(STATIC_DIR / "settings.html")


@app.get("/manifest.json")
async def manifest():
    return FileResponse(STATIC_DIR / "manifest.json")


@app.get("/sw.js")
async def service_worker():
    return FileResponse(STATIC_DIR / "sw.js", media_type="application/javascript")
