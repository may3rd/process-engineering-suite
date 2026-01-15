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
    area_id: str = Field(serialization_alias="areaId", alias="areaId")
    type: str
    tag: str
    name: str
    description: Optional[str] = None
    design_pressure: Optional[float] = Field(default=None, serialization_alias="designPressure", alias="designPressure")
    design_pressure_unit: Optional[str] = Field(default="barg", serialization_alias="designPressureUnit", alias="designPressureUnit")
    mawp: Optional[float] = None
    mawp_unit: Optional[str] = Field(default="barg", serialization_alias="mawpUnit", alias="mawpUnit")
    design_temp: Optional[float] = Field(default=None, serialization_alias="designTemperature", alias="designTemperature")
    design_temp_unit: Optional[str] = Field(default="C", serialization_alias="designTempUnit", alias="designTempUnit")
    owner_id: Optional[str] = Field(default=None, serialization_alias="ownerId", alias="ownerId")
    status: Optional[str] = Field(default="active")
    is_active: bool = Field(default=True, serialization_alias="isActive", alias="isActive")
    location_ref: Optional[str] = Field(default=None, serialization_alias="locationRef", alias="locationRef")
    details: Optional[dict] = None
    created_at: Optional[datetime] = Field(default=None, serialization_alias="createdAt", alias="createdAt")
    updated_at: Optional[datetime] = Field(default=None, serialization_alias="updatedAt", alias="updatedAt")


class EquipmentLinkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: str
    protective_system_id: str = Field(serialization_alias="protectiveSystemId", alias="protectiveSystemId")
    equipment_id: str = Field(serialization_alias="equipmentId", alias="equipmentId")
    is_primary: bool = Field(default=False, serialization_alias="isPrimary", alias="isPrimary")
    scenario_id: Optional[str] = Field(default=None, serialization_alias="scenarioId", alias="scenarioId")
    relationship_type: str = Field(default="protects", serialization_alias="relationship", alias="relationship")
    notes: Optional[str] = None
    created_at: Optional[datetime] = Field(default=None, serialization_alias="createdAt", alias="createdAt")


class EquipmentLinkCreate(BaseModel):
    model_config = ConfigDict(extra='ignore')
    protectiveSystemId: str
    equipmentId: str
    isPrimary: bool = False
    scenarioId: Optional[str] = None
    relationship: Optional[str] = "protects"
    notes: Optional[str] = None


# --- Attachment Schemas ---

class AttachmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: str
    protective_system_id: str = Field(serialization_alias="protectiveSystemId", alias="protectiveSystemId")
    file_uri: str = Field(serialization_alias="fileUri", alias="fileUri")
    file_name: str = Field(serialization_alias="fileName", alias="fileName")
    mime_type: str = Field(serialization_alias="mimeType", alias="mimeType")
    size: int
    uploaded_by: str = Field(serialization_alias="uploadedBy", alias="uploadedBy")
    created_at: Optional[datetime] = Field(default=None, serialization_alias="createdAt", alias="createdAt")


class AttachmentCreate(BaseModel):
    model_config = ConfigDict(extra='ignore')
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
    protective_system_id: str = Field(serialization_alias="protectiveSystemId", alias="protectiveSystemId")
    body: str
    is_active: bool = Field(default=True, serialization_alias="isActive", alias="isActive")
    created_by: str = Field(serialization_alias="createdBy", alias="createdBy")
    created_at: Optional[datetime] = Field(default=None, serialization_alias="createdAt", alias="createdAt")
    updated_at: Optional[datetime] = Field(default=None, serialization_alias="updatedAt", alias="updatedAt")
    updated_by: Optional[str] = Field(default=None, serialization_alias="updatedBy", alias="updatedBy")


class CommentCreate(BaseModel):
    model_config = ConfigDict(extra='ignore')
    protectiveSystemId: str
    body: str
    createdBy: str


class CommentUpdate(BaseModel):
    model_config = ConfigDict(extra='ignore')
    body: Optional[str] = None
    updatedBy: Optional[str] = None
    isActive: Optional[bool] = None


# --- Project Notes ---

class ProjectNoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: str
    protective_system_id: str = Field(serialization_alias="protectiveSystemId", alias="protectiveSystemId")
    body: str
    is_active: bool = Field(default=True, serialization_alias="isActive", alias="isActive")
    created_by: str = Field(serialization_alias="createdBy", alias="createdBy")
    created_at: Optional[datetime] = Field(default=None, serialization_alias="createdAt", alias="createdAt")
    updated_by: Optional[str] = Field(default=None, serialization_alias="updatedBy", alias="updatedBy")
    updated_at: Optional[datetime] = Field(default=None, serialization_alias="updatedAt", alias="updatedAt")


class ProjectNoteCreate(BaseModel):
    model_config = ConfigDict(extra='ignore')
    protectiveSystemId: str
    body: str
    createdBy: str


class ProjectNoteUpdate(BaseModel):
    model_config = ConfigDict(extra='ignore')
    body: Optional[str] = None
    updatedBy: Optional[str] = None
    isActive: Optional[bool] = None


# --- Todo Schemas ---

class TodoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: str
    protective_system_id: str = Field(serialization_alias="protectiveSystemId", alias="protectiveSystemId")
    text: str
    completed: bool = False
    assigned_to: Optional[str] = Field(default=None, serialization_alias="assignedTo", alias="assignedTo")
    due_date: Optional[date] = Field(default=None, serialization_alias="dueDate", alias="dueDate")
    is_active: bool = Field(default=True, serialization_alias="isActive", alias="isActive")
    created_by: str = Field(serialization_alias="createdBy", alias="createdBy")
    created_at: Optional[datetime] = Field(default=None, serialization_alias="createdAt", alias="createdAt")


class TodoCreate(BaseModel):
    model_config = ConfigDict(extra='ignore')
    protectiveSystemId: str
    text: str
    assignedTo: Optional[str] = None
    dueDate: Optional[str] = None
    createdBy: str


class TodoUpdate(BaseModel):
    model_config = ConfigDict(extra='ignore')
    text: Optional[str] = None
    completed: Optional[bool] = None
    assignedTo: Optional[str] = None
    dueDate: Optional[str] = None
    isActive: Optional[bool] = None


# --- Equipment Endpoints ---

@router.get("/equipment", response_model=List[EquipmentResponse])
async def get_equipment(dal: DAL, area_id: Optional[str] = None):
    """Get all equipment, optionally filtered by area."""
    return await dal.get_equipment(area_id)


class EquipmentCreate(BaseModel):
    model_config = ConfigDict(extra='ignore')
    areaId: str
    type: str
    tag: str
    name: str
    description: Optional[str] = None
    designPressure: Optional[float] = None
    mawp: Optional[float] = None
    designTemperature: Optional[float] = None
    ownerId: Optional[str] = None  # Optional - will use default user if not provided
    status: str = "active"
    details: Optional[dict] = None


class EquipmentUpdate(BaseModel):
    model_config = ConfigDict(extra='ignore')
    type: Optional[str] = None
    tag: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    areaId: Optional[str] = None
    designPressure: Optional[float] = None
    designPressureUnit: Optional[str] = None
    mawp: Optional[float] = None
    mawpUnit: Optional[str] = None
    designTemperature: Optional[float] = None
    designTempUnit: Optional[str] = None
    ownerId: Optional[str] = None  # THIS WAS MISSING!
    status: Optional[str] = None
    isActive: Optional[bool] = None
    details: Optional[dict] = None


@router.post("/equipment", response_model=EquipmentResponse)
async def create_equipment(data: EquipmentCreate, dal: DAL):
    """Create a new equipment."""
    equipment_data = data.model_dump()
    
    # If ownerId is not provided or is empty, use the first user as default
    if not equipment_data.get('ownerId'):
        # Get first user as default owner
        users = await dal.get_users()
        if users:
            equipment_data['ownerId'] = users[0].id
        else:
            raise HTTPException(status_code=400, detail="No users found - cannot create equipment without owner")
    
    return await dal.create_equipment(equipment_data)


@router.put("/equipment/{equipment_id}", response_model=EquipmentResponse)
async def update_equipment(equipment_id: str, data: EquipmentUpdate, dal: DAL):
    """Update an equipment."""
    try:
        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        return await dal.update_equipment(equipment_id, update_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/equipment/{equipment_id}")
async def delete_equipment(equipment_id: str, dal: DAL):
    """Delete an equipment."""
    success = await dal.delete_equipment(equipment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return {"success": True}


@router.get("/psv/{psv_id}/equipment-links", response_model=List[EquipmentLinkResponse])
async def get_equipment_links(psv_id: str, dal: DAL):
    """Get equipment links for a protective system."""
    return await dal.get_equipment_links_by_psv(psv_id)


@router.post("/equipment-links", response_model=EquipmentLinkResponse)
async def create_equipment_link(data: EquipmentLinkCreate, dal: DAL):
    """Create a new equipment link."""
    return await dal.create_equipment_link(data.model_dump())


@router.delete("/equipment-links/{link_id}")
async def delete_equipment_link(link_id: str, dal: DAL):
    """Delete an equipment link."""
    success = await dal.delete_equipment_link(link_id)
    if not success:
        raise HTTPException(status_code=404, detail="Equipment link not found")
    return {"success": True}


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


@router.put("/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(comment_id: str, data: CommentUpdate, dal: DAL):
    """Update an existing comment."""
    try:
        return await dal.update_comment(comment_id, {k: v for k, v in data.model_dump().items() if v is not None})
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


# --- Notes Endpoints ---

@router.get("/psv/{psv_id}/notes", response_model=List[ProjectNoteResponse])
async def get_notes(psv_id: str, dal: DAL):
    """Get printable notes for a protective system."""
    return await dal.get_notes_by_psv(psv_id)


@router.post("/notes", response_model=ProjectNoteResponse)
async def create_note(data: ProjectNoteCreate, dal: DAL):
    """Create a new note."""
    return await dal.create_note(data.model_dump())


@router.put("/notes/{note_id}", response_model=ProjectNoteResponse)
async def update_note(note_id: str, data: ProjectNoteUpdate, dal: DAL):
    """Update an existing note."""
    try:
        return await dal.update_note(note_id, {k: v for k, v in data.model_dump().items() if v is not None})
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.delete("/notes/{note_id}")
async def delete_note(note_id: str, dal: DAL):
    """Delete a note."""
    success = await dal.delete_note(note_id)
    if not success:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"success": True}


@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, dal: DAL):
    """Delete a comment."""
    success = await dal.delete_comment(comment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {"message": "Comment deleted"}


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


@router.delete("/todos/{todo_id}")
async def delete_todo(todo_id: str, dal: DAL):
    """Delete a todo."""
    success = await dal.delete_todo(todo_id)
    if not success:
        raise HTTPException(status_code=404, detail="Todo not found")
    return {"message": "Todo deleted"}
