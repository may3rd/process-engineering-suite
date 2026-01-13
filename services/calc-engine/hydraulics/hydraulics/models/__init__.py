"""Data models used by the hydraulic framework."""

from .topology import (
    TopologyEdge,
    TopologyGraph,
    TopologyNode,
    build_topology_from_sections,
)

__all__ = [
    "TopologyEdge",
    "TopologyGraph",
    "TopologyNode",
    "build_topology_from_sections",
]
