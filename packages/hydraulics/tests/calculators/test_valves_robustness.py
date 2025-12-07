import pytest
from unittest.mock import patch, MagicMock

from network_hydraulic.calculators.valves import ControlValveCalculator
from network_hydraulic.models.components import ControlValve
from network_hydraulic.models.fluid import Fluid
from network_hydraulic.models.pipe_section import PipeSection


def make_section(control_valve: ControlValve, **overrides) -> PipeSection:
    base = dict(
        id="sec",
        schedule="40",
        roughness=1e-4,
        length=10.0,
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
        control_valve=control_valve,
        orifice=None,
        mass_flow_rate=1.0,
        temperature=300.0,
        pressure=680e3,
    )
    base.update(overrides)
    return PipeSection(**base)


def liquid_fluid(**overrides) -> Fluid:
    base = dict(
        name="water",
        phase="liquid",
        density=965.4,
        molecular_weight=18.0,
        z_factor=1.0,
        specific_heat_ratio=1.0,
        viscosity=3.1472e-4,
        standard_flow_rate=None,
        vapor_pressure=70.1e3,
        critical_pressure=22120e3,
    )
    base.update(overrides)
    return Fluid(**base)


def test_valve_raises_if_cv_is_unachievable():
    """Test that the bisection search raises a ValueError for an unachievable Cv."""
    fluid = liquid_fluid()
    # This Cv is impossibly high for the given conditions, forcing the error
    valve = ControlValve(tag="CV-unachievable", cv=1e9, cg=None, pressure_drop=None, C1=None)
    section = make_section(valve)
    calc = ControlValveCalculator(fluid=fluid)
    with pytest.raises(ValueError, match="Specified Cv is outside the achievable range for this valve"):
        calc.calculate(section)


def test_valve_raises_if_pressure_drop_is_excessive():
    """Test that a specified pressure drop exceeding inlet pressure raises a ValueError."""
    fluid = liquid_fluid()
    inlet_pressure = 680e3
    # This drop is greater than the inlet pressure
    valve = ControlValve(
        tag="CV-excessive-drop", cv=None, cg=None, pressure_drop=inlet_pressure + 1, C1=None
    )
    section = make_section(valve, pressure=inlet_pressure)
    calc = ControlValveCalculator(fluid=fluid)
    with pytest.raises(ValueError, match="Specified control valve pressure drop exceeds inlet pressure"):
        calc.calculate(section)


@pytest.mark.parametrize(
    "mass_flow, temp, pressure, cv, expected_error_msg",
    [
        (1.0, 300.0, 680e3, 0, "ControlValve cv must be positive if provided"),
        (1.0, 300.0, 680e3, -1.0, "ControlValve cv must be positive if provided"),
    ],
)
def test_valve_constructor_raises_on_invalid_cv(
    mass_flow, temp, pressure, cv, expected_error_msg
):
    """Test that ControlValve constructor raises ValueError for invalid Cv."""
    with pytest.raises(ValueError, match=expected_error_msg):
        ControlValve(tag="CV-invalid", cv=cv, cg=None, pressure_drop=None, C1=None)


@pytest.mark.parametrize(
    "mass_flow, temp, pressure, cv, expected_error_msg",
    [
        (0, 300.0, 680e3, 100, "Section mass_flow_rate must be positive for control valve calculations"),
        (-1.0, 300.0, 680e3, 100, "Section mass_flow_rate must be positive for control valve calculations"),
        (1.0, 0, 680e3, 100, "Section temperature must be positive for control valve calculations"),
        (1.0, -1.0, 680e3, 100, "Section temperature must be positive for control valve calculations"),
        (1.0, 300.0, 0, 100, "Section pressure must be positive for control valve calculations"),
        (1.0, 300.0, -1.0, 100, "Section pressure must be positive for control valve calculations"),
    ],
)
def test_valve_calculator_raises_on_invalid_conditions(
    mass_flow, temp, pressure, cv, expected_error_msg
):
    """Test that ControlValveCalculator raises ValueError for various non-positive inputs."""
    fluid = liquid_fluid()
    valve = ControlValve(tag="CV-invalid", cv=cv, cg=None, pressure_drop=None, C1=None)
    section = make_section(valve, mass_flow_rate=mass_flow, temperature=temp, pressure=pressure)
    calc = ControlValveCalculator(fluid=fluid)
    with pytest.raises(ValueError, match=expected_error_msg):
        calc.calculate(section)


@patch("network_hydraulic.calculators.valves.ControlValveCalculator._kv_liquid_simplified")
def test_simplified_liquid_calculation_is_used_as_fallback(mock_simplified_calc):
    """Test that the simplified liquid Kv calculation is used when fluid properties are missing."""
    mock_simplified_calc.return_value = 1.0  # Dummy Kv value
    # Fluid is missing vapor_pressure and critical_pressure
    fluid = liquid_fluid(vapor_pressure=None, critical_pressure=None)
    valve = ControlValve(tag="CV-fallback", cv=None, cg=None, pressure_drop=100e3, C1=None)
    section = make_section(valve)

    # Mock the logger to check if the warning is issued
    calc = ControlValveCalculator(fluid=fluid)
    calc.logger = MagicMock()

    calc.calculate(section)

    # Verify that the simplified method was called
    mock_simplified_calc.assert_called_once()

    # Verify that a warning was logged
    calc.logger.warning.assert_called_once()
    assert "Using a simplified Kv calculation" in calc.logger.warning.call_args[0][0]
