"""Vertical elliptical tank geometry."""

from __future__ import annotations

import math

from pes_calc.vessels.vertical_elliptical_vessel import VerticalEllipticalVessel


class VerticalEllipticalTank(VerticalEllipticalVessel):
    """Vertical elliptical tank model."""

    vessel_type = "Vertical Elliptical Tank"

    def __init__(self, diameter: float = 3, length: float = 9) -> None:
        super().__init__(diameter, length)

    @property
    def bottom_head_height(self) -> float:
        return 0.0

    def bottom_head_liquid_volume(self, value: float) -> float:
        return 0.0

    def bottom_head_wetted_area(self, value: float) -> float:
        return (math.pi * self.diameter**2) / 4 if value > 0 else 0.0
