"""Vertical conical tank geometry."""

from __future__ import annotations

import math

from pes_calc.vessels.vertical_conical_vessel import VerticalConicalVessel


class VerticalConicalTank(VerticalConicalVessel):
    """Vertical conical tank model."""

    vessel_type = "Vertical Conical Tank"

    def __init__(self, diameter: float = 3, length: float = 9, head_distance: float = 0) -> None:
        super().__init__(diameter, length, head_distance)

    @property
    def bottom_head_height(self) -> float:
        return 0.0

    def bottom_head_liquid_volume(self, value: float) -> float:
        return 0.0

    def bottom_head_wetted_area(self, value: float) -> float:
        return (math.pi * self.diameter**2) / 4 if value > 0 else 0.0
