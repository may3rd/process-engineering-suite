"""Solver that orchestrates multiple interconnected networks."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Dict

from network_hydraulic.models.network_system import (
    NetworkBundle,
    NetworkResultBundle,
    NetworkSystem,
    NetworkSystemResult,
    SharedNodeGroup,
)
from network_hydraulic.solver.network_solver import NetworkSolver

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class NetworkSystemSolver:
    """Iteratively runs NetworkSolver over each bundle while syncing shared nodes."""

    network_solver: NetworkSolver = field(default_factory=NetworkSolver)
    max_iterations: int = 4
    tolerance: float = 1.0  # Pascals
    relaxation: float = 0.7

    def run(self, system: NetworkSystem) -> NetworkSystemResult:
        shared_nodes = system.shared_nodes
        all_global_ids = list(shared_nodes.keys())
        canonical_pressures: Dict[str, float] = {}
        latest_results: Dict[str, NetworkResultBundle] = {}
        relaxation = max(0.0, min(self.relaxation, 1.0))
        final_residual = 0.0

        for iteration in range(self.max_iterations):
            new_pressures: Dict[str, float] = {}
            for bundle in system.bundles:
                overrides = self._build_overrides(bundle, canonical_pressures, shared_nodes)
                network_result = self.network_solver.run(
                    bundle.network,
                    node_pressure_overrides=overrides,
                )
                latest_results[bundle.id] = NetworkResultBundle(
                    bundle_id=bundle.id,
                    network=bundle.network,
                    result=network_result,
                )
                self._record_leader_pressures(
                    bundle,
                    network_result.node_pressures,
                    shared_nodes,
                    new_pressures,
                )
            max_residual = 0.0
            had_previous = bool(canonical_pressures)
            for global_id in all_global_ids:
                old_value = canonical_pressures.get(global_id)
                new_value = new_pressures.get(global_id)
                if new_value is None and old_value is not None:
                    new_value = old_value
                if new_value is None:
                    continue
                if old_value is None:
                    canonical_pressures[global_id] = new_value
                    continue
                residual = abs(new_value - old_value)
                if residual > max_residual:
                    max_residual = residual
                damped = old_value + relaxation * (new_value - old_value)
                canonical_pressures[global_id] = damped

            final_residual = max_residual
            logger.info(
                "Network system iteration %02d residual %.6f Pa",
                iteration + 1,
                max_residual,
            )
            if had_previous and max_residual <= self.tolerance:
                logger.info("Network system converged in %d iteration(s)", iteration + 1)
                break
        else:
            logger.warning(
                "Network system solver reached max iterations (%d) without convergence (residual %.6f Pa)",
                self.max_iterations,
                final_residual,
            )

        ordered_results = [
            latest_results[bundle.id]
            for bundle in system.bundles
            if bundle.id in latest_results
        ]
        return NetworkSystemResult(
            bundles=ordered_results,
            shared_node_pressures=canonical_pressures,
        )

    def _build_overrides(
        self,
        bundle: NetworkBundle,
        canonical_pressures: Dict[str, float],
        shared_nodes: Dict[str, SharedNodeGroup],
    ) -> Dict[str, float]:
        overrides: Dict[str, float] = {}
        for local_node, global_node in bundle.node_mapping.items():
            group = shared_nodes.get(global_node)
            if group is None or len(group.members) < 2:
                continue
            leader = group.members[0]
            if leader.network_id == bundle.id and leader.node_id == local_node:
                continue
            canonical_value = canonical_pressures.get(global_node)
            if canonical_value is None:
                continue
            overrides[local_node] = canonical_value + (group.pressure_bias or 0.0)
        return overrides

    @staticmethod
    def _record_leader_pressures(
        bundle: NetworkBundle,
        node_pressures: Dict[str, float],
        shared_nodes: Dict[str, SharedNodeGroup],
        accumulator: Dict[str, float],
    ) -> None:
        for local_node, global_node in bundle.node_mapping.items():
            group = shared_nodes.get(global_node)
            if group is None:
                continue
            leader = group.members[0]
            if leader.network_id != bundle.id or leader.node_id != local_node:
                continue
            pressure = node_pressures.get(local_node)
            if pressure is None:
                continue
            accumulator[global_node] = pressure

    def _has_converged(
        self,
        previous: Dict[str, float],
        current: Dict[str, float],
    ) -> bool:
        keys = set(previous.keys()) | set(current.keys())
        for key in keys:
            prev = previous.get(key)
            new = current.get(key)
            if prev is None or new is None:
                return False
            if abs(prev - new) > self.tolerance:
                return False
        return True
