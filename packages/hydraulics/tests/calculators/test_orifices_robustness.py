import pytest
from unittest.mock import patch

from network_hydraulic.calculators.orifices import OrificeCalculator
from network_hydraulic.models.components import Orifice
from network_hydraulic.models.fluid import Fluid
from network_hydraulic.models.pipe_section import PipeSection


def make_section(orifice: Orifice, **overrides) -> PipeSection:
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
        control_valve=None,
        orifice=orifice,
        mass_flow_rate=7.7,
        temperature=293.15,
        pressure=200_000.0,
    )
    base.update(overrides)
    return PipeSection(**base)


def reference_fluid(**overrides) -> Fluid:
    base = dict(
        name="water",
        phase="liquid",
        density=999.1,
        molecular_weight=18.0,
        z_factor=1.0,
        specific_heat_ratio=1.33,
        viscosity=0.0011,
        standard_flow_rate=None,
        vapor_pressure=None,
        critical_pressure=None,
    )
    base.update(overrides)
    return Fluid(**base)


def test_orifice_raises_with_no_spec():
    """Test that OrificeCalculator raises ValueError if no geometry or drop is specified."""
    fluid = reference_fluid()
    orifice = Orifice(tag="FE-no-spec", d_over_D_ratio=None, pressure_drop=None)
    section = make_section(orifice)
    calc = OrificeCalculator(fluid=fluid)
    with pytest.raises(
        ValueError,
        match="Orifice requires d_over_D_ratio, orifice_diameter, or pressure_drop to be specified",
    ):
        calc.calculate(section)


@patch(
    "network_hydraulic.calculators.orifices.differential_pressure_meter_solver",
    side_effect=Exception("Solver failed"),
)
def test_orifice_handles_solver_failure_gracefully(mock_solver):
    """Test that OrificeCalculator handles exceptions from the solver."""
    fluid = reference_fluid()
    orifice = Orifice(tag="FE-solver-fail", d_over_D_ratio=0.5, pressure_drop=None)
    section = make_section(orifice)
    section.result_summary.inlet.pressure = 200_000.0
    calc = OrificeCalculator(fluid=fluid)
    calc.calculate(section)

    assert orifice.pressure_drop == 0.0
    assert "Failed to solve orifice drop: Solver failed" in orifice.calculation_note
    assert section.calculation_output.pressure_drop.orifice_pressure_drop == 0.0


@pytest.mark.parametrize(
    "mass_flow, temp, pressure, expected_error_msg",
    [
        (0, 293.15, 200_000.0, "Mass flow rate is required for orifice calculations"),
        (-1.0, 293.15, 200_000.0, "Mass flow rate is required for orifice calculations"),
        (7.7, 0, 200_000.0, "section.temperature must be set and positive for orifice calculations"),
        (7.7, -1.0, 200_000.0, "section.temperature must be set and positive for orifice calculations"),
        (7.7, 293.15, 0, "section.pressure must be set and positive for orifice calculations"),
        (7.7, 293.15, -1.0, "section.pressure must be set and positive for orifice calculations"),
    ],
)
def test_orifice_calculator_raises_on_invalid_conditions(
    mass_flow, temp, pressure, expected_error_msg
):
    """Test that OrificeCalculator raises ValueError for non-positive inputs."""
    fluid = reference_fluid()
    orifice = Orifice(tag="FE-invalid", d_over_D_ratio=0.5, pressure_drop=None)
    section = make_section(orifice, mass_flow_rate=mass_flow, temperature=temp, pressure=pressure)
    section.result_summary.inlet.pressure = pressure
    calc = OrificeCalculator(fluid=fluid)
    with pytest.raises(ValueError, match=expected_error_msg):
        calc.calculate(section)


@pytest.mark.parametrize(
    "density, viscosity, k, expected_error_msg",
    [
        (0, 0.0011, 1.33, "fluid.density must be provided and positive for liquids"),
        (-1.0, 0.0011, 1.33, "fluid.density must be provided and positive for liquids"),
        (999.1, 0, 1.33, "fluid.viscosity must be positive"),
        (999.1, -0.1, 1.33, "fluid.viscosity must be positive"),
        (999.1, 0.0011, 0, None),  # isentropic_exponent defaults to 1.4
        (999.1, 0.0011, -1.0, None), # isentropic_exponent defaults to 1.4
    ],
)
def test_orifice_calculator_raises_on_invalid_fluid_properties(
    density, viscosity, k, expected_error_msg
):
    """Test that OrificeCalculator raises ValueError for non-positive fluid properties."""
    if expected_error_msg and "fluid" in expected_error_msg:
        with pytest.raises(ValueError, match=expected_error_msg):
            reference_fluid(density=density, viscosity=viscosity, specific_heat_ratio=k)
        return

    fluid = reference_fluid(density=density, viscosity=viscosity, specific_heat_ratio=k)
    orifice = Orifice(tag="FE-invalid-fluid", d_over_D_ratio=0.5, pressure_drop=None)
    section = make_section(orifice)
    section.result_summary.inlet.pressure = 200_000.0
    calc = OrificeCalculator(fluid=fluid)
    if expected_error_msg:
        with pytest.raises(ValueError, match=expected_error_msg):
            calc.calculate(section)
    else:
        # Should not raise, as isentropic_exponent has a default
        calc.calculate(section)
        assert orifice.pressure_drop is not None


def test_orifice_sets_zero_drop_when_mass_flow_missing():
    fluid = reference_fluid()
    orifice = Orifice(tag="FE-no-flow", d_over_D_ratio=0.5, pressure_drop=None)
    section = make_section(orifice, mass_flow_rate=None)
    section.result_summary.inlet.pressure = 200_000.0
    calc = OrificeCalculator(fluid=fluid)
    calc.calculate(section)

    assert orifice.pressure_drop == 0.0
    assert (
        orifice.calculation_note
        and "mass_flow_rate unavailable" in orifice.calculation_note
    )
    assert section.calculation_output.pressure_drop.orifice_pressure_drop == 0.0


def test_orifice_raises_if_pipe_diameter_is_missing_when_needed():
    """Test that a ValueError is raised if pipe diameter is not available when required."""
    fluid = reference_fluid()
    orifice = Orifice(tag="FE-no-pipe-d", d_over_D_ratio=0.5, pressure_drop=None)
    section = make_section(orifice, pipe_diameter=None)
    calc = OrificeCalculator(fluid=fluid, default_pipe_diameter=None)
    with pytest.raises(ValueError, match="Pipe diameter is required for orifice calculations"):
        calc.calculate(section)
