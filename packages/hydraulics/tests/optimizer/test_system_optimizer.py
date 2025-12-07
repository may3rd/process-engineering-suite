from __future__ import annotations

from network_hydraulic.models.components import ControlValve
from network_hydraulic.models.fluid import Fluid
from network_hydraulic.models.network import Network
from network_hydraulic.models.network_system import (
    NetworkBundle,
    NetworkSystem,
    NetworkSystemSettings,
    NetworkOptimizerSettings,
    SystemOptimizerSettings,
)
from network_hydraulic.models.pipe_section import PipeSection
from network_hydraulic.optimizer.system_optimizer import NetworkSystemOptimizer


def _bundle_with_adjustable_valve(bundle_id: str = "net") -> NetworkBundle:
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
    valve = ControlValve(
        tag="CV-2",
        cv=50.0,
        cg=None,
        pressure_drop=None,
        C1=None,
        adjustable=True,
    )
    section = PipeSection(
        id="valve-sec",
        schedule="40",
        roughness=1e-5,
        length=5.0,
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
        control_valve=valve,
        orifice=None,
    )
    network = Network(
        name=bundle_id,
        description=None,
        fluid=fluid,
        boundary_temperature=300.0,
        boundary_pressure=220_000.0,
        downstream_pressure=150_000.0,
        direction="forward",
        mass_flow_rate=1.5,
        sections=[section],
    )
    network.rebuild_topology()
    return NetworkBundle(id=bundle_id, network=network, node_mapping={})


def test_network_system_optimizer_updates_adjustable_valves():
    bundle = _bundle_with_adjustable_valve()
    system = NetworkSystem(
        bundles=[bundle],
        shared_nodes={},
        solver_settings=NetworkSystemSettings(),
        optimizer_settings=SystemOptimizerSettings(
            enabled=True,
            networks={
                bundle.id: NetworkOptimizerSettings(network_id=bundle.id),
            },
        ),
    )
    optimizer = NetworkSystemOptimizer(system.optimizer_settings)
    optimizer.run(system)
    valve = bundle.network.sections[0].control_valve
    assert valve is not None
    assert valve.pressure_drop is not None
