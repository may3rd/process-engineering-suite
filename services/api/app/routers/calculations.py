from typing import Any, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from ..dependencies import DAL

router = APIRouter(prefix='/calculations', tags=['calculations'])


class CalculationResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    app: str
    areaId: Optional[str] = None
    ownerId: Optional[str] = None
    name: str
    description: str = ''
    status: str = 'draft'
    tag: Optional[str] = None
    isActive: bool = True
    linkedEquipmentId: Optional[str] = None
    linkedEquipmentTag: Optional[str] = None
    latestVersionNo: int
    latestVersionId: Optional[str] = None
    inputs: dict[str, Any] = Field(default_factory=dict)
    results: Optional[dict[str, Any]] = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    revisionHistory: List[dict[str, Any]] = Field(default_factory=list)
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    deletedAt: Optional[str] = None


class CalculationVersionResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    calculationId: str
    versionNo: int
    versionKind: str
    inputs: dict[str, Any] = Field(default_factory=dict)
    results: Optional[dict[str, Any]] = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    revisionHistory: List[dict[str, Any]] = Field(default_factory=list)
    linkedEquipmentId: Optional[str] = None
    linkedEquipmentTag: Optional[str] = None
    sourceVersionId: Optional[str] = None
    changeNote: Optional[str] = None
    createdAt: Optional[str] = None


class CalculationCreate(BaseModel):
    model_config = ConfigDict(extra='ignore')

    app: str
    areaId: Optional[str] = None
    ownerId: Optional[str] = None
    name: str
    description: Optional[str] = None
    status: Optional[str] = None
    tag: Optional[str] = None
    inputs: dict[str, Any] = Field(default_factory=dict)
    results: Optional[dict[str, Any]] = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    revisionHistory: List[dict[str, Any]] = Field(default_factory=list)
    linkedEquipmentId: Optional[str] = None
    linkedEquipmentTag: Optional[str] = None


class CalculationUpdate(BaseModel):
    model_config = ConfigDict(extra='ignore')

    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    tag: Optional[str] = None
    inputs: Optional[dict[str, Any]] = None
    results: Optional[dict[str, Any]] = None
    metadata: Optional[dict[str, Any]] = None
    revisionHistory: Optional[List[dict[str, Any]]] = None
    linkedEquipmentId: Optional[str] = None
    linkedEquipmentTag: Optional[str] = None
    changeNote: Optional[str] = None


class CalculationRestoreRequest(BaseModel):
    model_config = ConfigDict(extra='ignore')

    versionId: str
    changeNote: Optional[str] = None


@router.get('', response_model=List[CalculationResponse])
async def list_calculations(
    dal: DAL,
    includeInactive: bool = Query(default=False),
    app: Optional[str] = Query(default=None),
):
    return await dal.get_calculations(include_inactive=includeInactive, app=app)


@router.get('/{calculation_id}', response_model=CalculationResponse)
async def get_calculation(calculation_id: str, dal: DAL):
    calculation = await dal.get_calculation_by_id(calculation_id)
    if not calculation:
        raise HTTPException(status_code=404, detail='Calculation not found')
    return calculation


@router.post('', response_model=CalculationResponse, status_code=201)
async def create_calculation(data: CalculationCreate, dal: DAL):
    return await dal.create_calculation(data.model_dump())


@router.patch('/{calculation_id}', response_model=CalculationResponse)
async def update_calculation(calculation_id: str, data: CalculationUpdate, dal: DAL):
    try:
        return await dal.update_calculation(
            calculation_id,
            {key: value for key, value in data.model_dump().items() if value is not None},
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.delete('/{calculation_id}')
async def delete_calculation(calculation_id: str, dal: DAL):
    deleted = await dal.delete_calculation(calculation_id)
    if not deleted:
        raise HTTPException(status_code=404, detail='Calculation not found')
    return {'message': 'Calculation deleted'}


@router.get('/{calculation_id}/versions', response_model=List[CalculationVersionResponse])
async def list_calculation_versions(calculation_id: str, dal: DAL):
    return await dal.get_calculation_versions(calculation_id)


@router.get('/{calculation_id}/versions/{version_id}', response_model=CalculationVersionResponse)
async def get_calculation_version(calculation_id: str, version_id: str, dal: DAL):
    version = await dal.get_calculation_version_by_id(calculation_id, version_id)
    if not version:
        raise HTTPException(status_code=404, detail='Calculation version not found')
    return version


@router.post('/{calculation_id}/restore', response_model=CalculationResponse)
async def restore_calculation(calculation_id: str, data: CalculationRestoreRequest, dal: DAL):
    try:
        return await dal.restore_calculation(
            calculation_id,
            version_id=data.versionId,
            change_note=data.changeNote,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
