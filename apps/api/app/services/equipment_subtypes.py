"""Equipment subtype mapping between API `details` dict and subtype tables."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Optional

from ..models import (
    EquipmentColumn,
    EquipmentCompressor,
    EquipmentPump,
    EquipmentTank,
    EquipmentVendorPackage,
    EquipmentVessel,
)


def _as_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (int, float)):
        return float(value)
    return None


def _merge_details(base: dict[str, Any], extra: Optional[dict[str, Any]]) -> dict[str, Any]:
    if not extra:
        return base
    merged = dict(base)
    for key, value in extra.items():
        if key not in merged:
            merged[key] = value
    return merged


@dataclass(frozen=True)
class SubtypeMapping:
    model: type[Any]
    known_keys: set[str]


_MAPPINGS: dict[str, SubtypeMapping] = {
    "vessel": SubtypeMapping(
        model=EquipmentVessel,
        known_keys={
            "orientation",
            "innerDiameter",
            "tangentToTangentLength",
            "headType",
            "wallThickness",
            "insulated",
            "insulationType",
            "insulationThickness",
            "normalLiquidLevel",
            "lowLiquidLevel",
            "highLiquidLevel",
            "wettedArea",
            "totalSurfaceArea",
            "volume",
        },
    ),
    "column": SubtypeMapping(
        model=EquipmentColumn,
        known_keys={
            "innerDiameter",
            "tangentToTangentHeight",
            "headType",
            "wallThickness",
            "insulated",
            "insulationType",
            "insulationThickness",
            "normalLiquidLevel",
            "lowLiquidLevel",
            "highLiquidLevel",
            "numberOfTrays",
            "traySpacing",
            "columnType",
            "packingHeight",
            "wettedArea",
            "totalSurfaceArea",
            "volume",
        },
    ),
    "tank": SubtypeMapping(
        model=EquipmentTank,
        known_keys={
            "tankType",
            "orientation",
            "innerDiameter",
            "height",
            "roofType",
            "wallThickness",
            "insulated",
            "insulationType",
            "insulationThickness",
            "normalLiquidLevel",
            "lowLiquidLevel",
            "highLiquidLevel",
            "wettedArea",
            "volume",
            "heelVolume",
        },
    ),
    "pump": SubtypeMapping(
        model=EquipmentPump,
        known_keys={
            "pumpType",
            "ratedFlow",
            "ratedHead",
            "maxDischargePressure",
            "shutoffHead",
            "npshRequired",
            "efficiency",
            "motorPower",
            "reliefValveSetPressure",
            "maxViscosity",
            "suctionPressure",
            "dischargePressure",
            "fluidTemperature",
            "fluidDensity",
        },
    ),
    "compressor": SubtypeMapping(
        model=EquipmentCompressor,
        known_keys={
            "compressorType",
            "ratedCapacity",
            "standardCapacity",
            "suctionPressure",
            "dischargePressure",
            "compressionRatio",
            "suctionTemperature",
            "dischargeTemperature",
            "efficiency",
            "motorPower",
            "surgeFlow",
            "antiSurgeValveSetpoint",
        },
    ),
    "vendor_package": SubtypeMapping(
        model=EquipmentVendorPackage,
        known_keys={
            "vendorName",
            "packageName",
            "packageDescription",
        },
    ),
}


def get_subtype_model(equipment_type: str) -> type[Any] | None:
    mapping = _MAPPINGS.get(equipment_type)
    return mapping.model if mapping else None


def build_subtype_row_values(
    equipment_type: str, details: Optional[dict[str, Any]]
) -> dict[str, Any] | None:
    mapping = _MAPPINGS.get(equipment_type)
    if not mapping or not details:
        return None

    extra = {k: v for k, v in details.items() if k not in mapping.known_keys} or None

    if equipment_type == "vessel":
        return {
            "orientation": details.get("orientation"),
            "inner_diameter_mm": details.get("innerDiameter"),
            "tangent_to_tangent_length_mm": details.get("tangentToTangentLength"),
            "head_type": details.get("headType"),
            "wall_thickness_mm": details.get("wallThickness"),
            "insulated": details.get("insulated"),
            "insulation_type": details.get("insulationType"),
            "insulation_thickness_mm": details.get("insulationThickness"),
            "normal_liquid_level_pct": details.get("normalLiquidLevel"),
            "low_liquid_level_pct": details.get("lowLiquidLevel"),
            "high_liquid_level_pct": details.get("highLiquidLevel"),
            "wetted_area_m2": details.get("wettedArea"),
            "total_surface_area_m2": details.get("totalSurfaceArea"),
            "volume_m3": details.get("volume"),
            "extra": extra,
        }

    if equipment_type == "column":
        return {
            "inner_diameter_mm": details.get("innerDiameter"),
            "tangent_to_tangent_height_mm": details.get("tangentToTangentHeight"),
            "head_type": details.get("headType"),
            "wall_thickness_mm": details.get("wallThickness"),
            "insulated": details.get("insulated"),
            "insulation_type": details.get("insulationType"),
            "insulation_thickness_mm": details.get("insulationThickness"),
            "normal_liquid_level_pct": details.get("normalLiquidLevel"),
            "low_liquid_level_pct": details.get("lowLiquidLevel"),
            "high_liquid_level_pct": details.get("highLiquidLevel"),
            "number_of_trays": details.get("numberOfTrays"),
            "tray_spacing_mm": details.get("traySpacing"),
            "column_type": details.get("columnType"),
            "packing_height_mm": details.get("packingHeight"),
            "wetted_area_m2": details.get("wettedArea"),
            "total_surface_area_m2": details.get("totalSurfaceArea"),
            "volume_m3": details.get("volume"),
            "extra": extra,
        }

    if equipment_type == "tank":
        return {
            "tank_type": details.get("tankType"),
            "orientation": details.get("orientation"),
            "inner_diameter_mm": details.get("innerDiameter"),
            "height_mm": details.get("height"),
            "roof_type": details.get("roofType"),
            "wall_thickness_mm": details.get("wallThickness"),
            "insulated": details.get("insulated"),
            "insulation_type": details.get("insulationType"),
            "insulation_thickness_mm": details.get("insulationThickness"),
            "normal_liquid_level_pct": details.get("normalLiquidLevel"),
            "low_liquid_level_pct": details.get("lowLiquidLevel"),
            "high_liquid_level_pct": details.get("highLiquidLevel"),
            "wetted_area_m2": details.get("wettedArea"),
            "volume_m3": details.get("volume"),
            "heel_volume_m3": details.get("heelVolume"),
            "extra": extra,
        }

    if equipment_type == "pump":
        return {
            "pump_type": details.get("pumpType"),
            "rated_flow_m3h": details.get("ratedFlow"),
            "rated_head_m": details.get("ratedHead"),
            "max_discharge_pressure_barg": details.get("maxDischargePressure"),
            "shutoff_head_m": details.get("shutoffHead"),
            "npsh_required_m": details.get("npshRequired"),
            "efficiency_pct": details.get("efficiency"),
            "motor_power_kw": details.get("motorPower"),
            "relief_valve_set_pressure_barg": details.get("reliefValveSetPressure"),
            "max_viscosity_cp": details.get("maxViscosity"),
            "suction_pressure_barg": details.get("suctionPressure"),
            "discharge_pressure_barg": details.get("dischargePressure"),
            "fluid_temperature_c": details.get("fluidTemperature"),
            "fluid_density_kgm3": details.get("fluidDensity"),
            "extra": extra,
        }

    if equipment_type == "compressor":
        return {
            "compressor_type": details.get("compressorType"),
            "rated_capacity_m3h": details.get("ratedCapacity"),
            "standard_capacity_nm3h": details.get("standardCapacity"),
            "suction_pressure_barg": details.get("suctionPressure"),
            "discharge_pressure_barg": details.get("dischargePressure"),
            "compression_ratio": details.get("compressionRatio"),
            "suction_temperature_c": details.get("suctionTemperature"),
            "discharge_temperature_c": details.get("dischargeTemperature"),
            "efficiency_pct": details.get("efficiency"),
            "motor_power_kw": details.get("motorPower"),
            "surge_flow_m3h": details.get("surgeFlow"),
            "anti_surge_valve_setpoint_pct": details.get("antiSurgeValveSetpoint"),
            "extra": extra,
        }

    if equipment_type == "vendor_package":
        return {
            "vendor_name": details.get("vendorName"),
            "package_name": details.get("packageName"),
            "package_description": details.get("packageDescription"),
            "extra": extra,
        }

    return None


def build_details_from_subtype_row(equipment_type: str, row: Any) -> dict[str, Any] | None:
    if row is None:
        return None

    if equipment_type == "vessel":
        base = {
            "orientation": row.orientation,
            "innerDiameter": _as_float(row.inner_diameter_mm),
            "tangentToTangentLength": _as_float(row.tangent_to_tangent_length_mm),
            "headType": row.head_type,
            "wallThickness": _as_float(row.wall_thickness_mm),
            "insulated": row.insulated,
            "insulationType": row.insulation_type,
            "insulationThickness": _as_float(row.insulation_thickness_mm),
            "normalLiquidLevel": _as_float(row.normal_liquid_level_pct),
            "lowLiquidLevel": _as_float(row.low_liquid_level_pct),
            "highLiquidLevel": _as_float(row.high_liquid_level_pct),
            "wettedArea": _as_float(row.wetted_area_m2),
            "totalSurfaceArea": _as_float(row.total_surface_area_m2),
            "volume": _as_float(row.volume_m3),
        }
        compact = {k: v for k, v in base.items() if v is not None}
        if row.insulated is not None:
            compact["insulated"] = row.insulated
        return _merge_details(compact, row.extra)

    if equipment_type == "column":
        base = {
            "innerDiameter": _as_float(row.inner_diameter_mm),
            "tangentToTangentHeight": _as_float(row.tangent_to_tangent_height_mm),
            "headType": row.head_type,
            "wallThickness": _as_float(row.wall_thickness_mm),
            "insulated": row.insulated,
            "insulationType": row.insulation_type,
            "insulationThickness": _as_float(row.insulation_thickness_mm),
            "normalLiquidLevel": _as_float(row.normal_liquid_level_pct),
            "lowLiquidLevel": _as_float(row.low_liquid_level_pct),
            "highLiquidLevel": _as_float(row.high_liquid_level_pct),
            "numberOfTrays": row.number_of_trays,
            "traySpacing": _as_float(row.tray_spacing_mm),
            "columnType": row.column_type,
            "packingHeight": _as_float(row.packing_height_mm),
            "wettedArea": _as_float(row.wetted_area_m2),
            "totalSurfaceArea": _as_float(row.total_surface_area_m2),
            "volume": _as_float(row.volume_m3),
        }
        compact = {k: v for k, v in base.items() if v is not None}
        if row.insulated is not None:
            compact["insulated"] = row.insulated
        return _merge_details(compact, row.extra)

    if equipment_type == "tank":
        base = {
            "tankType": row.tank_type,
            "orientation": row.orientation,
            "innerDiameter": _as_float(row.inner_diameter_mm),
            "height": _as_float(row.height_mm),
            "roofType": row.roof_type,
            "wallThickness": _as_float(row.wall_thickness_mm),
            "insulated": row.insulated,
            "insulationType": row.insulation_type,
            "insulationThickness": _as_float(row.insulation_thickness_mm),
            "normalLiquidLevel": _as_float(row.normal_liquid_level_pct),
            "lowLiquidLevel": _as_float(row.low_liquid_level_pct),
            "highLiquidLevel": _as_float(row.high_liquid_level_pct),
            "wettedArea": _as_float(row.wetted_area_m2),
            "volume": _as_float(row.volume_m3),
            "heelVolume": _as_float(row.heel_volume_m3),
        }
        compact = {k: v for k, v in base.items() if v is not None}
        if row.insulated is not None:
            compact["insulated"] = row.insulated
        return _merge_details(compact, row.extra)

    if equipment_type == "pump":
        base = {
            "pumpType": row.pump_type,
            "ratedFlow": _as_float(row.rated_flow_m3h),
            "ratedHead": _as_float(row.rated_head_m),
            "maxDischargePressure": _as_float(row.max_discharge_pressure_barg),
            "shutoffHead": _as_float(row.shutoff_head_m),
            "npshRequired": _as_float(row.npsh_required_m),
            "efficiency": _as_float(row.efficiency_pct),
            "motorPower": _as_float(row.motor_power_kw),
            "reliefValveSetPressure": _as_float(row.relief_valve_set_pressure_barg),
            "maxViscosity": _as_float(row.max_viscosity_cp),
            "suctionPressure": _as_float(row.suction_pressure_barg),
            "dischargePressure": _as_float(row.discharge_pressure_barg),
            "fluidTemperature": _as_float(row.fluid_temperature_c),
            "fluidDensity": _as_float(row.fluid_density_kgm3),
        }
        compact = {k: v for k, v in base.items() if v is not None}
        return _merge_details(compact, row.extra)

    if equipment_type == "compressor":
        base = {
            "compressorType": row.compressor_type,
            "ratedCapacity": _as_float(row.rated_capacity_m3h),
            "standardCapacity": _as_float(row.standard_capacity_nm3h),
            "suctionPressure": _as_float(row.suction_pressure_barg),
            "dischargePressure": _as_float(row.discharge_pressure_barg),
            "compressionRatio": _as_float(row.compression_ratio),
            "suctionTemperature": _as_float(row.suction_temperature_c),
            "dischargeTemperature": _as_float(row.discharge_temperature_c),
            "efficiency": _as_float(row.efficiency_pct),
            "motorPower": _as_float(row.motor_power_kw),
            "surgeFlow": _as_float(row.surge_flow_m3h),
            "antiSurgeValveSetpoint": _as_float(row.anti_surge_valve_setpoint_pct),
        }
        compact = {k: v for k, v in base.items() if v is not None}
        return _merge_details(compact, row.extra)

    if equipment_type == "vendor_package":
        base = {
            "vendorName": row.vendor_name,
            "packageName": row.package_name,
            "packageDescription": row.package_description,
        }
        compact = {k: v for k, v in base.items() if v is not None}
        return _merge_details(compact, row.extra)

    return None

