"""Async SQLAlchemy database setup."""
import logging
from typing import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text

from .config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# Create async engine only if DATABASE_URL is set
engine = None
async_session_factory = None

if settings.DATABASE_URL:
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,  # Set to True for SQL debugging
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )
    async_session_factory = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


class Base(DeclarativeBase):
    """SQLAlchemy declarative base."""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get database session."""
    if async_session_factory is None:
        raise RuntimeError("Database not configured. Set DATABASE_URL environment variable.")
    
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_db_optional() -> AsyncGenerator[AsyncSession | None, None]:
    """Get database session if configured, else None (for fallback support)."""
    if async_session_factory is None:
        yield None
        return

    try:
        async with async_session_factory() as session:
            try:
                yield session
            finally:
                await session.close()
    except Exception as e:
        logger.error(f"Failed to create DB session: {e}")
        yield None


async def is_db_available() -> bool:
    """Check if database connection is available."""
    if engine is None:
        return False
    
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.warning(f"Database connection check failed: {e}")
        return False


@asynccontextmanager
async def get_db_context():
    """Context manager for database session (for use outside of FastAPI)."""
    if async_session_factory is None:
        raise RuntimeError("Database not configured")
    
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_all_tables():
    """Create all tables (for development/testing only)."""
    if engine is None:
        logger.warning("Cannot create tables: DATABASE_URL not set")
        return
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("All database tables created")


async def drop_all_tables():
    """Drop all tables (for development/testing only)."""
    if engine is None:
        return
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    logger.info("All database tables dropped")
