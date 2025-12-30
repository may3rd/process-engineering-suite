"""Revision History API router."""
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from ..dependencies import DAL

router = APIRouter(prefix="/revisions", tags=["revisions"])


# --- Pydantic Schemas ---

class RevisionResponse(BaseModel):
    """Revision history response model."""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    entity_type: str = Field(validation_alias="entityType", serialization_alias="entityType")
    entity_id: str = Field(validation_alias="entityId", serialization_alias="entityId")
    revision_code: str = Field(validation_alias="revisionCode", serialization_alias="revisionCode")
    sequence: int
    description: Optional[str] = None

    originated_by: Optional[str] = Field(default=None, validation_alias="originatedBy", serialization_alias="originatedBy")
    originated_at: Optional[datetime] = Field(default=None, validation_alias="originatedAt", serialization_alias="originatedAt")
    checked_by: Optional[str] = Field(default=None, validation_alias="checkedBy", serialization_alias="checkedBy")
    checked_at: Optional[datetime] = Field(default=None, validation_alias="checkedAt", serialization_alias="checkedAt")
    approved_by: Optional[str] = Field(default=None, validation_alias="approvedBy", serialization_alias="approvedBy")
    approved_at: Optional[datetime] = Field(default=None, validation_alias="approvedAt", serialization_alias="approvedAt")
    issued_at: Optional[datetime] = Field(default=None, validation_alias="issuedAt", serialization_alias="issuedAt")

    snapshot: dict = {}
    created_at: datetime = Field(validation_alias="createdAt", serialization_alias="createdAt")


class RevisionCreate(BaseModel):
    """Create a new revision."""
    model_config = ConfigDict(extra='ignore')
    
    entityType: str
    entityId: str
    revisionCode: str
    sequence: int
    description: Optional[str] = None
    originatedBy: Optional[str] = None
    originatedAt: Optional[datetime] = None
    snapshot: dict = {}


class RevisionUpdate(BaseModel):
    """Update revision lifecycle fields."""
    model_config = ConfigDict(extra='ignore')
    
    originatedBy: Optional[str] = None
    originatedAt: Optional[datetime] = None
    checkedBy: Optional[str] = None
    checkedAt: Optional[datetime] = None
    approvedBy: Optional[str] = None
    approvedAt: Optional[datetime] = None
    issuedAt: Optional[datetime] = None
    description: Optional[str] = None


# --- Endpoints ---

@router.get("/{entity_type}/{entity_id}", response_model=List[RevisionResponse])
async def get_entity_revisions(entity_type: str, entity_id: str, dal: DAL):
    """Get all revisions for an entity."""
    return await dal.get_revisions_by_entity(entity_type, entity_id)


@router.get("/id/{revision_id}", response_model=RevisionResponse)
async def get_revision(revision_id: str, dal: DAL):
    """Get a single revision by ID."""
    revision = await dal.get_revision_by_id(revision_id)
    if not revision:
        raise HTTPException(status_code=404, detail="Revision not found")
    return revision


@router.post("/", response_model=RevisionResponse)
async def create_revision(data: RevisionCreate, dal: DAL):
    """Create a new revision."""
    return await dal.create_revision(data.model_dump(exclude_none=True))


@router.patch("/{revision_id}", response_model=RevisionResponse)
async def update_revision(revision_id: str, data: RevisionUpdate, dal: DAL):
    """Update revision lifecycle fields (checked, approved, issued)."""
    # Keep explicit `null` values so clients can revoke lifecycle fields.
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    return await dal.update_revision(revision_id, update_data)


@router.delete("/{revision_id}")
async def delete_revision(revision_id: str, dal: DAL):
    """Delete a revision history record."""
    success = await dal.delete_revision(revision_id)
    if not success:
        raise HTTPException(status_code=404, detail="Revision not found")
    return {"success": True}
