"""Pytest fixtures for API database integration tests."""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import AsyncIterator, Iterator

import pytest
import pytest_asyncio
from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine


def _api_root() -> Path:
    return Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session")
def test_database_url() -> str:
    return os.getenv("TEST_DATABASE_URL") or os.getenv("DATABASE_URL") or ""


@pytest.fixture(scope="session", autouse=True)
def migrated_db(test_database_url: str) -> Iterator[None]:
    if not test_database_url:
        pytest.skip("TEST_DATABASE_URL or DATABASE_URL is required to run DB integration tests.")

    api_root = _api_root()
    sys.path.insert(0, str(api_root))
    os.environ["DATABASE_URL"] = test_database_url

    config_path = api_root / "alembic.local.ini"
    config = Config(str(config_path))
    config.set_main_option("script_location", str(api_root / "alembic"))

    command.upgrade(config, "head")
    yield


@pytest_asyncio.fixture(scope="session")
async def engine(test_database_url: str) -> AsyncIterator[AsyncEngine]:
    if not test_database_url:
        pytest.skip("TEST_DATABASE_URL or DATABASE_URL is required to run DB integration tests.")

    engine = create_async_engine(test_database_url, echo=False, pool_pre_ping=True)
    try:
        yield engine
    finally:
        await engine.dispose()


@pytest_asyncio.fixture
async def db_session(engine: AsyncEngine) -> AsyncIterator[AsyncSession]:
    async with engine.begin() as conn:
        rows = await conn.execute(
            text(
                """
                SELECT tablename
                FROM pg_tables
                WHERE schemaname = 'public' AND tablename <> 'alembic_version'
                """
            )
        )
        table_names = [r[0] for r in rows.fetchall()]
        if table_names:
            await conn.execute(
                text(
                    "TRUNCATE TABLE "
                    + ", ".join(f'"{t}"' for t in table_names)
                    + " RESTART IDENTITY CASCADE"
                )
            )

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session

