import pytest

from network_hydraulic.models.network import Network
from network_hydraulic.models.fluid import Fluid


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


def make_network(**overrides) -> Network:
    fluid = overrides.get("fluid", make_fluid())
    overrides = overrides.copy()
    overrides.pop("fluid", None)
    defaults = dict(
        name="test_network",
        description=None,
        fluid=fluid,
        boundary_temperature=300.0,
        upstream_pressure=101325.0,
        downstream_pressure=None,
        boundary_pressure=None,
        direction="auto",
        mass_flow_rate=10.0,
        gas_flow_model=None,
        sections=[],
        design_margin=None,
    )
    if "boundary_pressure" in overrides and "upstream_pressure" not in overrides:
        overrides["upstream_pressure"] = overrides["boundary_pressure"]
    defaults.update(overrides)
    return Network(**defaults)


def test_network_post_init_valid_inputs():
    network = make_network()
    assert network.direction == "forward"
    assert network.gas_flow_model is None
    assert network.design_margin is None


def test_network_post_init_normalizes_direction():
    network = make_network(direction="FORWARD ")
    assert network.direction == "forward"


def test_network_auto_direction_backward_with_only_downstream():
    network = make_network(upstream_pressure=None, boundary_pressure=None, downstream_pressure=80000.0, direction="auto")
    assert network.direction == "backward"

def test_network_post_init_normalizes_gas_flow_model():
    network = make_network(gas_flow_model=" ADIABATIC")
    assert network.gas_flow_model == "adiabatic"


def test_network_post_init_raises_for_invalid_direction():
    with pytest.raises(ValueError, match="Network direction 'invalid' must be 'auto', 'forward', or 'backward'"):
        make_network(direction="invalid")


def test_network_post_init_raises_for_invalid_gas_flow_model():
    with pytest.raises(ValueError, match="Gas flow model 'unknown' must be 'isothermal' or 'adiabatic'"):
        make_network(gas_flow_model="unknown")


def test_network_post_init_raises_for_non_positive_boundary_conditions():
    with pytest.raises(ValueError, match="network.boundary_temperature must be positive"):
        make_network(boundary_temperature=0.0)
    with pytest.raises(ValueError, match="network.boundary_temperature must be positive"):
        make_network(boundary_temperature=-10.0)
    with pytest.raises(ValueError, match="network.upstream_pressure must be positive"):
        make_network(boundary_pressure=0.0)
    with pytest.raises(ValueError, match="network.upstream_pressure must be positive"):
        make_network(boundary_pressure=-10.0)


def test_network_defaults_gas_flow_model_for_gas_fluid():
    gas_fluid = make_fluid(phase="gas")
    network = make_network(fluid=gas_fluid, gas_flow_model=None)
    assert network.gas_flow_model == "isothermal"


def test_network_post_init_raises_for_negative_design_margin():
    with pytest.raises(ValueError, match="Network design_margin must be non-negative"):
        make_network(design_margin=-5.0)


def test_network_post_init_raises_for_missing_flow_rates():
    with pytest.raises(ValueError, match="mass_flow_rate must be provided for the network"):
        make_network(mass_flow_rate=None)


def test_network_post_init_raises_for_negative_mass_flow_rate():
    with pytest.raises(ValueError, match="Network mass_flow_rate cannot be negative"):
        make_network(mass_flow_rate=-1.0)


def test_current_volumetric_flow_rate_calculates_from_mass():
    fluid = make_fluid(density=998.2)
    network = make_network(fluid=fluid, mass_flow_rate=5.0, boundary_temperature=300.0, upstream_pressure=101325.0)
    expected = 5.0 / fluid.current_density(network.boundary_temperature, network.upstream_pressure)
    assert network.current_volumetric_flow_rate() == pytest.approx(expected)

def test_current_volumetric_flow_rate_raises_if_no_mass_flow():
    network = make_network(mass_flow_rate=1.0) # Create a valid network first
    network.mass_flow_rate = None # Then set mass_flow_rate to None for the test
    with pytest.raises(ValueError, match="mass_flow_rate must be set to calculate volumetric flow rate"):
        network.current_volumetric_flow_rate()

def test_current_volumetric_flow_rate_raises_if_zero_density():
    fluid = make_fluid(density=1.0) # Create a valid fluid first
    network = make_network(fluid=fluid, mass_flow_rate=5.0, boundary_temperature=300.0, upstream_pressure=101325.0)
    fluid.density = 0.0 # Then set density to 0.0 for the test
    with pytest.raises(ValueError, match="density must be positive to determine flow parameters"):
        network.current_volumetric_flow_rate()
