from __future__ import annotations

from network_hydraulic.models.components import ControlValve
from network_hydraulic.models.fluid import Fluid
from network_hydraulic.models.network import Network
from network_hydraulic.models.pipe_section import PipeSection
from network_hydraulic.optimizer import optimize_control_valves


def _build_simple_network() -> Network:
    fluid = Fluid(
        name="gas",
        phase="gas",
        density=1.2,
        molecular_weight=29.0,
        z_factor=0.98,
        specific_heat_ratio=1.33,
        viscosity=1.85e-5,
        standard_flow_rate=None,
        vapor_pressure=None,
        critical_pressure=None,
    )
    cv = ControlValve(
        tag="CV-1",
        cv=100.0,
        cg=None,
        pressure_drop=None,
        C1=None,
        adjustable=True,
    )
    section = PipeSection(
        id="cv-section",
        schedule="40",
        roughness=1e-5,
        length=10.0,
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
        control_valve=cv,
        orifice=None,
    )
    return Network(
        name="optimizer",
        description="Optimize valve example",
        fluid=fluid,
        boundary_temperature=300.0,
        boundary_pressure=200000.0,
        downstream_pressure=150000.0,
        direction="forward",
        mass_flow_rate=1.0,
        sections=[section],
    )


def test_optimize_control_valves_brings_downstream_pressure_within_tolerance():
    network = _build_simple_network()
    baseline_diff = abs(network.downstream_pressure - network.boundary_pressure)
    error = optimize_control_valves(network)
    assert error is not None
    assert error <= baseline_diff
