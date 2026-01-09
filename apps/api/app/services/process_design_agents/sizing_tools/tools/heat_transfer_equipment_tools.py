from __future__ import annotations

from langchain_core.tools import tool

from apps.api.app.services.process_design_agents.sizing_tools.interface import equipment_sizing


@tool
def size_heat_exchanger_basic(
    duty_kw: float,
    t_hot_in: float,
    t_hot_out: float,
    t_cold_in: float,
    t_cold_out: float,
    u_estimate: float,
    configuration: str = "1-2",
) -> str:
    """
    Preliminary sizing for a shell-and-tube exchanger using the LMTD method.
    """
    return equipment_sizing(
        "basic_heat_exchanger_sizing",
        duty_kw,
        t_hot_in,
        t_hot_out,
        t_cold_in,
        t_cold_out,
        u_estimate,
        configuration,
    )


@tool
def size_air_cooler_basic(
    duty_kw: float,
    process_fluid_in: float,
    process_fluid_out: float,
    ambient_temperature_c: float,
    design_approach: float,
    fluid_type: str = "hydrocarbon",
) -> str:
    """
    Preliminary sizing for an air-cooled heat exchanger, returning area and fan duty.
    """
    return equipment_sizing(
        "air_cooler_sizing",
        duty_kw,
        process_fluid_in,
        process_fluid_out,
        ambient_temperature_c,
        design_approach,
        fluid_type,
    )


# Backwards compatibility alias.
size_shell_and_tube_heat_exchanger = size_heat_exchanger_basic
