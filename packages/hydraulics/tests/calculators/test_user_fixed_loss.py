from __future__ import annotations

from network_hydraulic.calculators.user_fixed_loss import UserFixedLossCalculator
from network_hydraulic.models.pipe_section import Fitting, PipeSection


def build_section() -> PipeSection:
    return PipeSection(
        id="lossy",
        schedule="40",
        roughness=1e-4,
        length=10.0,
        elevation_change=0.0,
        fitting_type="SCRD",
        fittings=[Fitting("pipe_exit", 1)],
        fitting_K=None,
        pipe_length_K=None,
        user_K=None,
        piping_and_fitting_safety_factor=None,
        total_K=None,
        user_specified_fixed_loss=None,
        pipe_NPD=4.0,
        pipe_diameter=0.1,
        inlet_diameter=0.1,
        outlet_diameter=0.1,
        erosional_constant=None,
        mach_number=None,
        boundary_pressure=None,
        control_valve=None,
        orifice=None,
    )


def test_user_loss_applies_with_pipeline():
    section = build_section()
    section.user_specified_fixed_loss = 2500.0
    calc = UserFixedLossCalculator()
    calc.calculate(section)
    assert section.calculation_output.pressure_drop.user_specified_fixed_loss == 2500.0
    assert section.calculation_output.pressure_drop.total_segment_loss == 2500.0
