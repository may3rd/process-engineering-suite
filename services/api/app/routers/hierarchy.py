"""Hierarchy API router - Customers, Plants, Units, Areas, Projects."""
from typing import List, Literal
from datetime import datetime, date

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

from ..dependencies import DAL

class SummaryCountsResponse(BaseModel):
    customers: int
    plants: int
    units: int
    areas: int
    projects: int
    psvs: int
    equipment: int

router = APIRouter(prefix="/hierarchy", tags=["hierarchy"])


# --- Pydantic Schemas ---

class CustomerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: str
    name: str
    code: str
    status: str
    owner_id: str = Field(alias="ownerId")
    created_at: datetime = Field(alias="createdAt")


class PlantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: str
    customer_id: str = Field(alias="customerId")
    name: str
    code: str
    location: str | None = None
    status: str
    owner_id: str = Field(alias="ownerId")
    created_at: datetime = Field(alias="createdAt")


class UnitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: str
    plant_id: str = Field(alias="plantId")
    name: str
    code: str
    service: str | None = None
    status: str
    owner_id: str = Field(alias="ownerId")
    created_at: datetime = Field(alias="createdAt")


class AreaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: str
    unit_id: str = Field(alias="unitId")
    name: str
    code: str
    status: str
    created_at: datetime = Field(alias="createdAt")


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: str
    area_id: str = Field(alias="areaId")
    name: str
    code: str
    phase: str
    status: str
    unit_system: str = Field(default="metric", alias="unitSystem")
    start_date: date = Field(alias="startDate")
    end_date: date | None = Field(default=None, alias="endDate")
    lead_id: str = Field(alias="leadId")
    is_active: bool = Field(default=True, alias="isActive")
    created_at: datetime = Field(alias="createdAt")



# --- Create/Update Schemas ---

class CustomerCreate(BaseModel):
    model_config = ConfigDict(extra='ignore')
    name: str
    code: str
    ownerId: str
    status: str = "active"

class CustomerUpdate(BaseModel):
    model_config = ConfigDict(extra='ignore')
    name: str | None = None
    code: str | None = None
    status: str | None = None
    ownerId: str | None = None

class PlantCreate(BaseModel):
    model_config = ConfigDict(extra='ignore')
    customerId: str
    name: str
    code: str
    location: str | None = None
    status: str = "active"
    ownerId: str

class PlantUpdate(BaseModel):
    model_config = ConfigDict(extra='ignore')
    name: str | None = None
    code: str | None = None
    location: str | None = None
    status: str | None = None
    ownerId: str | None = None

class UnitCreate(BaseModel):
    model_config = ConfigDict(extra='ignore')
    plantId: str
    name: str
    code: str
    service: str | None = None
    status: str = "active"
    ownerId: str

class UnitUpdate(BaseModel):
    model_config = ConfigDict(extra='ignore')
    name: str | None = None
    code: str | None = None
    service: str | None = None
    status: str | None = None
    ownerId: str | None = None

class AreaCreate(BaseModel):
    model_config = ConfigDict(extra='ignore')
    unitId: str
    name: str
    code: str
    status: str = "active"

class AreaUpdate(BaseModel):
    model_config = ConfigDict(extra='ignore')
    name: str | None = None
    code: str | None = None
    status: str | None = None

class ProjectCreate(BaseModel):
    model_config = ConfigDict(extra='ignore')
    areaId: str
    name: str
    code: str
    phase: str
    status: str = "draft"
    unitSystem: Literal["metric", "fieldSI", "metric_kgcm2", "imperial"] = "metric"
    startDate: date
    endDate: date | None = None
    leadId: str

class ProjectUpdate(BaseModel):
    model_config = ConfigDict(extra='ignore')
    name: str | None = None
    code: str | None = None
    phase: str | None = None
    status: str | None = None
    unitSystem: Literal["metric", "fieldSI", "metric_kgcm2", "imperial"] | None = None
    startDate: date | None = None
    endDate: date | None = None
    leadId: str | None = None
    isActive: bool | None = None


# --- Endpoints ---


@router.get("/summary-counts", response_model=SummaryCountsResponse)
async def get_summary_counts(dal: DAL):
    """Get summary counts for all entities."""
    customers = await dal.get_customers()
    psvs = await dal.get_protective_systems()
    equipment = await dal.get_equipment()

    # Count plants, units, areas, projects by querying all
    plant_count = 0
    unit_count = 0
    area_count = 0
    project_count = 0

    for customer in customers:
        plants = await dal.get_plants_by_customer(customer.id)
        plant_count += len(plants)
        for plant in plants:
            units = await dal.get_units_by_plant(plant.id)
            unit_count += len(units)
            for unit in units:
                areas = await dal.get_areas_by_unit(unit.id)
                area_count += len(areas)
                for area in areas:
                    projects = await dal.get_projects_by_area(area.id)
                    project_count += len(projects)

    return SummaryCountsResponse(
        customers=len(customers),
        plants=plant_count,
        units=unit_count,
        areas=area_count,
        projects=project_count,
        psvs=len(psvs),
        equipment=len(equipment)
    )

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


# --- CRUD Endpoints ---

@router.post("/customers", response_model=CustomerResponse)
async def create_customer(data: CustomerCreate, dal: DAL):
    return await dal.create_customer(data.model_dump())

@router.put("/customers/{customer_id}", response_model=CustomerResponse)
async def update_customer(customer_id: str, data: CustomerUpdate, dal: DAL):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    return await dal.update_customer(customer_id, update_data)

@router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, dal: DAL):
    success = await dal.delete_customer(customer_id)
    return {"message": "Customer deleted", "success": success}

@router.post("/plants", response_model=PlantResponse)
async def create_plant(data: PlantCreate, dal: DAL):
    return await dal.create_plant(data.model_dump())

@router.put("/plants/{plant_id}", response_model=PlantResponse)
async def update_plant(plant_id: str, data: PlantUpdate, dal: DAL):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    return await dal.update_plant(plant_id, update_data)

@router.delete("/plants/{plant_id}")
async def delete_plant(plant_id: str, dal: DAL):
    success = await dal.delete_plant(plant_id)
    return {"message": "Plant deleted", "success": success}

@router.post("/units", response_model=UnitResponse)
async def create_unit(data: UnitCreate, dal: DAL):
    return await dal.create_unit(data.model_dump())

@router.put("/units/{unit_id}", response_model=UnitResponse)
async def update_unit(unit_id: str, data: UnitUpdate, dal: DAL):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    return await dal.update_unit(unit_id, update_data)

@router.delete("/units/{unit_id}")
async def delete_unit(unit_id: str, dal: DAL):
    success = await dal.delete_unit(unit_id)
    return {"message": "Unit deleted", "success": success}

@router.post("/areas", response_model=AreaResponse)
async def create_area(data: AreaCreate, dal: DAL):
    return await dal.create_area(data.model_dump())

@router.put("/areas/{area_id}", response_model=AreaResponse)
async def update_area(area_id: str, data: AreaUpdate, dal: DAL):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    return await dal.update_area(area_id, update_data)

@router.delete("/areas/{area_id}")
async def delete_area(area_id: str, dal: DAL):
    success = await dal.delete_area(area_id)
    return {"message": "Area deleted", "success": success}

@router.post("/projects", response_model=ProjectResponse)
async def create_project(data: ProjectCreate, dal: DAL):
    return await dal.create_project(data.model_dump())

@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, data: ProjectUpdate, dal: DAL):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    return await dal.update_project(project_id, update_data)

@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, dal: DAL):
    success = await dal.delete_project(project_id)
    return {"message": "Project deleted", "success": success}
