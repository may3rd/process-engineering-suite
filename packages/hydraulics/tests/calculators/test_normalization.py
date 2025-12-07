from network_hydraulic.calculators.normalization import NormalizedLossCalculator
from network_hydraulic.models.pipe_section import PipeSection


def make_section(**overrides) -> PipeSection:
    base = dict(
        id="sec",
        schedule="40",
        roughness=4.6e-5,
        length=50.0,
        elevation_change=0.0,
        fitting_type="LR",
        fittings=[],
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
        control_valve=None,
        orifice=None,
    )
    base.update(overrides)
    return PipeSection(**base)


def test_missing_friction_keeps_none():
    section = make_section()
    section.pipe_length_K = None
    calc = NormalizedLossCalculator()
    calc.calculate(section)
    assert section.calculation_output.pressure_drop.normalized_friction_loss is None
