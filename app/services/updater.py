import asyncio
import logging
from pathlib import Path

from app.config import BASE_DIR

logger = logging.getLogger(__name__)


async def check_for_updates() -> dict:
    loop = asyncio.get_event_loop()

    async def _run(cmd: str) -> str:
        proc = await asyncio.create_subprocess_shell(
            cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(BASE_DIR),
        )
        stdout, stderr = await proc.communicate()
        return stdout.decode().strip()

    try:
        await _run("git fetch origin")

        local_ref = await _run("git rev-parse HEAD")
        remote_ref = await _run("git rev-parse @{u}")

        if not remote_ref or not local_ref:
            return {"up_to_date": True, "error": "Could not determine remote ref"}

        if local_ref == remote_ref:
            return {"up_to_date": True, "local": local_ref[:8], "remote": remote_ref[:8]}

        log = await _run(f"git log --oneline {local_ref}..{remote_ref}")
        commits = [l for l in log.split("\n") if l.strip()] if log else []

        return {
            "up_to_date": False,
            "local": local_ref[:8],
            "remote": remote_ref[:8],
            "commits_behind": len(commits),
            "commits": commits[:20],
        }
    except Exception as e:
        logger.error(f"Update check failed: {e}")
        return {"up_to_date": True, "error": str(e)}


async def apply_update() -> dict:
    try:
        proc = await asyncio.create_subprocess_shell(
            "git pull --recurse-submodules",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(BASE_DIR),
        )
        stdout, stderr = await proc.communicate()
        output = stdout.decode().strip()
        errors = stderr.decode().strip()

        if proc.returncode != 0:
            return {"success": False, "error": errors or output}

        return {"success": True, "output": output}
    except Exception as e:
        return {"success": False, "error": str(e)}
