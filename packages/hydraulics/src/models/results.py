"""Result containers for per-section and network summaries.

Example:

    from network_hydraulic.models.results import NetworkResult

    result = NetworkResult()
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass(slots=True)
class FittingBreakdown:
    type: str
    count: int
    k_each: float
    k_total: float


@dataclass(slots=True)
class PressureDropDetails:
    fitting_K: Optional[float] = None
    pipe_length_K: Optional[float] = None
    user_K: Optional[float] = None
    piping_and_fitting_safety_factor: Optional[float] = None
    total_K: Optional[float] = None
    fitting_breakdown: List["FittingBreakdown"] = field(default_factory=list)
    reynolds_number: Optional[float] = None
    frictional_factor: Optional[float] = None
    flow_scheme: Optional[str] = None
    pipe_and_fittings: Optional[float] = None
    elevation_change: Optional[float] = None
    control_valve_pressure_drop: Optional[float] = None
    orifice_pressure_drop: Optional[float] = None
    user_specified_fixed_loss: Optional[float] = None
    total_segment_loss: Optional[float] = None
    normalized_friction_loss: Optional[float] = None
    gas_flow_critical_pressure: Optional[float] = None


@dataclass(slots=True)
class CalculationOutput:
    pressure_drop: PressureDropDetails = field(default_factory=PressureDropDetails)
    ignored_components: List[str] = field(default_factory=list)


@dataclass(slots=True)
class StatePoint:
    pressure: Optional[float] = None
    temperature: Optional[float] = None
    density: Optional[float] = None
    mach_number: Optional[float] = None
    velocity: Optional[float] = None
    pipe_velocity: Optional[float] = None
    erosional_velocity: Optional[float] = None
    flow_momentum: Optional[float] = None
    remarks: Optional[str] = None


@dataclass(slots=True)
class ResultSummary:
    inlet: StatePoint = field(default_factory=StatePoint)
    outlet: StatePoint = field(default_factory=StatePoint)


@dataclass(slots=True)
class SectionResult:
    section_id: str
    calculation: CalculationOutput = field(default_factory=CalculationOutput)
    summary: ResultSummary = field(default_factory=ResultSummary)


@dataclass(slots=True)
class NetworkResult:
    sections: List[SectionResult] = field(default_factory=list)
    aggregate: CalculationOutput = field(default_factory=CalculationOutput)
    summary: ResultSummary = field(default_factory=ResultSummary)
    node_pressures: dict[str, float] = field(default_factory=dict)
