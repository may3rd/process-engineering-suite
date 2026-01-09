from __future__ import annotations

from langchain_core.tools import tool

from apps.api.app.services.process_design_agents.sizing_tools.interface import equipment_sizing


@tool
def size_pump_basic(
    mass_flow_kg_h: float,
    inlet_pressure_pa: float,
    outlet_pressure_pa: float,
    fluid_density_kg_m3: float,
    pump_efficiency: float = 0.75,
    motor_efficiency: float = 0.90,
) -> str:
    """
    Preliminary sizing for pumps, reporting head, power, and pump type selection. Pressures are in absolute Pascals.
    """
    return equipment_sizing(
        "pump_sizing",
        mass_flow_kg_h,
        inlet_pressure_pa,
        outlet_pressure_pa,
        fluid_density_kg_m3,
        pump_efficiency,
        motor_efficiency,
    )


@tool
def size_compressor_basic(
    inlet_flow_m3_min: float,
    inlet_pressure_pa: float,
    discharge_pressure_pa: float,
    gas_type: str = "air",
    efficiency_polytropic: float = 0.80,
    intercooling: bool = True,
) -> str:
    """
    Preliminary sizing for compressors, returning staging, discharge conditions, and power. Pressures are in absolute Pascals.
    """
    return equipment_sizing(
        "compressor_sizing",
        inlet_flow_m3_min,
        inlet_pressure_pa,
        discharge_pressure_pa,
        gas_type,
        efficiency_polytropic,
        intercooling,
    )
