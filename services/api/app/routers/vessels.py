"""Vessel calculation endpoints."""

from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from pes_calc.vessels import (
    HorizontalConicalVessel,
    HorizontalEllipticalVessel,
    HorizontalFlatVessel,
    HorizontalHemisphericalVessel,
    HorizontalTorisphericalVessel,
    SphericalTank,
    VerticalConicalVessel,
    VerticalEllipticalVessel,
    VerticalFlatVessel,
    VerticalHemisphericalVessel,
    VerticalTorisphericalVessel,
    Vessel,
)

router = APIRouter(prefix="/vessels", tags=["vessels"])


class VesselInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    vessel_type: Literal[
        "vertical-torispherical",
        "vertical-flat",
        "vertical-elliptical",
        "vertical-hemispherical",
        "vertical-conical",
        "horizontal-torispherical",
        "horizontal-flat",
        "horizontal-elliptical",
        "horizontal-hemispherical",
        "horizontal-conical",
        "spherical",
        "vertical-ellipsoidal",
        "horizontal-ellipsoidal",
    ] = Field(alias="vesselType")
    diameter: float
    length: float
    liquid_level: float = Field(alias="liquidLevel")
    head_distance: Optional[float] = Field(default=None, alias="headDistance")


class WettedAreaResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    wetted_area: float = Field(alias="wettedArea")
    liquid_volume: float = Field(alias="liquidVolume")
    total_volume: float = Field(alias="totalVolume")
    total_height: float = Field(alias="totalHeight")
    percent_full: float = Field(alias="percentFull")


class FireExposureInput(VesselInput):
    model_config = ConfigDict(populate_by_name=True)
    is_protected: bool = Field(alias="isProtected")
    max_height_above_grade: float = Field(
        default=7.6,
        alias="maxHeightAboveGrade",
    )
    height_above_grade: float = Field(default=0.0, alias="heightAboveGrade")


class FireExposureResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    wetted_area: float = Field(alias="wettedArea")


def _normalize_vessel_type(vessel_type: str) -> str:
    return vessel_type.replace("ellipsoidal", "elliptical")


def _create_vessel(payload: VesselInput) -> Vessel:
    vessel_type = _normalize_vessel_type(payload.vessel_type)
    diameter = payload.diameter
    length = payload.length
    head_distance = payload.head_distance

    if vessel_type == "vertical-torispherical":
        return VerticalTorisphericalVessel(diameter, length)
    if vessel_type == "vertical-flat":
        return VerticalFlatVessel(diameter, length)
    if vessel_type == "vertical-elliptical":
        return VerticalEllipticalVessel(diameter, length)
    if vessel_type == "vertical-hemispherical":
        return VerticalHemisphericalVessel(diameter, length)
    if vessel_type == "vertical-conical":
        vessel = VerticalConicalVessel(diameter, length)
        if head_distance is not None:
            vessel.head_distance = head_distance
        return vessel
    if vessel_type == "horizontal-torispherical":
        return HorizontalTorisphericalVessel(diameter, length)
    if vessel_type == "horizontal-flat":
        return HorizontalFlatVessel(diameter, length)
    if vessel_type == "horizontal-elliptical":
        return HorizontalEllipticalVessel(diameter, length)
    if vessel_type == "horizontal-hemispherical":
        return HorizontalHemisphericalVessel(diameter, length)
    if vessel_type == "horizontal-conical":
        vessel = HorizontalConicalVessel(diameter, length)
        if head_distance is not None:
            vessel.head_distance = head_distance
        return vessel
    if vessel_type == "spherical":
        return SphericalTank(diameter)
    raise HTTPException(
        status_code=400,
        detail=f"Unsupported vessel type: {payload.vessel_type}",
    )


@router.post("/wetted-area", response_model=WettedAreaResponse)
async def calculate_wetted_area(payload: VesselInput) -> WettedAreaResponse:
    """Calculate wetted area and volume metrics for a vessel."""
    vessel = _create_vessel(payload)
    liquid_level = payload.liquid_level
    wetted_area = vessel.wetted_area(liquid_level)
    liquid_volume = vessel.liquid_volume(liquid_level)
    total_volume = vessel.total_volume
    total_height = vessel.total_height
    percent_full = (liquid_volume / total_volume) * 100 if total_volume > 0 else 0.0
    return WettedAreaResponse(
        wettedArea=wetted_area,
        liquidVolume=liquid_volume,
        totalVolume=total_volume,
        totalHeight=total_height,
        percentFull=percent_full,
    )


@router.post("/fire-exposure", response_model=FireExposureResponse)
async def calculate_fire_exposure(payload: FireExposureInput) -> FireExposureResponse:
    """Calculate wetted area within the fire exposure zone."""
    vessel = _create_vessel(payload)
    effective_limit = max(0.0, payload.max_height_above_grade - payload.height_above_grade)
    if effective_limit <= 0.0:
        return FireExposureResponse(wettedArea=0.0)
    if payload.is_protected:
        effective_height = min(vessel.total_height, effective_limit)
        wetted_area = vessel.wetted_area(effective_height)
    else:
        effective_level = min(payload.liquid_level, effective_limit)
        wetted_area = vessel.wetted_area(effective_level)
    return FireExposureResponse(wettedArea=wetted_area)
