from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from network_hydraulic.calculators.base import LossCalculator
from network_hydraulic.models.fluid import Fluid
from network_hydraulic.models.pipe_section import PipeSection

GRAVITY = 9.80665  # m/s^2, standard gravity
GAS_PHASES = {"gas", "vapor"}


@dataclass
class ElevationCalculator(LossCalculator):
    fluid: Fluid
    gravity: float = GRAVITY

    def __post_init__(self) -> None:
        if self.gravity <= 0:
            raise ValueError("gravity must be positive")

    def calculate(self, section: PipeSection) -> None:
        pressure_drop = section.calculation_output.pressure_drop
        if not section.has_pipeline_segment or section.control_valve or section.orifice:
            pressure_drop.elevation_change = 0.0
            return
        if self.fluid.phase.lower() in GAS_PHASES:
            pressure_drop.elevation_change = 0.0
            return
        
        if section.temperature is None or section.temperature <= 0:
            raise ValueError("section.temperature must be set and positive for elevation calculations")
        if section.pressure is None or section.pressure <= 0:
            raise ValueError("section.pressure must be set and positive for elevation calculations")

        fluid_density = self.fluid.current_density(section.temperature, section.pressure)
        if fluid_density <= 0:
            raise ValueError("fluid_density must be positive for elevation calculations")

        delta_p = fluid_density * self.gravity * section.elevation_change
        pressure_drop.elevation_change = delta_p
        baseline = pressure_drop.total_segment_loss or 0.0
        pressure_drop.total_segment_loss = baseline + delta_p
