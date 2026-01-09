from __future__ import annotations

from langchain_core.tools import tool

from apps.api.app.services.process_design_agents.sizing_tools.interface import equipment_sizing


@tool
def size_knockout_drum_basic(
    vapor_flow_kmol_h: float,
    liquid_content_percent: float,
    design_pressure_pa: float = 601325.0,
    design_temperature_c: float = 40.0,
    residence_time_seconds: float = 180.0,
    vapor_mw: float = 30.0,
    liquid_density_kg_m3: float = 800.0,
) -> str:
    """
    Preliminary knockout drum sizing to separate entrained liquids from vapor streams. Pressure is in absolute Pascals.
    """
    return equipment_sizing(
        "knockout_drum_sizing",
        vapor_flow_kmol_h,
        liquid_content_percent,
        design_pressure_pa,
        design_temperature_c,
        residence_time_seconds,
        vapor_mw,
        liquid_density_kg_m3,
    )


@tool
def size_filter_vessel_basic(
    fluid_flow_m3_h: float,
    filtration_type: str = "cartridge",
    design_pressure_pa: float = 401325.0,
    design_temperature_c: float = 40.0,
    filter_media_permeability_m_s: float = 0.002,
) -> str:
    """
    Preliminary filter vessel sizing estimating media area and vessel envelope. Pressure is in absolute Pascals.
    """
    return equipment_sizing(
        "filter_vessel_sizing",
        fluid_flow_m3_h,
        filtration_type,
        design_pressure_pa,
        design_temperature_c,
        filter_media_permeability_m_s,
    )


@tool
def size_dryer_vessel_basic(
    gas_flow_kmol_h: float,
    inlet_moisture_ppm: float,
    outlet_moisture_ppm: float,
    design_pressure_pa: float = 401325.0,
    regeneration_type: str = "heated_air",
) -> str:
    """
    Preliminary dryer vessel sizing for adsorption dryers, including bed volume and regeneration duty. Pressure is in absolute Pascals.
    """
    return equipment_sizing(
        "dryer_vessel_sizing",
        gas_flow_kmol_h,
        inlet_moisture_ppm,
        outlet_moisture_ppm,
        design_pressure_pa,
        regeneration_type,
    )
