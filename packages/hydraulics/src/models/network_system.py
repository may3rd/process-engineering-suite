"""Container models for multi-network configurations."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List

from network_hydraulic.models.network import Network
from network_hydraulic.models.results import NetworkResult


@dataclass(slots=True)
class NetworkBundle:
    """Wraps a network with loader-provided metadata."""

    id: str
    network: Network
    node_mapping: Dict[str, str] = field(default_factory=dict)


@dataclass(slots=True)
class SharedNodeMember:
    """Represents a single network/node pair participating in a shared junction."""

    network_id: str
    node_id: str


@dataclass(slots=True)
class SharedNodeGroup:
    """Describes a canonical node shared across multiple networks."""

    canonical_node_id: str
    members: List[SharedNodeMember] = field(default_factory=list)
    pressure_bias: float = 0.0


@dataclass(slots=True)
class NetworkSystemSettings:
    """Solver tuning parameters shared by the system solver."""

    max_iterations: int | None = None
    tolerance: float | None = None
    relaxation: float | None = None


@dataclass(slots=True)
class NetworkOptimizerSettings:
    """Per-network valve optimizer options."""

    network_id: str
    downstream_pressure: float | None = None
    method: str = "advanced"
    tolerance: float | None = None
    damping_factor: float | None = None
    max_iterations: int | None = None


@dataclass(slots=True)
class SystemOptimizerSettings:
    """Global valve optimizer configuration for a network system."""

    enabled: bool = False
    tolerance: float | None = None
    damping_factor: float | None = None
    max_iterations: int | None = None
    verbose: bool = False
    networks: Dict[str, NetworkOptimizerSettings] = field(default_factory=dict)


@dataclass(slots=True)
class NetworkSystem:
    """Encapsulates multiple networks plus shared-node metadata."""

    bundles: List[NetworkBundle] = field(default_factory=list)
    shared_nodes: Dict[str, SharedNodeGroup] = field(default_factory=dict)
    solver_settings: NetworkSystemSettings = field(default_factory=NetworkSystemSettings)
    optimizer_settings: SystemOptimizerSettings = field(default_factory=SystemOptimizerSettings)


@dataclass(slots=True)
class NetworkResultBundle:
    """Pairing of a bundle ID with the solver result for that network."""

    bundle_id: str
    network: Network
    result: NetworkResult


@dataclass(slots=True)
class NetworkSystemResult:
    """Aggregate result for a system-level solver pass."""

    bundles: List[NetworkResultBundle] = field(default_factory=list)
    shared_node_pressures: Dict[str, float] = field(default_factory=dict)
