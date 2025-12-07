from __future__ import annotations

import pytest

from pathlib import Path

from network_hydraulic.io.loader import ConfigurationLoader
from network_hydraulic.optimizer.system_optimizer import NetworkSystemOptimizer
from network_hydraulic.solver.network_system_solver import NetworkSystemSolver


def _system_config() -> dict:
    fluid = {
        "name": "water",
        "phase": "liquid",
        "density": 1000.0,
        "viscosity": 1e-3,
    }
    base_section = {
        "schedule": "40",
        "roughness": 1e-5,
        "length": 0.0,
        "elevation_change": 0.0,
        "fitting_type": "LR",
        "fittings": [],
        "pipe_diameter": 0.1,
        "inlet_diameter": 0.1,
        "outlet_diameter": 0.1,
    }
    supply_section = {
        **base_section,
        "id": "supply-section",
        "user_specified_fixed_loss": 5_000.0,
        "from_node_id": "node-source",
        "to_node_id": "node-junction",
    }
    branch_section = {
        **base_section,
        "id": "branch-section",
        "user_specified_fixed_loss": 500.0,
        "from_node_id": "node-junction",
        "to_node_id": "node-leaf",
    }
    return {
        "networks": [
            {
                "id": "supply",
                "name": "Supply",
                "direction": "forward",
                "mass_flow_rate": 1.0,
                "boundary_temperature": 300.0,
                "boundary_pressure": 101_325.0,
                "fluid": fluid,
                "sections": [supply_section],
            },
            {
                "id": "branch",
                "name": "Branch",
                "direction": "forward",
                "mass_flow_rate": 0.5,
                "boundary_temperature": 300.0,
                "boundary_pressure": 80_000.0,
                "fluid": fluid,
                "sections": [branch_section],
            },
        ],
        "links": [
            {
                "members": [
                    {"network": "supply", "node": "node-junction"},
                    {"network": "branch", "node": "node-junction"},
                ]
            }
        ],
    }


def test_network_system_solver_transfers_shared_pressures():
    loader = ConfigurationLoader(raw=_system_config())
    system = loader.build_network_system()
    solver = NetworkSystemSolver(max_iterations=4, tolerance=0.1)

    result = solver.run(system)
    assert len(result.bundles) == 2
    supply_bundle = next(bundle for bundle in result.bundles if bundle.bundle_id == "supply")
    branch_bundle = next(bundle for bundle in result.bundles if bundle.bundle_id == "branch")
    supply_pressure = supply_bundle.result.node_pressures["node-junction"]
    branch_pressure = branch_bundle.result.node_pressures["node-junction"]

    assert supply_pressure is not None
    assert branch_pressure is not None
    assert branch_pressure == pytest.approx(supply_pressure, rel=1e-6)
    canonical_id = next(b for b in system.bundles if b.id == "supply").node_mapping["node-junction"]
    assert result.shared_node_pressures[canonical_id] == pytest.approx(supply_pressure, rel=1e-6)


def test_system_solver_respects_global_settings_fixture():
    loader = ConfigurationLoader.from_yaml_path(Path("tests/fixtures/networks/system_solver_only.yaml"))
    system = loader.build_network_system()
    solver = NetworkSystemSolver(
        max_iterations=system.solver_settings.max_iterations or 4,
        tolerance=system.solver_settings.tolerance or 1.0,
        relaxation=system.solver_settings.relaxation or 0.7,
    )
    result = solver.run(system)
    assert len(result.bundles) == 2


def test_system_optimizer_fixture_runs():
    loader = ConfigurationLoader.from_yaml_path(Path("tests/fixtures/networks/system_optimizer.yaml"))
    system = loader.build_network_system()
    optimizer = NetworkSystemOptimizer(system.optimizer_settings)
    optimizer.run(system)
    solver = NetworkSystemSolver()
    result = solver.run(system)
    assert len(result.bundles) == 2
