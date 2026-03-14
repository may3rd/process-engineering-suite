"""Async SQLAlchemy database setup."""
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import get_settings

logger = logging.getLogger(__name__)

engine = None
async_session_factory = None
_engine_url: str | None = None


def _configure_engine() -> None:
    global engine, async_session_factory, _engine_url

    database_url = get_settings().DATABASE_URL
    if database_url == _engine_url:
        return

    _engine_url = database_url
    if not database_url:
        engine = None
        async_session_factory = None
        return

    engine = create_async_engine(
        database_url,
        echo=False,
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
    _configure_engine()
    if async_session_factory is None:
        raise RuntimeError("Database not configured. Set DATABASE_URL environment variable.")
    
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_db_optional() -> AsyncGenerator[AsyncSession | None, None]:
    """Get database session if configured, else None (for fallback support)."""
    _configure_engine()
    if async_session_factory is None:
        yield None
        return

    # Try to create a session
    try:
        session = async_session_factory()
    except Exception as e:
        logger.error(f"Failed to create DB session: {e}")
        yield None
        return

    # Use the session
    try:
        async with session:
            yield session
    finally:
        await session.close()


async def is_db_available() -> bool:
    """Check if database connection is available."""
    _configure_engine()
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
    _configure_engine()
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
    _configure_engine()
    if engine is None:
        logger.warning("Cannot create tables: DATABASE_URL not set")
        return
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("All database tables created")


async def drop_all_tables():
    """Drop all tables (for development/testing only)."""
    _configure_engine()
    if engine is None:
        return
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    logger.info("All database tables dropped")
