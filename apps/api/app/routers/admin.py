"""Admin API router - backup, restore, seeding."""
import json
import logging
import os
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse, unquote

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from starlette.background import BackgroundTask
from starlette.responses import FileResponse

from ..dependencies import DAL
from ..config import get_settings
from ..services import MockService, DatabaseService

router = APIRouter(prefix="/admin", tags=["admin"])
logger = logging.getLogger(__name__)


class SeedResponse(BaseModel):
    message: str
    counts: dict


def _unlink_safely(path: str) -> None:
    try:
        os.unlink(path)
    except FileNotFoundError:
        return
    except Exception:
        logger.exception("Failed to delete temp file: %s", path)


def _parse_database_url(raw_url: str) -> dict:
    # Example: postgresql+asyncpg://postgres:pass@postgres:5432/engsuite
    normalized = raw_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    parsed = urlparse(normalized)
    if parsed.scheme not in ("postgresql", "postgres"):
        raise ValueError(f"Unsupported database scheme: {parsed.scheme}")
    if not parsed.hostname or not parsed.path:
        raise ValueError("Invalid DATABASE_URL")

    return {
        "host": parsed.hostname,
        "port": str(parsed.port or 5432),
        "user": unquote(parsed.username or "postgres"),
        "password": unquote(parsed.password or ""),
        "database": parsed.path.lstrip("/"),
    }


@router.post("/seed-from-mock", response_model=SeedResponse)
async def seed_from_mock(dal: DAL):
    """Seed/reset data from mock_data.json.
    
    Compatible with both MockService (in-memory reset) and 
    DatabaseService (database reset & seed).
    """
    # 1. Handle MockService
    if isinstance(dal, MockService):
        dal._load_mock_data()
        counts = {key: len(value) for key, value in dal._data.items()}
        logger.info(f"Seeded mock data: {counts}")
        return SeedResponse(
            message="Successfully reloaded mock data",
            counts=counts
        )

    # 2. Handle DatabaseService
    if isinstance(dal, DatabaseService):
        mock_path = Path(__file__).parent.parent.parent / "mock_data.json"
        if not mock_path.exists():
             raise HTTPException(status_code=500, detail="Mock data file not found")
        
        with open(mock_path, "r") as f:
            data = json.load(f)
            
        try:
            counts = await dal.seed_data(data)
            logger.info(f"Seeded database: {counts}")
            return SeedResponse(
                message="Successfully seeded database from mock data",
                counts=counts
            )
        except Exception as e:
            logger.error(f"Seeding failed: {e}")
            raise HTTPException(status_code=500, detail=f"Seeding failed: {str(e)}")

    raise HTTPException(status_code=400, detail="Unsupported service type")


@router.get("/data-source")
async def get_data_source(dal: DAL):
    """Get the current data source being used."""
    source = "mock" if isinstance(dal, MockService) else "database"
    return {"source": source}


@router.get("/health")
async def health_check():
    """Health check endpoint for admin."""
    return {"status": "healthy"}


@router.get("/backup")
async def backup_database(dal: DAL):
    """Download a database backup.

    - MockService: returns a JSON export of in-memory data (ephemeral).
    - DatabaseService: returns a SQL dump via pg_dump (requires postgresql-client in the API image).
    """
    # Mock mode: export in-memory data as JSON (useful for dev)
    if isinstance(dal, MockService):
        payload = {
            "kind": "mock_export",
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "data": getattr(dal, "_data", {}),
        }
        return payload

    if not isinstance(dal, DatabaseService):
        raise HTTPException(status_code=400, detail="Unsupported service type")

    settings = get_settings()
    if not settings.DATABASE_URL:
        raise HTTPException(status_code=400, detail="DATABASE_URL not configured")

    try:
        conn = _parse_database_url(settings.DATABASE_URL)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%SZ")
    filename = f"engsuite_backup_{timestamp}.sql"
    tmp = tempfile.NamedTemporaryFile(prefix="engsuite_backup_", suffix=".sql", delete=False)
    tmp_path = tmp.name
    tmp.close()

    cmd = [
        "pg_dump",
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
        "-h",
        conn["host"],
        "-p",
        conn["port"],
        "-U",
        conn["user"],
        conn["database"],
    ]
    env = os.environ.copy()
    if conn["password"]:
        env["PGPASSWORD"] = conn["password"]

    try:
        with open(tmp_path, "wb") as out:
            result = subprocess.run(cmd, stdout=out, stderr=subprocess.PIPE, env=env, check=False)
    except FileNotFoundError:
        _unlink_safely(tmp_path)
        raise HTTPException(
            status_code=500,
            detail="pg_dump not found in API container. Install postgresql-client.",
        )
    except Exception as exc:
        _unlink_safely(tmp_path)
        raise HTTPException(status_code=500, detail=f"Backup failed: {exc}")

    if result.returncode != 0:
        stderr = result.stderr.decode("utf-8", errors="replace")
        _unlink_safely(tmp_path)
        raise HTTPException(status_code=500, detail=f"pg_dump failed: {stderr.strip()}")

    return FileResponse(
        tmp_path,
        media_type="application/sql",
        filename=filename,
        background=BackgroundTask(_unlink_safely, tmp_path),
    )


class RestoreResponse(BaseModel):
    message: str


@router.post("/restore", response_model=RestoreResponse)
async def restore_database(dal: DAL, file: UploadFile = File(...)):
    """Restore the database from a SQL dump (generated by /admin/backup).

    - MockService: accepts a JSON export and replaces in-memory data.
    - DatabaseService: runs psql to apply the dump (requires postgresql-client).
    """
    filename = file.filename or "backup"

    if isinstance(dal, MockService):
        try:
            payload = json.loads((await file.read()).decode("utf-8"))
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Invalid JSON backup: {exc}")
        if not isinstance(payload, dict) or "data" not in payload:
            raise HTTPException(status_code=400, detail="Invalid mock backup format")
        setattr(dal, "_data", payload["data"])
        return RestoreResponse(message=f"Mock data restored from {filename}")

    if not isinstance(dal, DatabaseService):
        raise HTTPException(status_code=400, detail="Unsupported service type")

    settings = get_settings()
    if not settings.DATABASE_URL:
        raise HTTPException(status_code=400, detail="DATABASE_URL not configured")

    try:
        conn = _parse_database_url(settings.DATABASE_URL)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if not filename.lower().endswith(".sql"):
        raise HTTPException(status_code=400, detail="Restore expects a .sql backup file")

    tmp = tempfile.NamedTemporaryFile(prefix="engsuite_restore_", suffix=".sql", delete=False)
    tmp_path = tmp.name
    try:
        content = await file.read()
        tmp.write(content)
        tmp.flush()
    finally:
        tmp.close()

    cmd = [
        "psql",
        "-h",
        conn["host"],
        "-p",
        conn["port"],
        "-U",
        conn["user"],
        "-d",
        conn["database"],
        "-v",
        "ON_ERROR_STOP=1",
        "-f",
        tmp_path,
    ]
    env = os.environ.copy()
    if conn["password"]:
        env["PGPASSWORD"] = conn["password"]

    try:
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env, check=False)
    except FileNotFoundError:
        _unlink_safely(tmp_path)
        raise HTTPException(
            status_code=500,
            detail="psql not found in API container. Install postgresql-client.",
        )
    except Exception as exc:
        _unlink_safely(tmp_path)
        raise HTTPException(status_code=500, detail=f"Restore failed: {exc}")
    finally:
        _unlink_safely(tmp_path)

    if result.returncode != 0:
        stderr = result.stderr.decode("utf-8", errors="replace")
        raise HTTPException(status_code=500, detail=f"psql failed: {stderr.strip()}")

    return RestoreResponse(message="Database restore completed")
