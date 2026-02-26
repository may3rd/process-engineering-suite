"""Venting Calculations API router — CRUD for saved API 2000 tank venting calculations."""
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from ..dependencies import DAL

router = APIRouter(prefix="/venting", tags=["venting"])


# --- Pydantic Schemas ---

class VentingCalculationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: str
    area_id: Optional[str] = Field(default=None, serialization_alias="areaId", alias="areaId")
    equipment_id: Optional[str] = Field(default=None, serialization_alias="equipmentId", alias="equipmentId")
    owner_id: Optional[str] = Field(default=None, serialization_alias="ownerId", alias="ownerId")
    name: str
    description: Optional[str] = None
    status: str = "draft"
    inputs: dict = {}
    results: Optional[dict] = None
    calculation_metadata: dict = Field(
        default_factory=dict,
        serialization_alias="calculationMetadata",
        alias="calculationMetadata",
    )
    revision_history: List[dict] = Field(
        default_factory=list,
        serialization_alias="revisionHistory",
        alias="revisionHistory",
    )
    api_edition: str = Field(default="7TH", serialization_alias="apiEdition", alias="apiEdition")
    is_active: bool = Field(default=True, serialization_alias="isActive", alias="isActive")
    deleted_at: Optional[datetime] = Field(default=None, serialization_alias="deletedAt", alias="deletedAt")
    created_at: Optional[datetime] = Field(default=None, serialization_alias="createdAt", alias="createdAt")
    updated_at: Optional[datetime] = Field(default=None, serialization_alias="updatedAt", alias="updatedAt")


class VentingCalculationCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    description: Optional[str] = None
    areaId: Optional[str] = None
    equipmentId: Optional[str] = None
    ownerId: Optional[str] = None
    inputs: dict = {}
    results: Optional[dict] = None
    calculationMetadata: Optional[dict] = None
    revisionHistory: List[dict] = []
    apiEdition: str = "7TH"


class VentingCalculationUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    inputs: Optional[dict] = None
    results: Optional[dict] = None
    calculationMetadata: Optional[dict] = None
    revisionHistory: Optional[List[dict]] = None
    apiEdition: Optional[str] = None
    isActive: Optional[bool] = None


# --- Endpoints ---

@router.get("", response_model=List[VentingCalculationResponse])
async def list_venting_calculations(
    dal: DAL,
    areaId: Optional[str] = Query(default=None),
    equipmentId: Optional[str] = Query(default=None),
    includeDeleted: bool = Query(default=False),
):
    """List venting calculations, optionally filtered by area or equipment."""
    return await dal.get_venting_calculations(areaId, equipmentId, includeDeleted)


@router.get("/{calc_id}", response_model=VentingCalculationResponse)
async def get_venting_calculation(calc_id: str, dal: DAL):
    """Get a single venting calculation by ID."""
    calc = await dal.get_venting_calculation_by_id(calc_id)
    if not calc:
        raise HTTPException(status_code=404, detail="Venting calculation not found")
    return calc


@router.post("", response_model=VentingCalculationResponse, status_code=201)
async def create_venting_calculation(data: VentingCalculationCreate, dal: DAL):
    """Create a new venting calculation."""
    return await dal.create_venting_calculation(data.model_dump())


@router.put("/{calc_id}", response_model=VentingCalculationResponse)
async def update_venting_calculation(calc_id: str, data: VentingCalculationUpdate, dal: DAL):
    """Update a venting calculation."""
    try:
        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        return await dal.update_venting_calculation(calc_id, update_data)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{calc_id}")
async def delete_venting_calculation(calc_id: str, dal: DAL):
    """Soft-delete a venting calculation."""
    success = await dal.delete_venting_calculation(calc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Venting calculation not found")
    return {"message": "Venting calculation deleted"}


@router.post("/{calc_id}/restore", response_model=VentingCalculationResponse)
async def restore_venting_calculation(calc_id: str, dal: DAL):
    """Restore a soft-deleted venting calculation."""
    try:
        return await dal.restore_venting_calculation(calc_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
