from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict

router = APIRouter(prefix="/engineering-objects", tags=["engineering-objects"])


class EngineeringObjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: Optional[str] = None
    tag: str
    object_type: str
    properties: Dict[str, Any]
    status: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class EngineeringObjectUpsert(BaseModel):
    object_type: str
    properties: Dict[str, Any]
    status: Optional[str] = None


_fallback_store: Dict[str, Dict[str, Any]] = {}


def _is_active(properties: Dict[str, Any]) -> bool:
    if not isinstance(properties, dict):
        return True
    meta = properties.get("meta")
    if not isinstance(meta, dict):
        return True
    return meta.get("isActive", True) is not False


def _matches_query(item: EngineeringObjectResponse, query: str) -> bool:
    if not query:
        return True

    props = item.properties if isinstance(item.properties, dict) else {}
    meta = props.get("meta") if isinstance(props.get("meta"), dict) else {}
    inputs = props.get("inputs") if isinstance(props.get("inputs"), dict) else {}

    values = [
        item.tag,
        item.object_type,
        str(meta.get("name", "")),
        str(meta.get("description", "")),
        str(inputs.get("tag", "")),
        str(inputs.get("description", "")),
    ]

    haystack = " ".join(values).upper()
    return query in haystack


@router.get("", response_model=List[EngineeringObjectResponse])
async def list_engineering_objects(
    object_type: Optional[str] = Query(default=None),
    include_inactive: bool = Query(default=False),
    q: Optional[str] = Query(default=None),
) -> List[EngineeringObjectResponse]:
    query = q.strip().upper() if isinstance(q, str) and q.strip() else ""

    try:
        from ..database import is_db_available, get_db_optional
        from ..models.engineering_object import EngineeringObject
        from sqlalchemy import select

        if await is_db_available():
            async for db in get_db_optional():
                if db is None:
                    continue
                stmt = select(EngineeringObject)
                if object_type:
                    stmt = stmt.where(EngineeringObject.object_type == object_type)
                stmt = stmt.order_by(EngineeringObject.updated_at.desc())
                result = await db.execute(stmt)
                objects = result.scalars().all()
                payload = [
                    EngineeringObjectResponse(
                        id=str(getattr(obj, "uuid", "")) or None,
                        tag=obj.tag,
                        object_type=obj.object_type,
                        properties=obj.properties or {},
                        status=obj.status,
                        created_at=getattr(obj, "created_at", None),
                        updated_at=getattr(obj, "updated_at", None),
                    )
                    for obj in objects
                ]
                if not include_inactive:
                    payload = [item for item in payload if _is_active(item.properties)]
                if query:
                    payload = [item for item in payload if _matches_query(item, query)]
                return payload
    except ImportError:
        pass

    items = list(_fallback_store.values())
    payload = [EngineeringObjectResponse(**item) for item in items]
    if object_type:
        payload = [item for item in payload if item.object_type == object_type]
    if not include_inactive:
        payload = [item for item in payload if _is_active(item.properties)]
    if query:
        payload = [item for item in payload if _matches_query(item, query)]
    return payload


@router.get("/{tag}", response_model=EngineeringObjectResponse)
async def get_engineering_object(tag: str) -> EngineeringObjectResponse:
    tag_upper = tag.upper()

    try:
        from ..database import is_db_available, get_db_optional
        from ..models.engineering_object import EngineeringObject
        from sqlalchemy import select

        if await is_db_available():
            async for db in get_db_optional():
                if db is None:
                    continue
                result = await db.execute(
                    select(EngineeringObject).where(EngineeringObject.tag == tag_upper)
                )
                obj = result.scalar_one_or_none()
                if obj is None:
                    raise HTTPException(status_code=404, detail=f"Engineering object '{tag}' not found")
                return EngineeringObjectResponse(
                    id=str(getattr(obj, "uuid", "")) or None,
                    tag=obj.tag,
                    object_type=obj.object_type,
                    properties=obj.properties or {},
                    status=obj.status,
                    created_at=getattr(obj, "created_at", None),
                    updated_at=getattr(obj, "updated_at", None),
                )
    except ImportError:
        pass

    entry = _fallback_store.get(tag_upper)
    if entry is None:
        raise HTTPException(status_code=404, detail=f"Engineering object '{tag}' not found")
    return EngineeringObjectResponse(**entry)


@router.put("/{tag}", response_model=EngineeringObjectResponse)
async def upsert_engineering_object(
    tag: str,
    payload: EngineeringObjectUpsert,
) -> EngineeringObjectResponse:
    tag_upper = tag.upper()

    try:
        from ..database import is_db_available, get_db_optional
        from ..models.engineering_object import EngineeringObject
        from sqlalchemy import select

        if await is_db_available():
            async for db in get_db_optional():
                if db is None:
                    continue
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
                    id=str(getattr(obj, "uuid", "")) or None,
                    tag=obj.tag,
                    object_type=obj.object_type,
                    properties=obj.properties or {},
                    status=obj.status,
                    created_at=getattr(obj, "created_at", None),
                    updated_at=getattr(obj, "updated_at", None),
                )
    except ImportError:
        pass

    _fallback_store[tag_upper] = {
        "id": None,
        "tag": tag_upper,
        "object_type": payload.object_type,
        "properties": payload.properties,
        "status": payload.status,
    }
    return EngineeringObjectResponse(**_fallback_store[tag_upper])
