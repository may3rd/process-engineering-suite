"""Pipe section definition with fittings and result containers.

Example:

    from network_hydraulic.models.pipe_section import PipeSection, Fitting
    section = PipeSection(
        id="sec-1",
        schedule="40",
        roughness=1e-4,
        length=10.0,
        elevation_change=0.0,
        fitting_type="LR",
        fittings=[Fitting(type="elbow_90", count=2)],
        pipe_diameter=0.1,
        inlet_diameter=0.1,
        outlet_diameter=0.1,
    )
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from network_hydraulic.models.components import ControlValve, Orifice
from network_hydraulic.models.results import CalculationOutput, ResultSummary
from network_hydraulic.models.fluid import Fluid

ALLOWED_FITTING_TYPES = [
    "elbow_90",
    "elbow_45",
    "u_bend",
    "stub_in_elbow",
    "tee_elbow",
    "tee_through",
    "block_valve_full_line_size",
    "block_valve_reduced_trim_0.9d",
    "block_valve_reduced_trim_0.8d",
    "globe_valve",
    "diaphragm_valve",
    "butterfly_valve",
    "check_valve_swing",
    "lift_check_valve",
    "tilting_check_valve",
    "pipe_entrance_normal",
    "pipe_entrance_raise",
    "pipe_exit",
    "inlet_swage",
    "outlet_swage",
]

FITTING_NAME_ALIASES = {
    "check_valve_lift": "lift_check_valve",
    "check_valve_tilting": "tilting_check_valve",
}


@dataclass(slots=True)
class Fitting:
    type: str
    count: int = 1

    def __post_init__(self) -> None:
        original_type = self.type
        normalized_type = original_type.strip().lower()
        canonical_type = FITTING_NAME_ALIASES.get(normalized_type, normalized_type)
        if canonical_type not in ALLOWED_FITTING_TYPES:
            raise ValueError(f"Unsupported fitting type '{original_type}'")
        if self.count <= 0:
            raise ValueError("Fitting count must be positive")
        self.type = canonical_type


@dataclass(slots=True)
class PipeSection:
    id: str
    schedule: str
    roughness: float
    length: float
    elevation_change: float
    fitting_type: str
    fittings: List[Fitting]
    fitting_K: Optional[float]
    pipe_length_K: Optional[float]
    user_K: Optional[float]
    piping_and_fitting_safety_factor: Optional[float]
    total_K: Optional[float]
    user_specified_fixed_loss: Optional[float]
    pipe_NPD: Optional[float] = None
    description: Optional[str] = None
    design_margin: Optional[float] = None
    pipe_diameter: Optional[float] = None
    inlet_diameter: Optional[float] = None
    outlet_diameter: Optional[float] = None
    erosional_constant: Optional[float] = None
    mach_number: Optional[float] = None
    boundary_pressure: Optional[float] = None
    direction: Optional[str] = None
    inlet_diameter_specified: bool = False
    outlet_diameter_specified: bool = False
    control_valve: Optional[ControlValve] = None
    orifice: Optional[Orifice] = None
    calculation_output: CalculationOutput = field(default_factory=CalculationOutput)
    result_summary: ResultSummary = field(default_factory=ResultSummary)
    design_flow_multiplier: float = 1.0
    design_mass_flow_rate: Optional[float] = None
    mass_flow_rate: Optional[float] = None
    temperature: Optional[float] = None
    pressure: Optional[float] = None
    flow_splitting_factor: float = 1.0
    from_pipe_id: Optional[str] = None
    to_pipe_id: Optional[str] = None
    equivalent_length: Optional[float] = None
    @property
    def start_node_id(self) -> Optional[str]:
        return self.from_pipe_id

    @start_node_id.setter
    def start_node_id(self, value: Optional[str]) -> None:
        self.from_pipe_id = value

    @property
    def end_node_id(self) -> Optional[str]:
        return self.to_pipe_id

    @end_node_id.setter
    def end_node_id(self, value: Optional[str]) -> None:
        self.to_pipe_id = value

    def __post_init__(self) -> None:
        errors: list[str] = []

        if not self.id:
            errors.append("PipeSection id must be a non-empty string")
        
        if self.roughness < 0:
            errors.append("PipeSection roughness must be non-negative")

        if self.length < 0:
            errors.append("PipeSection length must be non-negative")
        if abs(self.elevation_change) > self.length:
            errors.append(
                f"PipeSection '{self.id}' elevation_change magnitude "
                f"({self.elevation_change}) cannot exceed length ({self.length})"
            )
        
        if self.pipe_diameter is not None and self.pipe_diameter <= 0:
            errors.append("PipeSection pipe_diameter must be positive if provided")
        
        if self.inlet_diameter is not None and self.inlet_diameter <= 0:
            errors.append("PipeSection inlet_diameter must be positive if provided")
        
        if self.outlet_diameter is not None and self.outlet_diameter <= 0:
            errors.append("PipeSection outlet_diameter must be positive if provided")
        
        if self.piping_and_fitting_safety_factor is not None and self.piping_and_fitting_safety_factor < 0:
            errors.append("PipeSection piping_and_fitting_safety_factor must be positive if provided")
        
        if self.piping_and_fitting_safety_factor is not None and self.piping_and_fitting_safety_factor > 0:
            self.piping_and_fitting_safety_factor += 1.0
        
        if self.erosional_constant is not None and self.erosional_constant <= 0:
            errors.append("PipeSection erosional_constant must be positive if provided")
        
        if not self.fitting_type:
            errors.append("PipeSection fitting_type must be a non-empty string")

        if self.flow_splitting_factor <= 0:
            errors.append("PipeSection flow_splitting_factor must be positive")

        if errors:
            raise ValueError("; ".join(errors))

    @property
    def has_pipeline_segment(self) -> bool:
        return self.length is not None and self.length > 0

    def current_volumetric_flow_rate(self, fluid: Fluid) -> float:
        if self.mass_flow_rate is None:
            raise ValueError("mass_flow_rate must be set for the pipe section to calculate volumetric flow rate")
        if self.temperature is None or self.temperature <= 0:
            raise ValueError("temperature must be set and positive for the pipe section to calculate volumetric flow rate")
        if self.pressure is None or self.pressure <= 0:
            raise ValueError("pressure must be set and positive for the pipe section to calculate volumetric flow rate")
        density = fluid.current_density(self.temperature, self.pressure)
        if density == 0:
            raise ValueError("Cannot calculate volumetric flow rate with zero density")
        return self.mass_flow_rate / density
