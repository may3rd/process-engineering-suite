"""PSV (Protective Systems) API router."""
from typing import List, Optional, Literal
from datetime import datetime

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field

from ..dependencies import DAL

router = APIRouter(prefix="/psv", tags=["psv"])


# --- Pydantic Schemas ---

class ProtectiveSystemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: str
    area_id: str = Field(serialization_alias="areaId", alias="areaId")
    project_ids: Optional[List[str]] = Field(default=None, serialization_alias="projectIds", alias="projectIds")
    name: str
    tag: str
    type: str
    design_code: Optional[str] = Field(default=None, serialization_alias="designCode", alias="designCode")
    service_fluid: Optional[str] = Field(default=None, serialization_alias="serviceFluid", alias="serviceFluid")
    fluid_phase: Optional[str] = Field(default=None, serialization_alias="fluidPhase", alias="fluidPhase")
    set_pressure: Optional[float] = Field(default=None, serialization_alias="setPressure", alias="setPressure")
    mawp: Optional[float] = Field(default=None)
    owner_id: Optional[str] = Field(default=None, serialization_alias="ownerId", alias="ownerId")
    status: Optional[str] = Field(default="draft")
    valve_type: Optional[str] = Field(default=None, serialization_alias="valveType", alias="valveType")
    tags: List[str] = []
    current_revision_id: Optional[str] = Field(default=None, serialization_alias="currentRevisionId", alias="currentRevisionId")
    inlet_network: Optional[dict] = Field(default=None, serialization_alias="inletNetwork", alias="inletNetwork")
    outlet_network: Optional[dict] = Field(default=None, serialization_alias="outletNetwork", alias="outletNetwork")
    is_active: bool = Field(default=True, serialization_alias="isActive", alias="isActive")
    version: int = 1  # For optimistic locking / conflict detection
    created_at: Optional[datetime] = Field(default=None, serialization_alias="createdAt", alias="createdAt")
    updated_at: Optional[datetime] = Field(default=None, serialization_alias="updatedAt", alias="updatedAt")


class ProtectiveSystemCreate(BaseModel):
    model_config = ConfigDict(extra='ignore')
    areaId: str
    name: str
    tag: str
    type: Literal[
        "psv",
        "rupture_disc",
        "breather_valve",
        "flame_arrestor",
        "tank_vent",
        "control_valve",
        "vent_system",
        "prv",
    ] = "psv"
    designCode: Literal["API-520", "API-521", "API-2000", "ASME-VIII"] = "API-520"
    serviceFluid: Optional[str] = None
    fluidPhase: Literal["gas", "liquid", "steam", "two_phase"] = "gas"
    setPressure: float
    mawp: float
    ownerId: str
    valveType: Optional[Literal["conventional", "balanced_bellows", "pilot_operated"]] = None
    tags: List[str] = []
    projectIds: Optional[List[str]] = None
    currentRevisionId: Optional[str] = None


class ProtectiveSystemUpdate(BaseModel):
    model_config = ConfigDict(extra='ignore')
    name: Optional[str] = None
    tag: Optional[str] = None
    type: Optional[Literal[
        "psv",
        "rupture_disc",
        "breather_valve",
        "flame_arrestor",
        "tank_vent",
        "control_valve",
        "vent_system",
        "prv",
    ]] = None
    designCode: Optional[Literal["API-520", "API-521", "API-2000", "ASME-VIII"]] = None
    serviceFluid: Optional[str] = None
    fluidPhase: Optional[Literal["gas", "liquid", "steam", "two_phase"]] = None
    setPressure: Optional[float] = None
    mawp: Optional[float] = None
    status: Optional[str] = None
    valveType: Optional[Literal["conventional", "balanced_bellows", "pilot_operated"]] = None
    tags: Optional[List[str]] = None
    currentRevisionId: Optional[str] = None
    inletNetwork: Optional[dict] = None
    outletNetwork: Optional[dict] = None
    projectIds: Optional[List[str]] = None
    isActive: Optional[bool] = None
    version: Optional[int] = None  # For optimistic locking / conflict detection


class ScenarioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: str
    protective_system_id: str = Field(serialization_alias="protectiveSystemId", alias="protectiveSystemId")
    cause: str
    description: Optional[str] = None
    relieving_temp: Optional[float] = Field(default=None, serialization_alias="relievingTemp", alias="relievingTemp")
    relieving_pressure: Optional[float] = Field(default=None, serialization_alias="relievingPressure", alias="relievingPressure")
    phase: Optional[str] = Field(default=None)
    relieving_rate: Optional[float] = Field(default=None, serialization_alias="relievingRate", alias="relievingRate")
    accumulation_pct: Optional[float] = Field(default=None, serialization_alias="accumulationPct", alias="accumulationPct")
    required_capacity: Optional[float] = Field(default=None, serialization_alias="requiredCapacity", alias="requiredCapacity")
    assumptions: List[str] = []
    code_refs: List[str] = Field(default=[], serialization_alias="codeRefs", alias="codeRefs")
    is_governing: bool = Field(default=False, serialization_alias="isGoverning", alias="isGoverning")
    current_revision_id: Optional[str] = Field(default=None, serialization_alias="currentRevisionId", alias="currentRevisionId")
    # Markdown-formatted case consideration notes shown in PSV Detail -> Scenario Section.
    case_consideration: Optional[str] = Field(default=None, serialization_alias="caseConsideration", alias="caseConsideration")
    fire_calculation: Optional[dict] = Field(default=None, serialization_alias="fireCalculation", alias="fireCalculation")
    is_active: bool = Field(default=True, serialization_alias="isActive", alias="isActive")
    created_at: Optional[datetime] = Field(default=None, serialization_alias="createdAt", alias="createdAt")
    updated_at: Optional[datetime] = Field(default=None, serialization_alias="updatedAt", alias="updatedAt")


class ScenarioCreate(BaseModel):
    model_config = ConfigDict(extra='ignore')
    protectiveSystemId: str
    cause: str
    description: Optional[str] = None
    relievingTemp: float
    relievingPressure: float
    phase: str
    relievingRate: float
    accumulationPct: float
    requiredCapacity: float
    assumptions: List[str] = []
    codeRefs: List[str] = []
    isGoverning: bool = False
    currentRevisionId: Optional[str] = None
    # GitHub-flavored markdown for scenario-specific analysis/justification.
    caseConsideration: Optional[str] = None


class ScenarioUpdate(BaseModel):
    model_config = ConfigDict(extra='ignore')
    cause: Optional[str] = None
    description: Optional[str] = None
    relievingTemp: Optional[float] = None
    relievingPressure: Optional[float] = None
    phase: Optional[str] = None
    relievingRate: Optional[float] = None
    accumulationPct: Optional[float] = None
    requiredCapacity: Optional[float] = None
    assumptions: Optional[List[str]] = None
    codeRefs: Optional[List[str]] = None
    isGoverning: Optional[bool] = None
    currentRevisionId: Optional[str] = None
    # Keep optional so existing clients can omit it without clearing the stored value.
    caseConsideration: Optional[str] = None
    isActive: Optional[bool] = None


class SizingCaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: str
    protective_system_id: str = Field(serialization_alias="protectiveSystemId", alias="protectiveSystemId")
    scenario_id: Optional[str] = Field(default=None, serialization_alias="scenarioId", alias="scenarioId")
    standard: Optional[str] = Field(default=None)
    method: Optional[str] = Field(default=None)
    inputs: dict = {}
    outputs: dict = {}
    current_revision_id: Optional[str] = Field(default=None, serialization_alias="currentRevisionId", alias="currentRevisionId")
    status: Optional[str] = Field(default="draft")
    created_by: Optional[str] = Field(default=None, serialization_alias="createdBy", alias="createdBy")
    approved_by: Optional[str] = Field(default=None, serialization_alias="approvedBy", alias="approvedBy")
    is_active: bool = Field(default=True, serialization_alias="isActive", alias="isActive")
    created_at: Optional[datetime] = Field(default=None, serialization_alias="createdAt", alias="createdAt")
    updated_at: Optional[datetime] = Field(default=None, serialization_alias="updatedAt", alias="updatedAt")


class SizingCaseCreate(BaseModel):
    model_config = ConfigDict(extra='ignore')
    protectiveSystemId: str
    scenarioId: Optional[str] = None
    standard: str = "API-520"
    method: str
    inputs: dict = {}
    currentRevisionId: Optional[str] = None
    createdBy: str


class SizingCaseUpdate(BaseModel):
    model_config = ConfigDict(extra='ignore')
    inputs: Optional[dict] = None
    outputs: Optional[dict] = None
    status: Optional[str] = None
    approvedBy: Optional[str] = None
    currentRevisionId: Optional[str] = None
    isActive: Optional[bool] = None


# --- PSV Endpoints ---

@router.get("", response_model=List[ProtectiveSystemResponse])
async def get_protective_systems(dal: DAL, area_id: Optional[str] = None):
    """Get all protective systems, optionally filtered by area."""
    return await dal.get_protective_systems(area_id)


@router.get("/{psv_id}", response_model=ProtectiveSystemResponse)
async def get_protective_system(psv_id: str, dal: DAL):
    """Get a single protective system by ID."""
    psv = await dal.get_protective_system_by_id(psv_id)
    if not psv:
        raise HTTPException(status_code=404, detail="PSV not found")
    return psv





@router.post("", response_model=ProtectiveSystemResponse)
async def create_protective_system(data: ProtectiveSystemCreate, dal: DAL):
    """Create a new protective system."""
    return await dal.create_protective_system(data.model_dump())


@router.put("/{psv_id}", response_model=ProtectiveSystemResponse)
async def update_protective_system(psv_id: str, data: ProtectiveSystemUpdate, dal: DAL):
    """Update a protective system."""
    try:
        # Only include non-None values
        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        return await dal.update_protective_system(psv_id, update_data)
    except ValueError as e:
        error_message = str(e)
        # Return 409 Conflict for version mismatch
        if "Conflict: Version mismatch" in error_message:
            raise HTTPException(status_code=409, detail=error_message)
        # Return 404 for not found
        raise HTTPException(status_code=404, detail=error_message)



@router.delete("/{psv_id}")
async def delete_protective_system(psv_id: str, dal: DAL):
    """Soft delete a protective system."""
    success = await dal.delete_protective_system(psv_id)
    if not success:
        raise HTTPException(status_code=404, detail="PSV not found")
    return {"message": "PSV deleted"}


# --- Scenario Endpoints ---

@router.get("/{psv_id}/scenarios", response_model=List[ScenarioResponse])
async def get_scenarios(psv_id: str, dal: DAL):
    """Get scenarios for a protective system."""
    return await dal.get_scenarios_by_psv(psv_id)


@router.post("/{psv_id}/scenarios", response_model=ScenarioResponse)
async def create_scenario(psv_id: str, data: ScenarioCreate, dal: DAL):
    """Create a new scenario for a protective system."""
    data_dict = data.model_dump()
    data_dict["protectiveSystemId"] = psv_id
    return await dal.create_scenario(data_dict)


@router.put("/scenarios/{scenario_id}", response_model=ScenarioResponse)
async def update_scenario(scenario_id: str, data: ScenarioUpdate, dal: DAL):
    """Update a scenario."""
    try:
        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        return await dal.update_scenario(scenario_id, update_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/scenarios/{scenario_id}")
async def delete_scenario(scenario_id: str, dal: DAL):
    """Delete a scenario."""
    success = await dal.delete_scenario(scenario_id)
    if not success:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return {"message": "Scenario deleted"}


# --- Sizing Case Endpoints ---

@router.get("/{psv_id}/sizing-cases", response_model=List[SizingCaseResponse])
async def get_sizing_cases(psv_id: str, dal: DAL):
    """Get sizing cases for a protective system."""
    return await dal.get_sizing_cases_by_psv(psv_id)


@router.post("/{psv_id}/sizing-cases", response_model=SizingCaseResponse)
async def create_sizing_case(psv_id: str, data: SizingCaseCreate, dal: DAL):
    """Create a new sizing case."""
    data_dict = data.model_dump()
    data_dict["protectiveSystemId"] = psv_id
    return await dal.create_sizing_case(data_dict)


@router.put("/sizing-cases/{case_id}", response_model=SizingCaseResponse)
async def update_sizing_case(case_id: str, data: SizingCaseUpdate, dal: DAL):
    """Update a sizing case."""
    try:
        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        return await dal.update_sizing_case(case_id, update_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/sizing-cases/{case_id}")
async def delete_sizing_case(case_id: str, dal: DAL):
    """Delete a sizing case."""
    success = await dal.delete_sizing_case(case_id)
    if not success:
        raise HTTPException(status_code=404, detail="Sizing case not found")
    return {"message": "Sizing case deleted"}