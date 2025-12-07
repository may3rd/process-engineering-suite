import pytest
from unittest.mock import patch

from network_hydraulic.calculators.elevation import ElevationCalculator
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


def make_section(**overrides):
    base = dict(
        id="sec",
        schedule="40",
        roughness=1e-4,
        length=100.0,
        elevation_change=0.0,
        fitting_type="SCRD",
        fittings=[],
        fitting_K=None,
        pipe_length_K=None,
        user_K=None,
        piping_and_fitting_safety_factor=None,
        total_K=None,
        user_specified_fixed_loss=None,
        pipe_NPD=None,
        pipe_diameter=0.15,
        inlet_diameter=0.15,
        outlet_diameter=0.15,
        erosional_constant=None,
        mach_number=None,
        boundary_pressure=None,
        control_valve=None,
        orifice=None,
        temperature=298.0,
        pressure=101325.0,
    )
    base.update(overrides)
    return PipeSection(**base)


@pytest.mark.parametrize(
    "gravity, expected_error_msg",
    [
        (0, "gravity must be positive"),
        (-9.81, "gravity must be positive"),
    ],
)
def test_elevation_calculator_raises_on_invalid_gravity(gravity, expected_error_msg):
    """Test that ElevationCalculator raises ValueError for non-positive gravity."""
    fluid = make_fluid()
    with pytest.raises(ValueError, match=expected_error_msg):
        ElevationCalculator(fluid=fluid, gravity=gravity)


@pytest.mark.parametrize(
    "temp, pressure, expected_error_msg",
    [
        (0, 101325.0, "section.temperature must be set and positive for elevation calculations"),
        (-10, 101325.0, "section.temperature must be set and positive for elevation calculations"),
        (298.0, 0, "section.pressure must be set and positive for elevation calculations"),
        (298.0, -1, "section.pressure must be set and positive for elevation calculations"),
    ],
)
def test_elevation_calculator_raises_on_invalid_section_conditions(
    temp, pressure, expected_error_msg
):
    """Test that ElevationCalculator raises ValueError for non-positive temperature or pressure."""
    fluid = make_fluid()
    section = make_section(temperature=temp, pressure=pressure)
    calculator = ElevationCalculator(fluid=fluid)
    with pytest.raises(ValueError, match=expected_error_msg):
        calculator.calculate(section)


def test_elevation_calculator_raises_on_non_positive_fluid_density():
    """Test that ElevationCalculator raises ValueError for non-positive fluid density."""
    fluid = make_fluid()
    section = make_section()
    fluid.density = 0.0
    calculator = ElevationCalculator(fluid=fluid)
    with pytest.raises(ValueError, match="density must be positive"):
        calculator.calculate(section)
