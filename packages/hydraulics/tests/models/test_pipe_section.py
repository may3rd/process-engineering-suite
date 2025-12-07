import pytest

from network_hydraulic.models.pipe_section import PipeSection, Fitting
from network_hydraulic.models.components import ControlValve, Orifice
from network_hydraulic.models.fluid import Fluid


def make_pipe_section(**overrides) -> PipeSection:
    defaults = dict(
        id="sec-1",
        schedule="40",
        roughness=1e-4,
        length=10.0,
        elevation_change=0.0,
        fitting_type="LR",
        fittings=[],
        fitting_K=None,
        pipe_length_K=None,
        user_K=None,
        piping_and_fitting_safety_factor=1.0,
        total_K=None,
        user_specified_fixed_loss=None,
        pipe_NPD=None,
        pipe_diameter=0.1,
        inlet_diameter=0.1,
        outlet_diameter=0.1,
        erosional_constant=100.0,
        mach_number=None,
        boundary_pressure=None,
        direction=None,
        inlet_diameter_specified=False,
        outlet_diameter_specified=False,
        control_valve=None,
        orifice=None,
        mass_flow_rate=1.0, # Add a default mass_flow_rate for testing
        temperature=300.0,
        pressure=101325.0,
    )
    defaults.update(overrides)
    return PipeSection(**defaults)


def make_fluid(**overrides) -> Fluid:
    defaults = dict(
        name="test",
        phase="liquid",
        density=1000.0,
        molecular_weight=18.0,
        z_factor=1.0,
        specific_heat_ratio=1.0,
        viscosity=1e-3,
        standard_flow_rate=None,
        vapor_pressure=None,
        critical_pressure=None,
    )
    defaults.update(overrides)
    return Fluid(**defaults)


def test_pipe_section_post_init_valid_inputs():
    section = make_pipe_section()
    assert section.id == "sec-1"
    assert section.roughness == 1e-4
    assert section.length == 10.0


def test_pipe_section_post_init_raises_for_empty_id():
    with pytest.raises(ValueError, match="PipeSection id must be a non-empty string"):
        make_pipe_section(id="")


def test_pipe_section_post_init_raises_for_negative_roughness():
    with pytest.raises(ValueError, match="PipeSection roughness must be non-negative"):
        make_pipe_section(roughness=-1e-4)


def test_pipe_section_post_init_raises_for_negative_length():
    with pytest.raises(ValueError, match="PipeSection length must be non-negative"):
        make_pipe_section(length=-10.0)


def test_pipe_section_post_init_raises_for_non_positive_pipe_diameter():
    with pytest.raises(ValueError, match="PipeSection pipe_diameter must be positive if provided"):
        make_pipe_section(pipe_diameter=0.0)
    with pytest.raises(ValueError, match="PipeSection pipe_diameter must be positive if provided"):
        make_pipe_section(pipe_diameter=-0.1)


def test_pipe_section_post_init_raises_for_non_positive_inlet_diameter():
    with pytest.raises(ValueError, match="PipeSection inlet_diameter must be positive if provided"):
        make_pipe_section(inlet_diameter=0.0)
    with pytest.raises(ValueError, match="PipeSection inlet_diameter must be positive if provided"):
        make_pipe_section(inlet_diameter=-0.1)


def test_pipe_section_post_init_raises_for_non_positive_outlet_diameter():
    with pytest.raises(ValueError, match="PipeSection outlet_diameter must be positive if provided"):
        make_pipe_section(outlet_diameter=0.0)
    with pytest.raises(ValueError, match="PipeSection outlet_diameter must be positive if provided"):
        make_pipe_section(outlet_diameter=-0.1)


def test_pipe_section_post_init_raises_for_non_positive_safety_factor():
    with pytest.raises(ValueError, match="PipeSection piping_and_fitting_safety_factor must be positive if provided"):
        make_pipe_section(piping_and_fitting_safety_factor=-1.0)


def test_pipe_section_post_init_raises_for_non_positive_erosional_constant():
    with pytest.raises(ValueError, match="PipeSection erosional_constant must be positive if provided"):
        make_pipe_section(erosional_constant=0.0)
    with pytest.raises(ValueError, match="PipeSection erosional_constant must be positive if provided"):
        make_pipe_section(erosional_constant=-100.0)


def test_pipe_section_post_init_raises_for_empty_fitting_type():
    with pytest.raises(ValueError, match="PipeSection fitting_type must be a non-empty string"):
        make_pipe_section(fitting_type="")


def test_fitting_post_init_raises_for_unsupported_type():
    with pytest.raises(ValueError, match="Unsupported fitting type 'invalid_type'"):
        Fitting(type="invalid_type", count=1)


def test_fitting_post_init_raises_for_non_positive_count():
    with pytest.raises(ValueError, match="Fitting count must be positive"):
        Fitting(type="elbow_90", count=0)
    with pytest.raises(ValueError, match="Fitting count must be positive"):
        Fitting(type="elbow_90", count=-1)


def test_pipe_section_current_volumetric_flow_rate():
    fluid = make_fluid(density=998.2)
    section = make_pipe_section(mass_flow_rate=5.0, temperature=300.0, pressure=101325.0)
    expected_volumetric_flow_rate = 5.0 / fluid.current_density(section.temperature, section.pressure)
    assert section.current_volumetric_flow_rate(fluid) == pytest.approx(expected_volumetric_flow_rate)

def test_pipe_section_current_volumetric_flow_rate_raises_if_no_mass_flow():
    fluid = make_fluid(density=998.2)
    section = make_pipe_section(mass_flow_rate=None, temperature=300.0, pressure=101325.0)
    with pytest.raises(ValueError, match="mass_flow_rate must be set for the pipe section to calculate volumetric flow rate"):
        section.current_volumetric_flow_rate(fluid)

def test_pipe_section_current_volumetric_flow_rate_raises_if_no_temperature():
    fluid = make_fluid(density=998.2)
    section = make_pipe_section(mass_flow_rate=5.0, temperature=None, pressure=101325.0)
    with pytest.raises(ValueError, match="temperature must be set and positive for the pipe section to calculate volumetric flow rate"):
        section.current_volumetric_flow_rate(fluid)

def test_pipe_section_current_volumetric_flow_rate_raises_for_non_positive_temperature():
    fluid = make_fluid(density=998.2)
    section = make_pipe_section(mass_flow_rate=5.0, temperature=0.0, pressure=101325.0)
    with pytest.raises(ValueError, match="temperature must be set and positive for the pipe section to calculate volumetric flow rate"):
        section.current_volumetric_flow_rate(fluid)

def test_pipe_section_current_volumetric_flow_rate_raises_if_no_pressure():
    fluid = make_fluid(density=998.2)
    section = make_pipe_section(mass_flow_rate=5.0, temperature=300.0, pressure=None)
    with pytest.raises(ValueError, match="pressure must be set and positive for the pipe section to calculate volumetric flow rate"):
        section.current_volumetric_flow_rate(fluid)

def test_pipe_section_current_volumetric_flow_rate_raises_for_non_positive_pressure():
    fluid = make_fluid(density=998.2)
    section = make_pipe_section(mass_flow_rate=5.0, temperature=300.0, pressure=0.0)
    with pytest.raises(ValueError, match="pressure must be set and positive for the pipe section to calculate volumetric flow rate"):
        section.current_volumetric_flow_rate(fluid)

def test_pipe_section_current_volumetric_flow_rate_raises_if_zero_density():
    fluid = make_fluid(density=1.0) # Create a valid fluid first
    section = make_pipe_section(mass_flow_rate=5.0, temperature=300.0, pressure=101325.0)
    fluid.density = 0.0 # Then set density to 0.0 for the test
    with pytest.raises(ValueError, match="density must be positive to determine flow parameters"):
        section.current_volumetric_flow_rate(fluid)


def test_pipe_section_elevation_not_exceed_length():
    with pytest.raises(ValueError, match="PipeSection 'sec-1' elevation_change magnitude \\(20.0\\) cannot exceed length \\(10.0\\)"):
        make_pipe_section(elevation_change=20.0, length=10.0)
