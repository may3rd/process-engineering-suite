"""Coordinate valve optimization across multi-network systems."""
from __future__ import annotations

import logging
from typing import Optional

from network_hydraulic.models.network_system import (
    NetworkBundle,
    NetworkOptimizerSettings,
    NetworkSystem,
    SystemOptimizerSettings,
)
from network_hydraulic.optimizer.advanced_valve_optimizer import (
    advanced_optimize_control_valves,
)
from network_hydraulic.optimizer.valve_optimizer import optimize_control_valves

logger = logging.getLogger(__name__)


class NetworkSystemOptimizer:
    """Run valve optimization for bundles flagged in the system settings."""

    def __init__(self, settings: SystemOptimizerSettings) -> None:
        self.settings = settings

    def run(self, system: NetworkSystem) -> None:
        if not self.settings.enabled:
            return
        for bundle in system.bundles:
            network_settings = self.settings.networks.get(bundle.id)
            if network_settings is None:
                continue
            self._optimize_bundle(bundle, network_settings)

    def _optimize_bundle(
        self,
        bundle: NetworkBundle,
        network_settings: NetworkOptimizerSettings,
    ) -> None:
        network = bundle.network
        if network_settings.downstream_pressure is not None:
            network.downstream_pressure = network_settings.downstream_pressure
        method = (network_settings.method or "advanced").strip().lower()
        tol = self._resolve_value(
            network_settings.tolerance,
            self.settings.tolerance,
            default=10.0,
        )
        max_iter = int(
            self._resolve_value(
                network_settings.max_iterations,
                self.settings.max_iterations,
                default=30.0,
            )
        )
        damping = self._resolve_value(
            network_settings.damping_factor,
            self.settings.damping_factor,
            default=0.6,
        )

        residual: Optional[float] = None
        converged = False
        iterations = 0

        if method == "advanced":
            residual, iterations, converged = advanced_optimize_control_valves(
                network,
                tolerance=tol,
                max_iterations=max_iter,
                damping_factor=damping,
                verbose=self.settings.verbose,
            )
        else:
            residual = optimize_control_valves(network, tolerance=tol)
            iterations = 1
            converged = residual is None or residual <= tol

        if residual is not None:
            logger.info(
                "Optimized network '%s' control valves (method=%s, residual=%.3f Pa, iterations=%d, converged=%s)",
                bundle.id,
                method,
                residual,
                iterations,
                converged,
            )
        else:
            logger.info(
                "No adjustable control valves optimized for network '%s' (method=%s)",
                bundle.id,
                method,
            )

    @staticmethod
    def _resolve_value(*candidates: Optional[float], default: float) -> float:
        for value in candidates:
            if value is None:
                continue
            return float(value)
        return default
