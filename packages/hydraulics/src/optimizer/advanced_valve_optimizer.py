"""Advanced iterative optimization of adjustable control valves."""
from __future__ import annotations

from copy import deepcopy
from typing import Optional, Tuple

from network_hydraulic.models.network import Network
from .valve_optimizer import optimize_control_valves


def advanced_optimize_control_valves(
    network: Network,
    *,
    tolerance: float = 5.0,          # Pa (or desired unit)
    max_iterations: int = 30,
    damping_factor: float = 0.6,     # 0.0 = no update, 1.0 = full update (aggressive)
    stagnation_threshold: float = 0.1,  # Pa – stop if improvement < this
    verbose: bool = False,
) -> Tuple[Optional[float], int, bool]:
    """
    Iteratively tune all adjustable control valves to satisfy the downstream target pressure.

    Uses successive substitution with under-relaxation (damping) for stable convergence
    even in branched networks with strong hydraulic interaction.

    Parameters
    ----------
    network : Network
        The network containing adjustable control valves.
    tolerance : float, optional
        Convergence criterion: maximum residual |P_inlet - P_outlet| across all valves (Pa).
    max_iterations : int, optional
        Safety limit against infinite loops.
    damping_factor : float, optional
        0 < damping ≤ 1.0. Lower values increase stability but slow convergence.
        Recommended range: 0.4 – 0.8 for most plant networks.
    stagnation_threshold : float, optional
        If residual improvement becomes smaller than this, treat as converged.
    verbose : bool, optional
        Print iteration progress.

    Returns
    -------
    Tuple[Optional[float], int, bool]
        (final_residual_or_None, iterations_performed, converged)
    """
    if not network.downstream_pressure:
        return None, 0, False

    # Cache original pressure drops to detect changes
    original_drops = {
        sec.control_valve.pressure_drop
        for sec in network.sections
        if sec.control_valve and sec.control_valve.adjustable
    }

    previous_residual: Optional[float] = None

    for iteration in range(1, max_iterations + 1):
        # One full tuning pass (uses current valve ΔP values)
        residual = optimize_control_valves(network, tolerance=tolerance * 10)  # loose internal tolerance

        if residual is None:
            return None, iteration - 1, False

        if verbose:
            print(f"Iteration {iteration:2d} | Residual = {residual:8.2f} Pa")

        # Convergence checks
        if residual <= tolerance:
            return residual, iteration, True

        if previous_residual is not None:
            improvement = previous_residual - residual
            if improvement < stagnation_threshold:
                if verbose:
                    print("   → Stagnation detected – stopping.")
                return residual, iteration, True

        previous_residual = residual

        # === Apply damped update to all adjustable valves ===
        # The single-pass optimizer has already written new .pressure_drop values.
        # We now blend them with the previous values using damping.
        for section in network.sections:
            valve = section.control_valve
            if valve and valve.adjustable and valve.pressure_drop is not None:
                # Retrieve the value that the single-pass calculated this iteration
                new_dp = valve.pressure_drop
                # Apply relaxation: dp_new = dp_old + damping * (dp_calculated - dp_old)
                if iteration == 1 and damping_factor < 1.0:
                    # On first iteration, old value is unknown or original → moderate step
                    valve.pressure_drop = damping_factor * new_dp
                else:
                    # Subsequent iterations have a meaningful old value
                    old_dp = getattr(valve, "_prev_dp", new_dp)
                    relaxed_dp = old_dp + damping_factor * (new_dp - old_dp)
                    valve.pressure_drop = relaxed_dp
                    valve._prev_dp = relaxed_dp  # store for next iteration

    # Max iterations reached
    if verbose:
        print(f"   → Maximum iterations ({max_iterations}) reached. Final residual = {residual:.2f} Pa")
    return residual, max_iterations, False