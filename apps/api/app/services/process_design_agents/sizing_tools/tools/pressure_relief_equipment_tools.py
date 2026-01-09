from __future__ import annotations

from langchain_core.tools import tool

from apps.api.app.services.process_design_agents.sizing_tools.interface import equipment_sizing


@tool
def size_pressure_safety_valve_basic(
    protected_equipment_id: str,
    required_relief_flow_kg_h: float,
    relief_pressure_pa: float,
    back_pressure_pa: float,
    fluid_phase: str = "vapor",
    fluid_density_kg_m3: float | None = None,
) -> str:
    """
    Preliminary PSV sizing returning nozzle, capacity, and valve class recommendations. Pressures are in absolute Pascals.
    """
    return equipment_sizing(
        "pressure_safety_valve_sizing",
        protected_equipment_id,
        required_relief_flow_kg_h,
        relief_pressure_pa,
        back_pressure_pa,
        fluid_phase,
        fluid_density_kg_m3,
    )


@tool
def size_blowdown_valve_basic(
    protected_equipment_id: str,
    equipment_volume_m3: float,
    blowdown_time_minutes: float,
    initial_pressure_pa: float,
    final_pressure_pa: float = 151325.0,
    fluid_type: str = "hydrocarbon",
    fluid_density_kg_m3: float | None = None,
) -> str:
    """
    Preliminary blowdown valve sizing estimating capacities and connection diameters. Pressures are in absolute Pascals.
    """
    return equipment_sizing(
        "blowdown_valve_sizing",
        protected_equipment_id,
        equipment_volume_m3,
        blowdown_time_minutes,
        initial_pressure_pa,
        final_pressure_pa,
        fluid_type,
        fluid_density_kg_m3,
    )


@tool
def size_vent_valve_basic(
    vessel_id: str,
    vapor_flow_kmol_h: float,
    vapor_molecular_weight: float,
    vapor_density_kg_m3: float,
    relieving_temperature_c: float, # This is relieving_pressure_pa
    relieving_pressure_pa: float,
) -> str:
    """
    Preliminary vent valve sizing for atmospheric or low-pressure relief scenarios. Pressure is in absolute Pascals.
    """
    return equipment_sizing(
        "vent_valve_sizing",
        vessel_id,
        vapor_flow_kmol_h,
        vapor_molecular_weight,
        vapor_density_kg_m3,
        relieving_temperature_c,
        relieving_pressure_pa,
    )
