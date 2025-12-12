"""Admin API router - backup, restore, seeding."""
import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from ..dependencies import DAL
from ..services import MockService, DatabaseService

router = APIRouter(prefix="/admin", tags=["admin"])
logger = logging.getLogger(__name__)


class SeedResponse(BaseModel):
    message: str
    counts: dict


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
