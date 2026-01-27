"""Seed the database from mock_data.json."""
import asyncio
import json
import os
from pathlib import Path

from sqlalchemy import select

from apps.api.app.database import get_db_context
from apps.api.app.models.user import User
from apps.api.app.services import DatabaseService


async def seed_from_mock() -> None:
    if os.getenv("SEED_FROM_MOCK", "false").lower() != "true":
        return

    mock_path = Path(__file__).parent.parent / "mock_data.json"
    if not mock_path.exists():
        return

    data = json.loads(mock_path.read_text())
    async with get_db_context() as session:
        try:
            existing = await session.execute(select(User.id).limit(1))
            if existing.first() is not None:
                return
        except Exception:
            return
        dal = DatabaseService(session)
        await dal.seed_data(data)


def main() -> None:
    asyncio.run(seed_from_mock())


if __name__ == "__main__":
    main()
