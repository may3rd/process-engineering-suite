from __future__ import annotations

from langchain_core.tools import tool

from apps.api.app.services.process_design_agents.sizing_tools.interface import equipment_sizing


@tool
def size_distillation_column_basic(
    feed_flow_kmol_h: float,
    feed_temperature_c: float,
    overhead_composition: float,
    bottoms_composition: float,
    feed_composition: float,
    relative_volatility: float,
    tray_efficiency_percent: float = 70.0,
    design_pressure_pa: float = 201325.0,
) -> str:
    """
    Preliminary distillation column sizing based on shortcut methods (Fenske/Underwood/Gilliland). Pressure is in absolute Pascals.
    """
    return equipment_sizing(
        "distillation_column_sizing",
        feed_flow_kmol_h,
        feed_temperature_c,
        overhead_composition,
        bottoms_composition,
        feed_composition,
        relative_volatility,
        tray_efficiency_percent,
        design_pressure_pa,
    )


@tool
def size_absorption_column_basic(
    gas_flow_kmol_h: float,
    inlet_concentration: float,
    outlet_concentration: float,
    solvent_type: str = "water",
    henry_constant: float | None = None,
    design_pressure_pa: float = 201325.0,
) -> str:
    """
    Preliminary absorption column sizing using heuristic stage and diameter estimates. Pressure is in absolute Pascals.
    """
    return equipment_sizing(
        "absorption_column_sizing",
        gas_flow_kmol_h,
        inlet_concentration,
        outlet_concentration,
        solvent_type,
        henry_constant,
        design_pressure_pa,
    )


@tool
def size_separator_vessel_basic(
    total_flow_bbl_day: float,
    gas_flow_mmscfd: float,
    oil_percentage: float,
    water_percentage: float,
    separator_type: str = "horizontal",
    residence_time_min: float = 3.0,
    design_pressure_pa: float = 601325.0,
    design_temperature_c: float = 40.0,
) -> str:
    """
    Preliminary two- or three-phase separator sizing returning volume, geometry, and nozzle guidance. Pressure is in absolute Pascals.
    """
    return equipment_sizing(
        "separator_vessel_sizing",
        total_flow_bbl_day,
        gas_flow_mmscfd,
        oil_percentage,
        water_percentage,
        separator_type,
        residence_time_min,
        design_pressure_pa,
        design_temperature_c,
    )
