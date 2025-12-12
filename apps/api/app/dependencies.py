"""FastAPI dependencies for data access and authentication."""
import logging
from typing import Annotated

from fastapi import Depends

from .config import get_settings, Settings
from .database import is_db_available, get_db_optional
from .services import DataAccessLayer, MockService, DatabaseService
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# Singleton instances
_mock_service: MockService | None = None


async def get_dal(
    db: Annotated[AsyncSession | None, Depends(get_db_optional)]
) -> DataAccessLayer:
    """Get the data access layer.
    
    Returns DatabaseService if database is available and configured,
    otherwise falls back to MockService.
    """
    global _mock_service
    
    settings = get_settings()
    
    # 1. Force mock data if configured
    if settings.USE_MOCK_DATA:
        if _mock_service is None:
            _mock_service = MockService()
            logger.info("Using mock data (USE_MOCK_DATA=true)")
        return _mock_service
    
    # 2. Try database if available
    # We check is_db_available() to ensure connection is actually alive
    # db param will be None if factory is not configured
    if db and await is_db_available():
        logger.debug("Using DatabaseService")
        return DatabaseService(db)
    
    # 3. Fallback to mock
    if _mock_service is None:
        _mock_service = MockService()
        logger.warning("Database not available or not configured, using mock data")
    return _mock_service


# Type alias for dependency injection
DAL = Annotated[DataAccessLayer, Depends(get_dal)]
