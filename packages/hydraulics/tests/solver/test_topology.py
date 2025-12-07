from __future__ import annotations

from typing import Iterable, List

import pytest

from network_hydraulic.models.fluid import Fluid
from network_hydraulic.models.network import Network
from network_hydraulic.models.pipe_section import Fitting, PipeSection
from network_hydraulic.solver.network_solver import NetworkSolver


def _make_test_fluid() -> Fluid:
    return Fluid(
        name="test_liquid",
        phase="liquid",
        density=1000.0,
        molecular_weight=18.0,
        z_factor=1.0,
        specific_heat_ratio=1.0,
        viscosity=1.0e-3,
        standard_flow_rate=None,
        vapor_pressure=None,
        critical_pressure=None,
    )


def _make_pipeline_section(
    section_id: str,
    start_node: str,
    end_node: str,
) -> PipeSection:
    """Build a minimal section that attaches to custom nodes."""
    section = PipeSection(
        id=section_id,
        schedule="40",
        roughness=1e-5,
        length=10.0,
        elevation_change=0.0,
        fitting_type="LR",
        fittings=[Fitting("pipe_exit", 1)],
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
        from_pipe_id=start_node,
        to_pipe_id=end_node,
    )
    section.start_node_id = start_node
    section.end_node_id = end_node
    return section


def _build_network(sections: Iterable[PipeSection]) -> Network:
    return Network(
        name="digraph-test",
        description="Topology verification",
        fluid=_make_test_fluid(),
        boundary_temperature=300.0,
        boundary_pressure=101325.0,
        mass_flow_rate=1.0,
        sections=list(sections),
    )


def _section_ids(sections: List[PipeSection]) -> List[str]:
    return [section.id for section in sections]


def test_ordered_sections_by_topology_respects_connectivity():
    sections = [
        _make_pipeline_section("branch-b", "node-1", "node-3"),
        _make_pipeline_section("main", "node-0", "node-1"),
        _make_pipeline_section("branch-a", "node-1", "node-2"),
    ]
    network = _build_network(sections)
    solver = NetworkSolver()

    ordered = solver._ordered_sections_by_topology(network, forward=True)

    assert _section_ids(ordered)[0] == "main"
    assert set(_section_ids(ordered)) == {"main", "branch-a", "branch-b"}


def test_ordered_sections_by_topology_backward_reverses_forward():
    sections = [
        _make_pipeline_section("branch-b", "node-1", "node-3"),
        _make_pipeline_section("main", "node-0", "node-1"),
        _make_pipeline_section("branch-a", "node-1", "node-2"),
    ]
    network = _build_network(sections)
    solver = NetworkSolver()

    forward_ids = _section_ids(solver._ordered_sections_by_topology(network, forward=True))
    backward_ids = _section_ids(solver._ordered_sections_by_topology(network, forward=False))

    assert set(backward_ids) == set(forward_ids)
    assert backward_ids[-1] == "main"


def test_flow_splitting_factor_distributes_mass():
    main = _make_pipeline_section("source", "node-start", "node-junction")
    branch_a = _make_pipeline_section("branch-a", "node-junction", "node-a")
    branch_b = _make_pipeline_section("branch-b", "node-junction", "node-b")
    branch_a.flow_splitting_factor = 2.0
    branch_b.flow_splitting_factor = 1.0
    network = _build_network([main, branch_a, branch_b])
    network.mass_flow_rate = 3.0
    solver = NetworkSolver()
    solver._assign_design_flows(network.sections, network, network.mass_flow_rate)
    solver._distribute_mass_flow(network, forward=True)

    assert branch_a.mass_flow_rate == pytest.approx(2.0)
    assert branch_b.mass_flow_rate == pytest.approx(1.0)


def test_node_pressure_stores_min_of_merging_sections():
    source = _make_pipeline_section("source", "node-inlet", "node-split")
    branch_a = _make_pipeline_section("branch-a", "node-split", "node-merge")
    branch_b = _make_pipeline_section("branch-b", "node-split", "node-merge")
    branch_a.length = 20.0
    branch_b.length = 5.0
    network = _build_network([source, branch_a, branch_b])
    solver = NetworkSolver()

    result = solver.run(network)
    section_map = {section.section_id: section for section in result.sections}
    pressures = [
        section_map["branch-a"].summary.outlet.pressure,
        section_map["branch-b"].summary.outlet.pressure,
    ]
    expected = min(p for p in pressures if p is not None)
    assert result.node_pressures["node-merge"] == pytest.approx(expected)


def test_solver_uses_downstream_pressure_hint():
    sec1 = _make_pipeline_section("sec-1", "node-1", "node-2")
    sec2 = _make_pipeline_section("sec-2", "node-2", "node-3")
    network = _build_network([sec1, sec2])
    network.direction = "backward"
    network.downstream_pressure = 50000.0
    solver = NetworkSolver()

    result = solver.run(network)
    assert result.node_pressures["node-3"] == pytest.approx(50000.0)
