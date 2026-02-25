"""Network Designs API router — CRUD for saved hydraulic network editor designs."""
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from ..dependencies import DAL

router = APIRouter(prefix="/network-designs", tags=["network-designs"])


# --- Pydantic Schemas ---

class NetworkDesignResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: str
    area_id: Optional[str] = Field(default=None, serialization_alias="areaId", alias="areaId")
    owner_id: Optional[str] = Field(default=None, serialization_alias="ownerId", alias="ownerId")
    name: str
    description: Optional[str] = None
    network_data: dict = Field(default={}, serialization_alias="networkData", alias="networkData")
    node_count: int = Field(default=0, serialization_alias="nodeCount", alias="nodeCount")
    pipe_count: int = Field(default=0, serialization_alias="pipeCount", alias="pipeCount")
    created_at: Optional[datetime] = Field(default=None, serialization_alias="createdAt", alias="createdAt")
    updated_at: Optional[datetime] = Field(default=None, serialization_alias="updatedAt", alias="updatedAt")


class NetworkDesignCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    description: Optional[str] = None
    areaId: Optional[str] = None
    ownerId: Optional[str] = None
    networkData: dict = {}
    nodeCount: int = 0
    pipeCount: int = 0


class NetworkDesignUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    description: Optional[str] = None
    networkData: Optional[dict] = None
    nodeCount: Optional[int] = None
    pipeCount: Optional[int] = None


# --- Endpoints ---

@router.get("", response_model=List[NetworkDesignResponse])
async def list_network_designs(
    dal: DAL,
    areaId: Optional[str] = Query(default=None),
):
    """List network designs, optionally filtered by area."""
    return await dal.get_network_designs(areaId)


@router.get("/{design_id}", response_model=NetworkDesignResponse)
async def get_network_design(design_id: str, dal: DAL):
    """Get a single network design by ID."""
    design = await dal.get_network_design_by_id(design_id)
    if not design:
        raise HTTPException(status_code=404, detail="Network design not found")
    return design


@router.post("", response_model=NetworkDesignResponse, status_code=201)
async def create_network_design(data: NetworkDesignCreate, dal: DAL):
    """Create a new network design."""
    return await dal.create_network_design(data.model_dump())


@router.put("/{design_id}", response_model=NetworkDesignResponse)
async def update_network_design(design_id: str, data: NetworkDesignUpdate, dal: DAL):
    """Update a network design (full replace of networkData)."""
    try:
        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        return await dal.update_network_design(design_id, update_data)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{design_id}")
async def delete_network_design(design_id: str, dal: DAL):
    """Hard-delete a network design."""
    success = await dal.delete_network_design(design_id)
    if not success:
        raise HTTPException(status_code=404, detail="Network design not found")
    return {"message": "Network design deleted"}
