"""Audit Log API router."""
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from ..dependencies import DAL

router = APIRouter(prefix="/audit-logs", tags=["audit"])


# --- Pydantic Schemas ---

class AuditFieldChange(BaseModel):
    """Single field change."""
    field: str
    oldValue: Optional[str] = None
    newValue: Optional[str] = None


class AuditLogResponse(BaseModel):
    """Response schema for audit logs."""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: str
    action: str
    entity_type: str = Field(serialization_alias="entityType")
    entity_id: str = Field(serialization_alias="entityId")
    entity_name: str = Field(serialization_alias="entityName")
    user_id: str = Field(serialization_alias="userId")
    user_name: str = Field(serialization_alias="userName")
    user_role: Optional[str] = Field(default=None, serialization_alias="userRole")
    changes: Optional[List[dict]] = None
    description: Optional[str] = None
    project_id: Optional[str] = Field(default=None, serialization_alias="projectId")
    project_name: Optional[str] = Field(default=None, serialization_alias="projectName")
    created_at: datetime = Field(serialization_alias="createdAt")


class AuditLogCreate(BaseModel):
    """Create schema for audit logs."""
    model_config = ConfigDict(extra='ignore')
    action: str
    entityType: str
    entityId: str
    entityName: str
    userId: str
    userName: str
    userRole: Optional[str] = None
    changes: Optional[List[dict]] = None
    description: Optional[str] = None
    projectId: Optional[str] = None
    projectName: Optional[str] = None


class AuditLogListResponse(BaseModel):
    """Paginated list response."""
    items: List[AuditLogResponse]
    total: int
    limit: int
    offset: int


# --- Endpoints ---

@router.get("", response_model=AuditLogListResponse)
async def get_audit_logs(
    dal: DAL,
    entity_type: Optional[str] = Query(None, alias="entityType"),
    entity_id: Optional[str] = Query(None, alias="entityId"),
    user_id: Optional[str] = Query(None, alias="userId"),
    project_id: Optional[str] = Query(None, alias="projectId"),
    action: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """Get audit logs with optional filters."""
    filters = {}
    if entity_type:
        filters["entity_type"] = entity_type
    if entity_id:
        filters["entity_id"] = entity_id
    if user_id:
        filters["user_id"] = user_id
    if project_id:
        filters["project_id"] = project_id
    if action:
        filters["action"] = action
    
    logs, total = await dal.get_audit_logs(filters, limit, offset)
    return AuditLogListResponse(items=logs, total=total, limit=limit, offset=offset)


@router.get("/{log_id}", response_model=AuditLogResponse)
async def get_audit_log(log_id: str, dal: DAL):
    """Get a single audit log by ID."""
    log = await dal.get_audit_log_by_id(log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Audit log not found")
    return log


@router.post("", response_model=AuditLogResponse, status_code=201)
async def create_audit_log(data: AuditLogCreate, dal: DAL):
    """Create a new audit log entry."""
    return await dal.create_audit_log(data.model_dump())


@router.delete("")
async def clear_audit_logs(dal: DAL):
    """Clear all audit logs (admin only)."""
    count = await dal.clear_audit_logs()
    return {"message": f"Deleted {count} audit logs"}
