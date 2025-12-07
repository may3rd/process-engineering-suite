"""User specified fixed losses."""
from __future__ import annotations

from dataclasses import dataclass

from network_hydraulic.calculators.base import LossCalculator
from network_hydraulic.models.pipe_section import PipeSection


@dataclass
class UserFixedLossCalculator(LossCalculator):
    """Compute user specified fixed losses."""

    def calculate(self, section: PipeSection) -> None:
        if section.user_specified_fixed_loss is None:
            return

        ignored = section.calculation_output.ignored_components

        # User-defined losses behave like a dedicated component: only one per section.
        if section.control_valve:
            ignored.append("User-defined fixed loss ignored because control valve takes precedence in this section.")
            return
        if section.orifice:
            ignored.append("User-defined fixed loss ignored because orifice takes precedence in this section.")
            return

        pressure_drop = section.calculation_output.pressure_drop
        delta_p = section.user_specified_fixed_loss
        pressure_drop.user_specified_fixed_loss = delta_p
        baseline = pressure_drop.total_segment_loss or 0.0
        pressure_drop.total_segment_loss = baseline + delta_p
