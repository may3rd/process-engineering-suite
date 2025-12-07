from __future__ import annotations

from network_hydraulic.calculators.elevation import ElevationCalculator
from network_hydraulic.calculators.fittings import FittingLossCalculator
from network_hydraulic.calculators.hydraulics import FrictionCalculator
from network_hydraulic.calculators.normalization import NormalizedLossCalculator
from network_hydraulic.models.components import ControlValve
from network_hydraulic.models.fluid import Fluid
from network_hydraulic.models.pipe_section import Fitting, PipeSection


def _fluid() -> Fluid:
    return Fluid(
        name="water",
        phase="liquid",
        density=1000.0,
        molecular_weight=None,
        z_factor=None,
        specific_heat_ratio=None,
        viscosity=1.0e-3,
        standard_flow_rate=None,
        vapor_pressure=None,
        critical_pressure=None,
    )


def _section_with_valve() -> PipeSection:
    valve = ControlValve(tag="CV-1", cv=10.0, cg=None, pressure_drop=1000.0, C1=10.0)
    return PipeSection(
        id="sec",
        schedule="40",
        roughness=4.6e-5,
        length=20.0,
        elevation_change=2.0,
        fitting_type="LR",
        fittings=[Fitting("elbow_90", 2)],
        fitting_K=None,
        pipe_length_K=None,
        user_K=None,
        piping_and_fitting_safety_factor=None,
        total_K=None,
        user_specified_fixed_loss=None,
        pipe_NPD=None,
        pipe_diameter=0.1,
        inlet_diameter=0.1,
        outlet_diameter=0.1,
        erosional_constant=None,
        mach_number=None,
        boundary_pressure=None,
        control_valve=valve,
        orifice=None,
    )


def test_pipeline_losses_skipped_when_control_valve_present():
    fluid = _fluid()
    section = _section_with_valve()
    section.temperature = 300.0
    section.pressure = 150_000.0
    section.mass_flow_rate = 1.0

    FittingLossCalculator(fluid=fluid).calculate(section)
    assert section.fitting_K == 0.0

    FrictionCalculator(fluid=fluid).calculate(section)
    pd = section.calculation_output.pressure_drop
    assert section.pipe_length_K == 0.0
    assert pd.pipe_and_fittings == 0.0

    ElevationCalculator(fluid=fluid).calculate(section)
    assert pd.elevation_change == 0.0

    NormalizedLossCalculator().calculate(section)
    assert pd.normalized_friction_loss is None
