"""Hierarchy API router - Customers, Plants, Units, Areas, Projects."""
from typing import List
from datetime import datetime, date

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

from ..dependencies import DAL

router = APIRouter(prefix="/hierarchy", tags=["hierarchy"])


# --- Pydantic Schemas ---

class CustomerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: str
    name: str
    code: str
    status: str
    owner_id: str = Field(serialization_alias="ownerId")
    created_at: datetime = Field(serialization_alias="createdAt")


class PlantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: str
    customer_id: str = Field(serialization_alias="customerId")
    name: str
    code: str
    location: str | None = None
    status: str
    owner_id: str = Field(serialization_alias="ownerId")
    created_at: datetime = Field(serialization_alias="createdAt")


class UnitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: str
    plant_id: str = Field(serialization_alias="plantId")
    name: str
    code: str
    service: str | None = None
    status: str
    owner_id: str = Field(serialization_alias="ownerId")
    created_at: datetime = Field(serialization_alias="createdAt")


class AreaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: str
    unit_id: str = Field(serialization_alias="unitId")
    name: str
    code: str
    status: str
    created_at: datetime = Field(serialization_alias="createdAt")


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: str
    area_id: str = Field(serialization_alias="areaId")
    name: str
    code: str
    phase: str
    status: str
    start_date: date = Field(serialization_alias="startDate")
    end_date: date | None = Field(default=None, serialization_alias="endDate")
    lead_id: str = Field(serialization_alias="leadId")
    created_at: datetime = Field(serialization_alias="createdAt")


# --- Endpoints ---

@router.get("/customers", response_model=List[CustomerResponse])
async def get_customers(dal: DAL):
    """Get all customers."""
    return await dal.get_customers()


@router.get("/customers/{customer_id}/plants", response_model=List[PlantResponse])
async def get_plants_by_customer(customer_id: str, dal: DAL):
    """Get all plants for a customer."""
    return await dal.get_plants_by_customer(customer_id)


@router.get("/plants/{plant_id}/units", response_model=List[UnitResponse])
async def get_units_by_plant(plant_id: str, dal: DAL):
    """Get all units for a plant."""
    return await dal.get_units_by_plant(plant_id)


@router.get("/units/{unit_id}/areas", response_model=List[AreaResponse])
async def get_areas_by_unit(unit_id: str, dal: DAL):
    """Get all areas for a unit."""
    return await dal.get_areas_by_unit(unit_id)


@router.get("/areas/{area_id}/projects", response_model=List[ProjectResponse])
async def get_projects_by_area(area_id: str, dal: DAL):
    """Get all projects for an area."""
    return await dal.get_projects_by_area(area_id)
