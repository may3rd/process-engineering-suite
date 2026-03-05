"""Engineering objects CRUD endpoints.

Provides GET and PUT (upsert) for EngineeringObject records keyed by tag.
Used by apps (e.g., apps/vessel) to push/pull calculation results linked to
a specific equipment tag.
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict

router = APIRouter(prefix="/engineering-objects", tags=["engineering-objects"])


# ─── Pydantic schemas ─────────────────────────────────────────────────────────

class EngineeringObjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    tag: str
    object_type: str
    properties: Dict[str, Any]
    status: Optional[str] = None


class EngineeringObjectUpsert(BaseModel):
    """Payload for creating or updating an engineering object."""
    object_type: str
    properties: Dict[str, Any]
    status: Optional[str] = None


# ─── In-memory fallback store ─────────────────────────────────────────────────
# When a database is not available the router uses an in-process dict so that
# the vessel app can still push/pull during local development without postgres.
_fallback_store: Dict[str, Dict[str, Any]] = {}


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.get("/{tag}", response_model=EngineeringObjectResponse)
async def get_engineering_object(tag: str) -> EngineeringObjectResponse:
    """Fetch an engineering object by tag. Returns 404 if not found."""
    tag_upper = tag.upper()

    # Try database first (import here to avoid hard failure when DB is not configured)
    try:
        from ..database import is_db_available, get_db_optional
        from ..models.engineering_object import EngineeringObject
        from sqlalchemy import select
        from sqlalchemy.ext.asyncio import AsyncSession

        if is_db_available():
            async for db in get_db_optional():
                if db is not None:
                    result = await db.execute(
                        select(EngineeringObject).where(EngineeringObject.tag == tag_upper)
                    )
                    obj = result.scalar_one_or_none()
                    if obj is None:
                        raise HTTPException(status_code=404, detail=f"Engineering object '{tag}' not found")
                    return EngineeringObjectResponse(
                        tag=obj.tag,
                        object_type=obj.object_type,
                        properties=obj.properties or {},
                        status=obj.status,
                    )
    except ImportError:
        pass

    # Fallback to in-memory store
    entry = _fallback_store.get(tag_upper)
    if entry is None:
        raise HTTPException(status_code=404, detail=f"Engineering object '{tag}' not found")
    return EngineeringObjectResponse(**entry)


@router.put("/{tag}", response_model=EngineeringObjectResponse)
async def upsert_engineering_object(
    tag: str,
    payload: EngineeringObjectUpsert,
) -> EngineeringObjectResponse:
    """Create or update an engineering object by tag (upsert)."""
    tag_upper = tag.upper()

    # Try database first
    try:
        from ..database import is_db_available, get_db_optional
        from ..models.engineering_object import EngineeringObject
        from sqlalchemy import select

        if is_db_available():
            async for db in get_db_optional():
                if db is not None:
                    result = await db.execute(
                        select(EngineeringObject).where(EngineeringObject.tag == tag_upper)
                    )
                    obj = result.scalar_one_or_none()
                    if obj is None:
                        obj = EngineeringObject(
                            tag=tag_upper,
                            object_type=payload.object_type,
                            properties=payload.properties,
                            status=payload.status,
                        )
                        db.add(obj)
                    else:
                        obj.object_type = payload.object_type
                        obj.properties = payload.properties
                        obj.status = payload.status
                    await db.commit()
                    await db.refresh(obj)
                    return EngineeringObjectResponse(
                        tag=obj.tag,
                        object_type=obj.object_type,
                        properties=obj.properties or {},
                        status=obj.status,
                    )
    except ImportError:
        pass

    # Fallback to in-memory store
    _fallback_store[tag_upper] = {
        "tag": tag_upper,
        "object_type": payload.object_type,
        "properties": payload.properties,
        "status": payload.status,
    }
    return EngineeringObjectResponse(**_fallback_store[tag_upper])
