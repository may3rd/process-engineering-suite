"""Equipment subtype tables and vendor_package equipment type.

Revision ID: 202602030002
Revises: 202602030001
Create Date: 2026-02-03

Adds:
- equipment_type enum value: vendor_package
- joined subtype tables for equipment details with typed columns + extra JSONB
- backfill from equipment.details into subtype tables (does not modify equipment.details)
"""

from __future__ import annotations

import json
from typing import Sequence, Union, Any

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID


revision: str = "202602030002"
down_revision: Union[str, None] = "202602030001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _as_dict(value: Any) -> dict[str, Any] | None:
    if value is None:
        return None
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return None
        return parsed if isinstance(parsed, dict) else None
    return None


def _pick_extra(details: dict[str, Any], known_keys: set[str]) -> dict[str, Any] | None:
    extra = {k: v for k, v in details.items() if k not in known_keys}
    return extra or None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_enum e
                JOIN pg_type t ON t.oid = e.enumtypid
                WHERE t.typname = 'equipment_type' AND e.enumlabel = 'vendor_package'
            ) THEN
                ALTER TYPE equipment_type ADD VALUE 'vendor_package';
            END IF;
        END $$;
        """
    )

    op.create_table(
        "equipment_vessels",
        sa.Column("equipment_id", UUID(as_uuid=False), primary_key=True),
        sa.Column("orientation", sa.Text(), nullable=True),
        sa.Column("inner_diameter_mm", sa.Numeric(), nullable=True),
        sa.Column("tangent_to_tangent_length_mm", sa.Numeric(), nullable=True),
        sa.Column("head_type", sa.Text(), nullable=True),
        sa.Column("wall_thickness_mm", sa.Numeric(), nullable=True),
        sa.Column("insulated", sa.Boolean(), nullable=True),
        sa.Column("insulation_type", sa.Text(), nullable=True),
        sa.Column("insulation_thickness_mm", sa.Numeric(), nullable=True),
        sa.Column("normal_liquid_level_pct", sa.Numeric(), nullable=True),
        sa.Column("low_liquid_level_pct", sa.Numeric(), nullable=True),
        sa.Column("high_liquid_level_pct", sa.Numeric(), nullable=True),
        sa.Column("wetted_area_m2", sa.Numeric(), nullable=True),
        sa.Column("total_surface_area_m2", sa.Numeric(), nullable=True),
        sa.Column("volume_m3", sa.Numeric(), nullable=True),
        sa.Column("extra", JSONB, nullable=True),
        sa.ForeignKeyConstraint(
            ["equipment_id"], ["equipment.id"], ondelete="CASCADE"
        ),
    )

    op.create_table(
        "equipment_columns",
        sa.Column("equipment_id", UUID(as_uuid=False), primary_key=True),
        sa.Column("inner_diameter_mm", sa.Numeric(), nullable=True),
        sa.Column("tangent_to_tangent_height_mm", sa.Numeric(), nullable=True),
        sa.Column("head_type", sa.Text(), nullable=True),
        sa.Column("wall_thickness_mm", sa.Numeric(), nullable=True),
        sa.Column("insulated", sa.Boolean(), nullable=True),
        sa.Column("insulation_type", sa.Text(), nullable=True),
        sa.Column("insulation_thickness_mm", sa.Numeric(), nullable=True),
        sa.Column("normal_liquid_level_pct", sa.Numeric(), nullable=True),
        sa.Column("low_liquid_level_pct", sa.Numeric(), nullable=True),
        sa.Column("high_liquid_level_pct", sa.Numeric(), nullable=True),
        sa.Column("number_of_trays", sa.Integer(), nullable=True),
        sa.Column("tray_spacing_mm", sa.Numeric(), nullable=True),
        sa.Column("column_type", sa.Text(), nullable=True),
        sa.Column("packing_height_mm", sa.Numeric(), nullable=True),
        sa.Column("wetted_area_m2", sa.Numeric(), nullable=True),
        sa.Column("total_surface_area_m2", sa.Numeric(), nullable=True),
        sa.Column("volume_m3", sa.Numeric(), nullable=True),
        sa.Column("extra", JSONB, nullable=True),
        sa.ForeignKeyConstraint(
            ["equipment_id"], ["equipment.id"], ondelete="CASCADE"
        ),
    )

    op.create_table(
        "equipment_tanks",
        sa.Column("equipment_id", UUID(as_uuid=False), primary_key=True),
        sa.Column("tank_type", sa.Text(), nullable=True),
        sa.Column("orientation", sa.Text(), nullable=True),
        sa.Column("inner_diameter_mm", sa.Numeric(), nullable=True),
        sa.Column("height_mm", sa.Numeric(), nullable=True),
        sa.Column("roof_type", sa.Text(), nullable=True),
        sa.Column("wall_thickness_mm", sa.Numeric(), nullable=True),
        sa.Column("insulated", sa.Boolean(), nullable=True),
        sa.Column("insulation_type", sa.Text(), nullable=True),
        sa.Column("insulation_thickness_mm", sa.Numeric(), nullable=True),
        sa.Column("normal_liquid_level_pct", sa.Numeric(), nullable=True),
        sa.Column("low_liquid_level_pct", sa.Numeric(), nullable=True),
        sa.Column("high_liquid_level_pct", sa.Numeric(), nullable=True),
        sa.Column("wetted_area_m2", sa.Numeric(), nullable=True),
        sa.Column("volume_m3", sa.Numeric(), nullable=True),
        sa.Column("heel_volume_m3", sa.Numeric(), nullable=True),
        sa.Column("extra", JSONB, nullable=True),
        sa.ForeignKeyConstraint(
            ["equipment_id"], ["equipment.id"], ondelete="CASCADE"
        ),
    )

    op.create_table(
        "equipment_pumps",
        sa.Column("equipment_id", UUID(as_uuid=False), primary_key=True),
        sa.Column("pump_type", sa.Text(), nullable=True),
        sa.Column("rated_flow_m3h", sa.Numeric(), nullable=True),
        sa.Column("rated_head_m", sa.Numeric(), nullable=True),
        sa.Column("max_discharge_pressure_barg", sa.Numeric(), nullable=True),
        sa.Column("shutoff_head_m", sa.Numeric(), nullable=True),
        sa.Column("npsh_required_m", sa.Numeric(), nullable=True),
        sa.Column("efficiency_pct", sa.Numeric(), nullable=True),
        sa.Column("motor_power_kw", sa.Numeric(), nullable=True),
        sa.Column("relief_valve_set_pressure_barg", sa.Numeric(), nullable=True),
        sa.Column("max_viscosity_cp", sa.Numeric(), nullable=True),
        sa.Column("suction_pressure_barg", sa.Numeric(), nullable=True),
        sa.Column("discharge_pressure_barg", sa.Numeric(), nullable=True),
        sa.Column("fluid_temperature_c", sa.Numeric(), nullable=True),
        sa.Column("fluid_density_kgm3", sa.Numeric(), nullable=True),
        sa.Column("extra", JSONB, nullable=True),
        sa.ForeignKeyConstraint(
            ["equipment_id"], ["equipment.id"], ondelete="CASCADE"
        ),
    )

    op.create_table(
        "equipment_compressors",
        sa.Column("equipment_id", UUID(as_uuid=False), primary_key=True),
        sa.Column("compressor_type", sa.Text(), nullable=True),
        sa.Column("rated_capacity_m3h", sa.Numeric(), nullable=True),
        sa.Column("standard_capacity_nm3h", sa.Numeric(), nullable=True),
        sa.Column("suction_pressure_barg", sa.Numeric(), nullable=True),
        sa.Column("discharge_pressure_barg", sa.Numeric(), nullable=True),
        sa.Column("compression_ratio", sa.Numeric(), nullable=True),
        sa.Column("suction_temperature_c", sa.Numeric(), nullable=True),
        sa.Column("discharge_temperature_c", sa.Numeric(), nullable=True),
        sa.Column("efficiency_pct", sa.Numeric(), nullable=True),
        sa.Column("motor_power_kw", sa.Numeric(), nullable=True),
        sa.Column("surge_flow_m3h", sa.Numeric(), nullable=True),
        sa.Column("anti_surge_valve_setpoint_pct", sa.Numeric(), nullable=True),
        sa.Column("extra", JSONB, nullable=True),
        sa.ForeignKeyConstraint(
            ["equipment_id"], ["equipment.id"], ondelete="CASCADE"
        ),
    )

    op.create_table(
        "equipment_vendor_packages",
        sa.Column("equipment_id", UUID(as_uuid=False), primary_key=True),
        sa.Column("vendor_name", sa.Text(), nullable=True),
        sa.Column("package_name", sa.Text(), nullable=True),
        sa.Column("package_description", sa.Text(), nullable=True),
        sa.Column("extra", JSONB, nullable=True),
        sa.ForeignKeyConstraint(
            ["equipment_id"], ["equipment.id"], ondelete="CASCADE"
        ),
    )

    bind = op.get_bind()
    rows = list(
        bind.execute(
            sa.text(
                "SELECT id, type, details FROM equipment WHERE details IS NOT NULL"
            )
        ).fetchall()
    )

    vessel_known = {
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
    }
    column_known = {
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
    }
    tank_known = {
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
    }
    pump_known = {
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
    }
    compressor_known = {
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
    }
    vendor_known = {
        "vendorName",
        "packageName",
        "packageDescription",
    }

    for equipment_id, equipment_type, details in rows:
        details_dict = _as_dict(details)
        if not details_dict:
            continue

        if equipment_type == "vessel":
            bind.execute(
                sa.text(
                    """
                    INSERT INTO equipment_vessels (
                        equipment_id, orientation, inner_diameter_mm, tangent_to_tangent_length_mm, head_type,
                        wall_thickness_mm, insulated, insulation_type, insulation_thickness_mm,
                        normal_liquid_level_pct, low_liquid_level_pct, high_liquid_level_pct,
                        wetted_area_m2, total_surface_area_m2, volume_m3, extra
                    ) VALUES (
                        :equipment_id, :orientation, :inner_diameter_mm, :tangent_to_tangent_length_mm, :head_type,
                        :wall_thickness_mm, :insulated, :insulation_type, :insulation_thickness_mm,
                        :normal_liquid_level_pct, :low_liquid_level_pct, :high_liquid_level_pct,
                        :wetted_area_m2, :total_surface_area_m2, :volume_m3, :extra
                    )
                    ON CONFLICT (equipment_id) DO NOTHING
                    """
                ),
                {
                    "equipment_id": equipment_id,
                    "orientation": details_dict.get("orientation"),
                    "inner_diameter_mm": details_dict.get("innerDiameter"),
                    "tangent_to_tangent_length_mm": details_dict.get("tangentToTangentLength"),
                    "head_type": details_dict.get("headType"),
                    "wall_thickness_mm": details_dict.get("wallThickness"),
                    "insulated": details_dict.get("insulated"),
                    "insulation_type": details_dict.get("insulationType"),
                    "insulation_thickness_mm": details_dict.get("insulationThickness"),
                    "normal_liquid_level_pct": details_dict.get("normalLiquidLevel"),
                    "low_liquid_level_pct": details_dict.get("lowLiquidLevel"),
                    "high_liquid_level_pct": details_dict.get("highLiquidLevel"),
                    "wetted_area_m2": details_dict.get("wettedArea"),
                    "total_surface_area_m2": details_dict.get("totalSurfaceArea"),
                    "volume_m3": details_dict.get("volume"),
                    "extra": _pick_extra(details_dict, vessel_known),
                },
            )
        elif equipment_type == "column":
            bind.execute(
                sa.text(
                    """
                    INSERT INTO equipment_columns (
                        equipment_id, inner_diameter_mm, tangent_to_tangent_height_mm, head_type, wall_thickness_mm,
                        insulated, insulation_type, insulation_thickness_mm,
                        normal_liquid_level_pct, low_liquid_level_pct, high_liquid_level_pct,
                        number_of_trays, tray_spacing_mm, column_type, packing_height_mm,
                        wetted_area_m2, total_surface_area_m2, volume_m3, extra
                    ) VALUES (
                        :equipment_id, :inner_diameter_mm, :tangent_to_tangent_height_mm, :head_type, :wall_thickness_mm,
                        :insulated, :insulation_type, :insulation_thickness_mm,
                        :normal_liquid_level_pct, :low_liquid_level_pct, :high_liquid_level_pct,
                        :number_of_trays, :tray_spacing_mm, :column_type, :packing_height_mm,
                        :wetted_area_m2, :total_surface_area_m2, :volume_m3, :extra
                    )
                    ON CONFLICT (equipment_id) DO NOTHING
                    """
                ),
                {
                    "equipment_id": equipment_id,
                    "inner_diameter_mm": details_dict.get("innerDiameter"),
                    "tangent_to_tangent_height_mm": details_dict.get("tangentToTangentHeight"),
                    "head_type": details_dict.get("headType"),
                    "wall_thickness_mm": details_dict.get("wallThickness"),
                    "insulated": details_dict.get("insulated"),
                    "insulation_type": details_dict.get("insulationType"),
                    "insulation_thickness_mm": details_dict.get("insulationThickness"),
                    "normal_liquid_level_pct": details_dict.get("normalLiquidLevel"),
                    "low_liquid_level_pct": details_dict.get("lowLiquidLevel"),
                    "high_liquid_level_pct": details_dict.get("highLiquidLevel"),
                    "number_of_trays": details_dict.get("numberOfTrays"),
                    "tray_spacing_mm": details_dict.get("traySpacing"),
                    "column_type": details_dict.get("columnType"),
                    "packing_height_mm": details_dict.get("packingHeight"),
                    "wetted_area_m2": details_dict.get("wettedArea"),
                    "total_surface_area_m2": details_dict.get("totalSurfaceArea"),
                    "volume_m3": details_dict.get("volume"),
                    "extra": _pick_extra(details_dict, column_known),
                },
            )
        elif equipment_type == "tank":
            bind.execute(
                sa.text(
                    """
                    INSERT INTO equipment_tanks (
                        equipment_id, tank_type, orientation, inner_diameter_mm, height_mm, roof_type, wall_thickness_mm,
                        insulated, insulation_type, insulation_thickness_mm,
                        normal_liquid_level_pct, low_liquid_level_pct, high_liquid_level_pct,
                        wetted_area_m2, volume_m3, heel_volume_m3, extra
                    ) VALUES (
                        :equipment_id, :tank_type, :orientation, :inner_diameter_mm, :height_mm, :roof_type, :wall_thickness_mm,
                        :insulated, :insulation_type, :insulation_thickness_mm,
                        :normal_liquid_level_pct, :low_liquid_level_pct, :high_liquid_level_pct,
                        :wetted_area_m2, :volume_m3, :heel_volume_m3, :extra
                    )
                    ON CONFLICT (equipment_id) DO NOTHING
                    """
                ),
                {
                    "equipment_id": equipment_id,
                    "tank_type": details_dict.get("tankType"),
                    "orientation": details_dict.get("orientation"),
                    "inner_diameter_mm": details_dict.get("innerDiameter"),
                    "height_mm": details_dict.get("height"),
                    "roof_type": details_dict.get("roofType"),
                    "wall_thickness_mm": details_dict.get("wallThickness"),
                    "insulated": details_dict.get("insulated"),
                    "insulation_type": details_dict.get("insulationType"),
                    "insulation_thickness_mm": details_dict.get("insulationThickness"),
                    "normal_liquid_level_pct": details_dict.get("normalLiquidLevel"),
                    "low_liquid_level_pct": details_dict.get("lowLiquidLevel"),
                    "high_liquid_level_pct": details_dict.get("highLiquidLevel"),
                    "wetted_area_m2": details_dict.get("wettedArea"),
                    "volume_m3": details_dict.get("volume"),
                    "heel_volume_m3": details_dict.get("heelVolume"),
                    "extra": _pick_extra(details_dict, tank_known),
                },
            )
        elif equipment_type == "pump":
            bind.execute(
                sa.text(
                    """
                    INSERT INTO equipment_pumps (
                        equipment_id, pump_type, rated_flow_m3h, rated_head_m, max_discharge_pressure_barg,
                        shutoff_head_m, npsh_required_m, efficiency_pct, motor_power_kw,
                        relief_valve_set_pressure_barg, max_viscosity_cp,
                        suction_pressure_barg, discharge_pressure_barg, fluid_temperature_c, fluid_density_kgm3,
                        extra
                    ) VALUES (
                        :equipment_id, :pump_type, :rated_flow_m3h, :rated_head_m, :max_discharge_pressure_barg,
                        :shutoff_head_m, :npsh_required_m, :efficiency_pct, :motor_power_kw,
                        :relief_valve_set_pressure_barg, :max_viscosity_cp,
                        :suction_pressure_barg, :discharge_pressure_barg, :fluid_temperature_c, :fluid_density_kgm3,
                        :extra
                    )
                    ON CONFLICT (equipment_id) DO NOTHING
                    """
                ),
                {
                    "equipment_id": equipment_id,
                    "pump_type": details_dict.get("pumpType"),
                    "rated_flow_m3h": details_dict.get("ratedFlow"),
                    "rated_head_m": details_dict.get("ratedHead"),
                    "max_discharge_pressure_barg": details_dict.get("maxDischargePressure"),
                    "shutoff_head_m": details_dict.get("shutoffHead"),
                    "npsh_required_m": details_dict.get("npshRequired"),
                    "efficiency_pct": details_dict.get("efficiency"),
                    "motor_power_kw": details_dict.get("motorPower"),
                    "relief_valve_set_pressure_barg": details_dict.get("reliefValveSetPressure"),
                    "max_viscosity_cp": details_dict.get("maxViscosity"),
                    "suction_pressure_barg": details_dict.get("suctionPressure"),
                    "discharge_pressure_barg": details_dict.get("dischargePressure"),
                    "fluid_temperature_c": details_dict.get("fluidTemperature"),
                    "fluid_density_kgm3": details_dict.get("fluidDensity"),
                    "extra": _pick_extra(details_dict, pump_known),
                },
            )
        elif equipment_type == "compressor":
            bind.execute(
                sa.text(
                    """
                    INSERT INTO equipment_compressors (
                        equipment_id, compressor_type, rated_capacity_m3h, standard_capacity_nm3h,
                        suction_pressure_barg, discharge_pressure_barg, compression_ratio,
                        suction_temperature_c, discharge_temperature_c, efficiency_pct, motor_power_kw,
                        surge_flow_m3h, anti_surge_valve_setpoint_pct, extra
                    ) VALUES (
                        :equipment_id, :compressor_type, :rated_capacity_m3h, :standard_capacity_nm3h,
                        :suction_pressure_barg, :discharge_pressure_barg, :compression_ratio,
                        :suction_temperature_c, :discharge_temperature_c, :efficiency_pct, :motor_power_kw,
                        :surge_flow_m3h, :anti_surge_valve_setpoint_pct, :extra
                    )
                    ON CONFLICT (equipment_id) DO NOTHING
                    """
                ),
                {
                    "equipment_id": equipment_id,
                    "compressor_type": details_dict.get("compressorType"),
                    "rated_capacity_m3h": details_dict.get("ratedCapacity"),
                    "standard_capacity_nm3h": details_dict.get("standardCapacity"),
                    "suction_pressure_barg": details_dict.get("suctionPressure"),
                    "discharge_pressure_barg": details_dict.get("dischargePressure"),
                    "compression_ratio": details_dict.get("compressionRatio"),
                    "suction_temperature_c": details_dict.get("suctionTemperature"),
                    "discharge_temperature_c": details_dict.get("dischargeTemperature"),
                    "efficiency_pct": details_dict.get("efficiency"),
                    "motor_power_kw": details_dict.get("motorPower"),
                    "surge_flow_m3h": details_dict.get("surgeFlow"),
                    "anti_surge_valve_setpoint_pct": details_dict.get("antiSurgeValveSetpoint"),
                    "extra": _pick_extra(details_dict, compressor_known),
                },
            )
        elif equipment_type == "vendor_package":
            bind.execute(
                sa.text(
                    """
                    INSERT INTO equipment_vendor_packages (
                        equipment_id, vendor_name, package_name, package_description, extra
                    ) VALUES (
                        :equipment_id, :vendor_name, :package_name, :package_description, :extra
                    )
                    ON CONFLICT (equipment_id) DO NOTHING
                    """
                ),
                {
                    "equipment_id": equipment_id,
                    "vendor_name": details_dict.get("vendorName"),
                    "package_name": details_dict.get("packageName"),
                    "package_description": details_dict.get("packageDescription"),
                    "extra": _pick_extra(details_dict, vendor_known),
                },
            )


def downgrade() -> None:
    op.drop_table("equipment_vendor_packages")
    op.drop_table("equipment_compressors")
    op.drop_table("equipment_pumps")
    op.drop_table("equipment_tanks")
    op.drop_table("equipment_columns")
    op.drop_table("equipment_vessels")
