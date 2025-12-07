import pytest
import math

from network_hydraulic.calculators.fittings import FittingLossCalculator
from network_hydraulic.models.fluid import Fluid
from network_hydraulic.models.pipe_section import Fitting, PipeSection


def make_fluid(temperature: float = 298.0, pressure: float = 101325.0, **overrides) -> Fluid:
    base = dict(
        name="water",
        phase="liquid",
        density=998.2,
        molecular_weight=18.0,
        z_factor=1.0,
        specific_heat_ratio=1.0,
        viscosity=8.9e-4,
        standard_flow_rate=None,
        vapor_pressure=None,
        critical_pressure=None,
    )
    base.update(overrides)
    return Fluid(**base)


def make_section(
    fittings,
    fitting_type="LR",
    mass_flow_rate: float = 1.0,
    temperature: float = 298.0,
    pressure: float = 101325.0,
    **overrides,
) -> PipeSection:
    base = dict(
        id="sec",
        schedule="40",
        roughness=4.6e-5,
        length=10.0,
        elevation_change=0.0,
        fitting_type=fitting_type,
        fittings=fittings,
        fitting_K=None,
        pipe_length_K=None,
        user_K=None,
        piping_and_fitting_safety_factor=None,
        total_K=None,
        user_specified_fixed_loss=None,
        pipe_NPD=None,
        pipe_diameter=0.15,
        inlet_diameter=0.18,
        outlet_diameter=0.2,
        erosional_constant=None,
        mach_number=None,
        boundary_pressure=None,
        control_valve=None,
        orifice=None,
        mass_flow_rate=mass_flow_rate,
        temperature=temperature,
        pressure=pressure,
    )
    base.update(overrides)
    return PipeSection(**base)


def test_unsupported_fitting_type_raises():
    """Test that an unsupported fitting type raises a ValueError."""
    with pytest.raises(ValueError, match="Unsupported fitting type 'unsupported_fitting'"):
        Fitting("unsupported_fitting", 1)


@pytest.mark.parametrize(
    "mass_flow, temp, pressure, expected_error_msg",
    [
        (0.0, 298.0, 101325.0, "Unable to compute Reynolds number for fittings calculation"),
        (1.0, 0.0, 101325.0, "temperature"),
        (1.0, -10.0, 101325.0, "temperature"),
        (1.0, 298.0, 0.0, "pressure"),
        (1.0, 298.0, -1.0, "pressure"),
    ],
)
def test_fitting_calculator_raises_on_invalid_conditions(
    mass_flow, temp, pressure, expected_error_msg
):
    """Test that FittingLossCalculator raises ValueError for non-positive inputs."""
    fluid = make_fluid()
    fittings = [Fitting("elbow_90", 1)]
    section = make_section(fittings, mass_flow_rate=mass_flow, temperature=temp, pressure=pressure)
    calculator = FittingLossCalculator(fluid=fluid)
    with pytest.raises(ValueError, match=expected_error_msg):
        calculator.calculate(section)


def test_zero_diameter_in_two_k_raises():
    """Test that a zero pipe diameter raises a ValueError from model validation."""
    fittings = [Fitting("elbow_90", 1)]
    with pytest.raises(ValueError, match="PipeSection pipe_diameter must be positive if provided"):
        make_section(fittings, pipe_diameter=0)


def test_zero_viscosity_raises():
    """Test that a zero viscosity raises a ValueError from model validation."""
    with pytest.raises(ValueError, match="fluid.viscosity must be positive"):
        make_fluid(viscosity=0)
