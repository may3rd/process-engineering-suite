"""Supporting resources API router - Equipment, Attachments, Comments, Todos."""
from typing import List, Optional
from datetime import datetime, date

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from ..dependencies import DAL

router = APIRouter(tags=["supporting"])


# --- Equipment Schemas ---

class EquipmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: str
    area_id: str = Field(serialization_alias="areaId")
    type: str
    tag: str
    name: str
    description: Optional[str] = None
    design_pressure: Optional[float] = Field(default=None, serialization_alias="designPressure")
    mawp: Optional[float] = None
    design_temp: Optional[float] = Field(default=None, serialization_alias="designTemperature")
    owner_id: str = Field(serialization_alias="ownerId")
    status: str
    location_ref: Optional[str] = Field(default=None, serialization_alias="locationRef")
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")


class EquipmentLinkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: str
    protective_system_id: str = Field(serialization_alias="protectiveSystemId")
    equipment_id: str = Field(serialization_alias="equipmentId")
    is_primary: bool = Field(default=False, serialization_alias="isPrimary")
    scenario_id: Optional[str] = Field(default=None, serialization_alias="scenarioId")
    relationship_type: str = Field(serialization_alias="relationship")
    notes: Optional[str] = None
    created_at: datetime = Field(serialization_alias="createdAt")


# --- Attachment Schemas ---

class AttachmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: str
    protective_system_id: str = Field(serialization_alias="protectiveSystemId")
    file_uri: str = Field(serialization_alias="fileUri")
    file_name: str = Field(serialization_alias="fileName")
    mime_type: str = Field(serialization_alias="mimeType")
    size: int
    uploaded_by: str = Field(serialization_alias="uploadedBy")
    created_at: datetime = Field(serialization_alias="createdAt")


class AttachmentCreate(BaseModel):
    protectiveSystemId: str
    fileUri: str
    fileName: str
    mimeType: str
    size: int
    uploadedBy: str


# --- Comment Schemas ---

class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: str
    protective_system_id: str = Field(serialization_alias="protectiveSystemId")
    body: str
    created_by: str = Field(serialization_alias="createdBy")
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")


class CommentCreate(BaseModel):
    protectiveSystemId: str
    body: str
    createdBy: str


# --- Todo Schemas ---

class TodoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: str
    protective_system_id: str = Field(serialization_alias="protectiveSystemId")
    text: str
    completed: bool = False
    assigned_to: Optional[str] = Field(default=None, serialization_alias="assignedTo")
    due_date: Optional[date] = Field(default=None, serialization_alias="dueDate")
    created_by: str = Field(serialization_alias="createdBy")
    created_at: datetime = Field(serialization_alias="createdAt")


class TodoCreate(BaseModel):
    protectiveSystemId: str
    text: str
    assignedTo: Optional[str] = None
    dueDate: Optional[str] = None
    createdBy: str


class TodoUpdate(BaseModel):
    text: Optional[str] = None
    completed: Optional[bool] = None
    assignedTo: Optional[str] = None
    dueDate: Optional[str] = None


# --- Equipment Endpoints ---

@router.get("/equipment", response_model=List[EquipmentResponse])
async def get_equipment(dal: DAL, area_id: Optional[str] = None):
    """Get all equipment, optionally filtered by area."""
    return await dal.get_equipment(area_id)


@router.get("/psv/{psv_id}/equipment-links", response_model=List[EquipmentLinkResponse])
async def get_equipment_links(psv_id: str, dal: DAL):
    """Get equipment links for a protective system."""
    return await dal.get_equipment_links_by_psv(psv_id)


# --- Attachment Endpoints ---

@router.get("/psv/{psv_id}/attachments", response_model=List[AttachmentResponse])
async def get_attachments(psv_id: str, dal: DAL):
    """Get attachments for a protective system."""
    return await dal.get_attachments_by_psv(psv_id)


@router.post("/attachments", response_model=AttachmentResponse)
async def create_attachment(data: AttachmentCreate, dal: DAL):
    """Create a new attachment record."""
    return await dal.create_attachment(data.model_dump())


@router.delete("/attachments/{attachment_id}")
async def delete_attachment(attachment_id: str, dal: DAL):
    """Delete an attachment."""
    success = await dal.delete_attachment(attachment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Attachment not found")
    return {"message": "Attachment deleted"}


# --- Comment Endpoints ---

@router.get("/psv/{psv_id}/comments", response_model=List[CommentResponse])
async def get_comments(psv_id: str, dal: DAL):
    """Get comments for a protective system."""
    return await dal.get_comments_by_psv(psv_id)


@router.post("/comments", response_model=CommentResponse)
async def create_comment(data: CommentCreate, dal: DAL):
    """Create a new comment."""
    return await dal.create_comment(data.model_dump())


# --- Todo Endpoints ---

@router.get("/psv/{psv_id}/todos", response_model=List[TodoResponse])
async def get_todos(psv_id: str, dal: DAL):
    """Get todos for a protective system."""
    return await dal.get_todos_by_psv(psv_id)


@router.post("/todos", response_model=TodoResponse)
async def create_todo(data: TodoCreate, dal: DAL):
    """Create a new todo."""
    return await dal.create_todo(data.model_dump())


@router.put("/todos/{todo_id}", response_model=TodoResponse)
async def update_todo(todo_id: str, data: TodoUpdate, dal: DAL):
    """Update a todo."""
    try:
        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        return await dal.update_todo(todo_id, update_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
