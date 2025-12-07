"""Utility calculators for normalized losses."""
from __future__ import annotations

from dataclasses import dataclass

from network_hydraulic.calculators.base import LossCalculator
from network_hydraulic.models.pipe_section import PipeSection


@dataclass
class NormalizedLossCalculator(LossCalculator):
    def calculate(self, section: PipeSection) -> None:
        pressure_drop = section.calculation_output.pressure_drop
        if not section.has_pipeline_segment or section.control_valve or section.orifice:
            pressure_drop.normalized_friction_loss = None
            return
        total_k = section.total_K or 0.0
        equivalent_length = section.equivalent_length or 0.0
        friction_drop = pressure_drop.pipe_and_fittings

        if equivalent_length <= 0 or total_k <= 0 or friction_drop is None:
            pressure_drop.normalized_friction_loss = None
            return

        pressure_drop.normalized_friction_loss = friction_drop / equivalent_length * 100
