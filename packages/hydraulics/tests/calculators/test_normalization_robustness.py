import pytest

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
        fitting_K=1.0,
        pipe_length_K=2.0,
        user_K=None,
        piping_and_fitting_safety_factor=None,
        total_K=3.0,
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
    section = PipeSection(**base)
    section.calculation_output.pressure_drop.pipe_and_fittings = 6000.0
    return section


@pytest.mark.parametrize(
    "length, pipe_k, friction_drop, total_k",
    [
        (0, 2.0, 6000.0, 3.0),
        (-1.0, 2.0, 6000.0, 3.0),
        (50.0, 0, 6000.0, 1.0),
        (50.0, -1.0, 6000.0, 0.0),
        (50.0, 2.0, None, 3.0),
        (50.0, 2.0, 6000.0, 0),
        (50.0, 2.0, 6000.0, -1.0),
    ],
)
def test_normalized_loss_is_none_for_invalid_inputs(
    length, pipe_k, friction_drop, total_k
):
    """Test that normalized_friction_loss is None when inputs are invalid."""
    section = make_section()
    section.length = length
    section.pipe_length_K = pipe_k
    section.calculation_output.pressure_drop.pipe_and_fittings = friction_drop
    if total_k is not None:
        section.fitting_K = total_k - pipe_k

    calc = NormalizedLossCalculator()
    calc.calculate(section)
    
    assert section.calculation_output.pressure_drop.normalized_friction_loss is None
