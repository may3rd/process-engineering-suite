"""Directed graph helpers used to represent network topology."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Optional, Callable, Set

from network_hydraulic.models.pipe_section import PipeSection


@dataclass(slots=True)
class TopologyNode:
    """Represents a junction point in the network."""

    id: str
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class TopologyEdge:
    """Directed edge that carries a section reference between two nodes."""

    id: str
    start_node_id: str
    end_node_id: str
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class TopologyGraph:
    """Lightweight directed graph tracking nodes, edges, and adjacency lists."""

    nodes: Dict[str, TopologyNode] = field(default_factory=dict)
    edges: Dict[str, TopologyEdge] = field(default_factory=dict)
    adjacency: Dict[str, List[str]] = field(default_factory=dict)
    reverse_adjacency: Dict[str, List[str]] = field(default_factory=dict)

    def add_node(self, node_id: str, metadata: Optional[Dict[str, Any]] = None) -> TopologyNode:
        """Ensure a node exists for the given identifier."""
        if node_id not in self.nodes:
            self.nodes[node_id] = TopologyNode(id=node_id, metadata=metadata or {})
            self.adjacency[node_id] = []
            self.reverse_adjacency[node_id] = []
        elif metadata:
            self.nodes[node_id].metadata.update(metadata)
        return self.nodes[node_id]

    def add_edge(
        self,
        edge_id: str,
        start_node_id: str,
        end_node_id: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> TopologyEdge:
        """Add a directed edge connecting two nodes."""
        if edge_id in self.edges:
            raise ValueError(f"Edge '{edge_id}' already exists in the topology")
        self.add_node(start_node_id)
        self.add_node(end_node_id)
        edge = TopologyEdge(
            id=edge_id,
            start_node_id=start_node_id,
            end_node_id=end_node_id,
            metadata=metadata or {},
        )
        self.edges[edge_id] = edge
        self.adjacency[start_node_id].append(edge_id)
        self.reverse_adjacency[end_node_id].append(edge_id)
        return edge

    def outgoing_edges(self, node_id: str) -> List[TopologyEdge]:
        """Return all edges leaving the given node."""
        return [
            self.edges[edge_id]
            for edge_id in self.adjacency.get(node_id, [])
            if edge_id in self.edges
        ]

    def incoming_edges(self, node_id: str) -> List[TopologyEdge]:
        """Return all edges entering the given node."""
        return [
            self.edges[edge_id]
            for edge_id in self.reverse_adjacency.get(node_id, [])
            if edge_id in self.edges
        ]

    def all_outgoing(self, node_ids: Iterable[str]) -> List[TopologyEdge]:
        """Collect outgoing edges for multiple nodes."""
        edges: List[TopologyEdge] = []
        for node_id in node_ids:
            edges.extend(self.outgoing_edges(node_id))
        return edges

    def start_nodes(self, forward: bool = True) -> List[str]:
        """Return the nodes that have no incoming edges (forward) or no outgoing edges (backward)."""
        lookup = self.reverse_adjacency if forward else self.adjacency
        return [node_id for node_id, edges in lookup.items() if not edges]

    def reachable_nodes(self, start_nodes: Iterable[str], forward: bool = True) -> Set[str]:
        """Perform a traversal from the provided start nodes to find reachable junctions."""
        visited: Set[str] = set()
        adjacency = self.adjacency if forward else self.reverse_adjacency
        stack: List[str] = list(start_nodes)
        while stack:
            node = stack.pop()
            if node in visited:
                continue
            visited.add(node)
            for edge_id in adjacency.get(node, []):
                edge = self.edges.get(edge_id)
                if edge is None:
                    continue
                next_node = edge.end_node_id if forward else edge.start_node_id
                if next_node not in visited:
                    stack.append(next_node)
        return visited


def _default_node_id(section: PipeSection, suffix: str) -> str:
    """Fallback node identifier when explicit IDs are absent."""
    return f"{section.id}_{suffix}"


def build_topology_from_sections(
    sections: Iterable[PipeSection],
    *,
    start_node_supplier: Optional[Callable[[PipeSection], Optional[str]]] = None,
    end_node_supplier: Optional[Callable[[PipeSection], Optional[str]]] = None,
) -> TopologyGraph:
    """Build a directed graph that mirrors the configured pipe sections."""

    graph = TopologyGraph()
    start_supplier = (
        start_node_supplier
        or (lambda sec: sec.start_node_id if sec.start_node_id else None)
    )
    end_supplier = (
        end_node_supplier or (lambda sec: sec.end_node_id if sec.end_node_id else None)
    )
    previous_end: Optional[str] = None

    for section in sections:
        start_node_id = start_supplier(section)
        end_node_id = end_supplier(section)
        if not start_node_id:
            start_node_id = previous_end or _default_node_id(section, "start")
        if not end_node_id:
            end_node_id = _default_node_id(section, "end")
        metadata = {
            "section_id": section.id,
            "section": section,
            "start_node_id": start_node_id,
            "end_node_id": end_node_id,
        }
        graph.add_edge(
            edge_id=section.id,
            start_node_id=start_node_id,
            end_node_id=end_node_id,
            metadata=metadata,
        )
        previous_end = end_node_id
    return graph
