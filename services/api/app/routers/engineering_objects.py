from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict

router = APIRouter(prefix="/engineering-objects", tags=["engineering-objects"])


class EngineeringObjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: Optional[str] = None
    tag: str
    object_type: str
    properties: Dict[str, Any]
    area_id: Optional[str] = None
    owner_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    location_ref: Optional[str] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class EngineeringObjectUpsert(BaseModel):
    object_type: str
    properties: Dict[str, Any]
    area_id: Optional[str] = None
    owner_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    location_ref: Optional[str] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None


class EngineeringObjectUpdate(BaseModel):
    tag: Optional[str] = None
    object_type: Optional[str] = None
    properties: Optional[Dict[str, Any]] = None
    area_id: Optional[str] = None
    owner_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    location_ref: Optional[str] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None


_fallback_store: Dict[str, Dict[str, Any]] = {}


def _is_active(properties: Dict[str, Any]) -> bool:
    if not isinstance(properties, dict):
        return True
    meta = properties.get("meta")
    if not isinstance(meta, dict):
        return True
    return meta.get("isActive", True) is not False


def _response_is_active(item: EngineeringObjectResponse) -> bool:
    return (item.is_active is not False) and _is_active(item.properties)


def _to_response(obj: Any) -> EngineeringObjectResponse:
    return EngineeringObjectResponse(
        id=str(getattr(obj, "uuid", "")) or None,
        tag=obj.tag,
        object_type=obj.object_type,
        properties=obj.properties or {},
        area_id=getattr(obj, "area_id", None),
        owner_id=getattr(obj, "owner_id", None),
        name=getattr(obj, "name", None),
        description=getattr(obj, "description", None),
        location_ref=getattr(obj, "location_ref", None),
        is_active=getattr(obj, "is_active", None),
        status=obj.status,
        created_at=getattr(obj, "created_at", None),
        updated_at=getattr(obj, "updated_at", None),
    )


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
                payload = [_to_response(obj) for obj in objects]
                if not include_inactive:
                    payload = [item for item in payload if _response_is_active(item)]
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
        payload = [item for item in payload if _response_is_active(item)]
    if query:
        payload = [item for item in payload if _matches_query(item, query)]
    return payload


@router.get("/by-id/{object_id}", response_model=EngineeringObjectResponse)
async def get_engineering_object_by_id(object_id: str) -> EngineeringObjectResponse:
    try:
        object_uuid = UUID(object_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid engineering object id") from exc

    try:
        from ..database import is_db_available, get_db_optional
        from ..models.engineering_object import EngineeringObject
        from sqlalchemy import select

        if await is_db_available():
            async for db in get_db_optional():
                if db is None:
                    continue
                result = await db.execute(
                    select(EngineeringObject).where(EngineeringObject.uuid == object_uuid)
                )
                obj = result.scalar_one_or_none()
                if obj is None:
                    raise HTTPException(
                        status_code=404, detail=f"Engineering object '{object_id}' not found"
                    )
                return _to_response(obj)
    except ImportError:
        pass

    for item in _fallback_store.values():
        if item.get("id") == object_id:
            return EngineeringObjectResponse(**item)

    raise HTTPException(status_code=404, detail=f"Engineering object '{object_id}' not found")


@router.put("/by-id/{object_id}", response_model=EngineeringObjectResponse)
async def update_engineering_object_by_id(
    object_id: str,
    payload: EngineeringObjectUpdate,
) -> EngineeringObjectResponse:
    try:
        object_uuid = UUID(object_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid engineering object id") from exc

    try:
        from ..database import is_db_available, get_db_optional
        from ..models.engineering_object import EngineeringObject
        from sqlalchemy import select

        if await is_db_available():
            async for db in get_db_optional():
                if db is None:
                    continue
                result = await db.execute(
                    select(EngineeringObject).where(EngineeringObject.uuid == object_uuid)
                )
                obj = result.scalar_one_or_none()
                if obj is None:
                    raise HTTPException(
                        status_code=404, detail=f"Engineering object '{object_id}' not found"
                    )

                if payload.tag is not None:
                    obj.tag = payload.tag.upper()
                if payload.object_type is not None:
                    obj.object_type = payload.object_type
                if payload.properties is not None:
                    obj.properties = payload.properties
                if payload.area_id is not None:
                    obj.area_id = payload.area_id
                if payload.owner_id is not None:
                    obj.owner_id = payload.owner_id
                if payload.name is not None:
                    obj.name = payload.name
                if payload.description is not None:
                    obj.description = payload.description
                if payload.location_ref is not None:
                    obj.location_ref = payload.location_ref
                if payload.is_active is not None:
                    obj.is_active = payload.is_active
                if payload.status is not None:
                    obj.status = payload.status

                await db.commit()
                await db.refresh(obj)
                return _to_response(obj)
    except ImportError:
        pass

    target = None
    for key, item in _fallback_store.items():
        if item.get("id") == object_id:
            target = key
            break

    if target is None:
        raise HTTPException(status_code=404, detail=f"Engineering object '{object_id}' not found")

    current = _fallback_store[target]
    updated_tag = payload.tag.upper() if payload.tag is not None else current["tag"]
    updated = {
        **current,
        "tag": updated_tag,
        "object_type": payload.object_type or current["object_type"],
        "properties": payload.properties if payload.properties is not None else current["properties"],
        "area_id": payload.area_id if payload.area_id is not None else current["area_id"],
        "owner_id": payload.owner_id if payload.owner_id is not None else current["owner_id"],
        "name": payload.name if payload.name is not None else current["name"],
        "description": payload.description if payload.description is not None else current["description"],
        "location_ref": (
            payload.location_ref if payload.location_ref is not None else current["location_ref"]
        ),
        "is_active": payload.is_active if payload.is_active is not None else current["is_active"],
        "status": payload.status if payload.status is not None else current["status"],
    }
    if updated_tag != current["tag"]:
        del _fallback_store[target]
    _fallback_store[updated_tag] = updated
    return EngineeringObjectResponse(**updated)


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
                return _to_response(obj)
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
                        area_id=payload.area_id,
                        owner_id=payload.owner_id,
                        name=payload.name,
                        description=payload.description,
                        location_ref=payload.location_ref,
                        is_active=payload.is_active if payload.is_active is not None else True,
                        status=payload.status,
                    )
                    db.add(obj)
                else:
                    obj.object_type = payload.object_type
                    obj.properties = payload.properties
                    obj.area_id = payload.area_id
                    obj.owner_id = payload.owner_id
                    obj.name = payload.name
                    obj.description = payload.description
                    obj.location_ref = payload.location_ref
                    if payload.is_active is not None:
                        obj.is_active = payload.is_active
                    obj.status = payload.status
                await db.commit()
                await db.refresh(obj)
                return _to_response(obj)
    except ImportError:
        pass

    _fallback_store[tag_upper] = {
        "id": None,
        "tag": tag_upper,
        "object_type": payload.object_type,
        "properties": payload.properties,
        "area_id": payload.area_id,
        "owner_id": payload.owner_id,
        "name": payload.name,
        "description": payload.description,
        "location_ref": payload.location_ref,
        "is_active": payload.is_active if payload.is_active is not None else True,
        "status": payload.status,
    }
    return EngineeringObjectResponse(**_fallback_store[tag_upper])
