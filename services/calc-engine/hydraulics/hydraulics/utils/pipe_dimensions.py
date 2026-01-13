"""Pipe schedule to internal diameter conversions."""
from __future__ import annotations

from fluids.piping import nearest_pipe


def inner_diameter_from_nps(nps: float, schedule: str) -> float:
    """Return the internal diameter in meters for a given NPS and schedule."""
    if nps is None:
        raise ValueError("Nominal pipe diameter (NPS) must be provided")
    if not schedule:
        raise ValueError("Pipe schedule must be provided")
    sched_key = schedule.strip().upper()
    
    try:
        _, di, _, _ = nearest_pipe(NPS=nps, schedule=sched_key)
        return di
    except ValueError:
        raise ValueError(f"NPS {nps} is unavailable for schedule '{schedule}'")
    
