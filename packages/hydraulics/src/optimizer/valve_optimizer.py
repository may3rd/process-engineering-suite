"""Support tuning adjustable control valves to hit downstream target pressures."""
from __future__ import annotations

from copy import deepcopy
from typing import Optional, Set

from network_hydraulic.models.network import Network
from network_hydraulic.models.pipe_section import PipeSection
from network_hydraulic.models.topology import TopologyGraph
from network_hydraulic.solver.network_solver import NetworkSolver


def optimize_control_valves(network: Network, *, tolerance: float = 10.0) -> Optional[float]:
    """Tune adjustable valves via upstream/downstream subnetworks."""

    if not network.downstream_pressure:
        return None
    adjustable_sections = [
        section
        for section in network.sections
        if section.control_valve and section.control_valve.adjustable
    ]
    if not adjustable_sections:
        return None

    solver = NetworkSolver()
    residuals: list[float] = []
    for adjustable_section in adjustable_sections:
        start_node, end_node = solver._section_node_ids(
            adjustable_section, network.topology, forward=True
        )
        downstream_node = _find_rejoin_node(network.topology, end_node)
        upstream_ids = _sections_to_node(network.topology, start_node, forward=True)
        downstream_ids = _sections_between_nodes(
            network.topology, end_node, downstream_node, forward=True
        )
        upstream_sections = [sec for sec in network.sections if sec.id in upstream_ids]
        downstream_sections = [sec for sec in network.sections if sec.id in downstream_ids]

        upstream_pressure = _solve_subnetwork(
            network,
            upstream_sections,
            solver,
            forward=True,
            target_node=start_node,
            boundary=network.boundary_pressure,
        )
        downstream_pressure = _solve_subnetwork(
            network,
            downstream_sections,
            solver,
            forward=False,
            target_node=end_node,
            boundary=network.downstream_pressure,
        )

        if upstream_pressure is None or downstream_pressure is None:
            return None
        if downstream_pressure > upstream_pressure:
            raise ValueError(
                "Downstream pressure {:.2f} Pa exceeds upstream pressure {:.2f} Pa; unable to tune adjustable valve.".format(
                    downstream_pressure, upstream_pressure
                )
            )
        drop = max(upstream_pressure - downstream_pressure, 0.0)
        if adjustable_section.control_valve:
            adjustable_section.control_valve.pressure_drop = drop
        residuals.append(abs(upstream_pressure - downstream_pressure))
        if drop <= tolerance:
            break
    return min(residuals) if residuals else None


def _solve_subnetwork(
    network: Network,
    sections: list[PipeSection],
    solver: NetworkSolver,
    *,
    forward: bool,
    boundary: Optional[float],
    target_node: Optional[str],
) -> Optional[float]:
    if not sections:
        return boundary
    trial = deepcopy(network)
    trial.sections = [deepcopy(section) for section in sections]
    trial.direction = "forward" if forward else "backward"
    trial.downstream_pressure = boundary if not forward else None
    trial.rebuild_topology()
    result = solver.run(trial)
    if target_node and target_node in result.node_pressures:
        return result.node_pressures[target_node]
    section = sections[-1] if forward else sections[0]
    summary = result.sections[-1].summary if forward else result.sections[0].summary
    return summary.outlet.pressure if forward else summary.inlet.pressure


def _sections_to_node(
    graph: TopologyGraph,
    target_node: Optional[str],
    forward: bool,
) -> Set[str]:
    if target_node is None:
        return set()
    start_nodes = graph.start_nodes(forward) or list(graph.nodes.keys())
    visited: Set[str] = set()
    sections: Set[str] = set()
    queue = list(start_nodes)
    while queue:
        node_id = queue.pop()
        if node_id == target_node:
            continue
        edges = graph.outgoing_edges(node_id) if forward else graph.incoming_edges(node_id)
        for edge in edges:
            next_node = edge.end_node_id if forward else edge.start_node_id
            sections.add(edge.id)
            if next_node not in visited and next_node != target_node:
                visited.add(next_node)
                queue.append(next_node)
    return sections


def _sections_between_nodes(
    graph: TopologyGraph,
    start_node: Optional[str],
    end_node: Optional[str],
    forward: bool,
) -> Set[str]:
    if start_node is None or end_node is None:
        return set()
    sections: Set[str] = set()
    queue = [start_node]
    visited: Set[str] = set()
    while queue:
        node_id = queue.pop()
        if node_id == end_node:
            continue
        edges = graph.outgoing_edges(node_id) if forward else graph.incoming_edges(node_id)
        for edge in edges:
            next_node = edge.end_node_id if forward else edge.start_node_id
            sections.add(edge.id)
            if next_node not in visited and next_node != end_node:
                visited.add(next_node)
                queue.append(next_node)
    return sections


def _find_rejoin_node(graph: TopologyGraph, start_node: Optional[str]) -> Optional[str]:
    if start_node is None:
        return None
    queue = [start_node]
    visited: Set[str] = {start_node}
    while queue:
        node_id = queue.pop(0)
        incoming = graph.reverse_adjacency.get(node_id, [])
        if len(incoming) > 1:
            return node_id
        edges = graph.outgoing_edges(node_id)
        if not edges:
            return node_id
        for edge in edges:
            next_node = edge.end_node_id
            if next_node not in visited:
                visited.add(next_node)
                queue.append(next_node)
    return None
