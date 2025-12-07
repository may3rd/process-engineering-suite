import pytest

from network_hydraulic.calculators.hydraulics import FrictionCalculator
from network_hydraulic.models.fluid import Fluid
from network_hydraulic.models.pipe_section import PipeSection


def make_fluid(**overrides) -> Fluid:
    base = dict(
        name="water",
        phase="liquid",
        density=998.2,
        molecular_weight=18.0,
        z_factor=1.0,
        specific_heat_ratio=1.0,
        viscosity=1.0e-3,
        standard_flow_rate=None,
        vapor_pressure=None,
        critical_pressure=None,
    )
    base.update(overrides)
    return Fluid(**base)


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
        mass_flow_rate=1.0,
        temperature=298.15,
        pressure=101325.0,
    )
    base.update(overrides)
    return PipeSection(**base)


@pytest.mark.parametrize(
    "temp, pressure, expected_error_msg",
    [
        (0, 101325.0, "section.temperature must be set and positive for friction calculations"),
        (-10, 101325.0, "section.temperature must be set and positive for friction calculations"),
        (298.15, 0, "section.pressure must be set and positive for friction calculations"),
        (298.15, -1, "section.pressure must be set and positive for friction calculations"),
    ],
)
def test_friction_calculator_raises_on_invalid_conditions(
    temp, pressure, expected_error_msg
):
    """Test that FrictionCalculator raises ValueError for non-positive temperature or pressure."""
    fluid = make_fluid()
    section = make_section(temperature=temp, pressure=pressure)
    calculator = FrictionCalculator(fluid=fluid)
    with pytest.raises(ValueError, match=expected_error_msg):
        calculator.calculate(section)


def test_friction_calculator_raises_on_non_positive_viscosity():
    """Test that FrictionCalculator raises ValueError for non-positive viscosity."""
    with pytest.raises(ValueError, match="fluid.viscosity must be positive"):
        make_fluid(viscosity=0)

