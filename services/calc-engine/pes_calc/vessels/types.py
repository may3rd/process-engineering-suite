"""Vessel option definitions."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class VesselOption:
    """Configuration for a vessel option."""

    key: str
    label: str
    requires_length: bool
    requires_head_distance: bool


VESSEL_OPTIONS = [
    VesselOption(
        key="vertical-flat-vessel",
        label="Vertical Flat Vessel",
        requires_length=True,
        requires_head_distance=False,
    ),
    VesselOption(
        key="vertical-torispherical-vessel",
        label="Vertical ToriSpherical Vessel",
        requires_length=True,
        requires_head_distance=False,
    ),
    VesselOption(
        key="vertical-elliptical-vessel",
        label="Vertical Elliptical Vessel",
        requires_length=True,
        requires_head_distance=False,
    ),
    VesselOption(
        key="vertical-hemispherical-vessel",
        label="Vertical HemiSpherical Vessel",
        requires_length=True,
        requires_head_distance=False,
    ),
    VesselOption(
        key="vertical-conical-vessel",
        label="Vertical Conical Vessel",
        requires_length=True,
        requires_head_distance=True,
    ),
    VesselOption(
        key="vertical-flat-tank",
        label="Vertical Flat Tank",
        requires_length=True,
        requires_head_distance=False,
    ),
    VesselOption(
        key="vertical-torispherical-tank",
        label="Vertical ToriSpherical Tank",
        requires_length=True,
        requires_head_distance=False,
    ),
    VesselOption(
        key="vertical-elliptical-tank",
        label="Vertical Elliptical Tank",
        requires_length=True,
        requires_head_distance=False,
    ),
    VesselOption(
        key="vertical-hemispherical-tank",
        label="Vertical HemiSpherical Tank",
        requires_length=True,
        requires_head_distance=False,
    ),
    VesselOption(
        key="vertical-conical-tank",
        label="Vertical Conical Tank",
        requires_length=True,
        requires_head_distance=True,
    ),
    VesselOption(
        key="horizontal-flat-vessel",
        label="Horizontal Flat Vessel",
        requires_length=True,
        requires_head_distance=False,
    ),
    VesselOption(
        key="horizontal-torispherical-vessel",
        label="Horizontal ToriSpherical Vessel",
        requires_length=True,
        requires_head_distance=False,
    ),
    VesselOption(
        key="horizontal-elliptical-vessel",
        label="Horizontal Elliptical Vessel",
        requires_length=True,
        requires_head_distance=False,
    ),
    VesselOption(
        key="horizontal-hemispherical-vessel",
        label="Horizontal HemiSpherical Vessel",
        requires_length=True,
        requires_head_distance=False,
    ),
    VesselOption(
        key="horizontal-conical-vessel",
        label="Horizontal Conical Vessel",
        requires_length=True,
        requires_head_distance=True,
    ),
    VesselOption(
        key="spherical-tank",
        label="Spherical Tank",
        requires_length=False,
        requires_head_distance=False,
    ),
]

VESSEL_OPTION_MAP = {option.key: option for option in VESSEL_OPTIONS}
