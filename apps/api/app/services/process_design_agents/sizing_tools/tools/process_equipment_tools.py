from __future__ import annotations

from langchain_core.tools import tool

from apps.api.app.services.process_design_agents.sizing_tools.interface import equipment_sizing


@tool
def size_reactor_vessel_basic(
    feed_flow_kg_h: float,
    residence_time_minutes: float,
    mixture_density_kg_m3: float,
    reaction_exothermic: bool = False,
    heat_removal_kw: float = 0.0,
    design_pressure_pa: float = 601325.0,
    design_temperature_c: float = 60.0,
) -> str:
    """
    Preliminary reactor vessel sizing based on holdup, agitation, and heat removal needs. Pressure is in absolute Pascals.
    """
    return equipment_sizing(
        "reactor_vessel_sizing",
        feed_flow_kg_h,
        residence_time_minutes,
        mixture_density_kg_m3,
        reaction_exothermic,
        heat_removal_kw,
        design_pressure_pa,
        design_temperature_c,
    )
