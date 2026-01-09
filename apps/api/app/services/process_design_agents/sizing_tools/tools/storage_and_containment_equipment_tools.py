from __future__ import annotations

from langchain_core.tools import tool

from apps.api.app.services.process_design_agents.sizing_tools.interface import equipment_sizing


@tool
def size_storage_tank_basic(
    design_capacity_m3: float,
    fluid_type: str = "crude_oil",
    storage_duration_hours: float = 24.0,
    design_pressure_pa: float = 111325.0,
    design_temperature_c: float = 40.0,
    tank_type: str = "vertical_cylindrical",
) -> str:
    """
    Preliminary storage tank sizing covering geometry, thickness, and roof selection. Pressure is in absolute Pascals.
    """
    return equipment_sizing(
        "storage_tank_sizing",
        design_capacity_m3,
        fluid_type,
        storage_duration_hours,
        design_pressure_pa,
        design_temperature_c,
        tank_type,
    )


@tool
def size_surge_drum_basic(
    inlet_flow_kg_h: float,
    outlet_flow_kg_h: float,
    fluid_density_kg_m3: float,
    surge_time_minutes: float = 10.0,
    operating_pressure_pa: float = 201325.0,
    l_d_ratio: float = 3.0,
) -> str:
    """
    Preliminary surge drum sizing focused on holdup volume and drum geometry. Pressure is in absolute Pascals.
    """
    return equipment_sizing(
        "surge_drum_sizing",
        inlet_flow_kg_h,
        outlet_flow_kg_h,
        fluid_density_kg_m3,
        surge_time_minutes,
        operating_pressure_pa,
        l_d_ratio,
    )
