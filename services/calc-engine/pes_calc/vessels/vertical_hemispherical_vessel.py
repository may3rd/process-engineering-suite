"""Vertical hemispherical vessel geometry."""

from __future__ import annotations

import math

from pes_calc.vessels.vertical_elliptical_vessel import VerticalEllipticalVessel


class VerticalHemisphericalVessel(VerticalEllipticalVessel):
    """Vertical hemispherical vessel model."""

    vessel_type = "Vertical HemiSpherical Vessels"

    def __init__(self, diameter: float = 3, length: float = 9) -> None:
        super().__init__(diameter, length)

    @property
    def head_distance(self) -> float:
        return self.diameter / 2

    @head_distance.setter
    def head_distance(self, value: float) -> None:
        if value < 0:
            raise ValueError("Head distance must be non-negative")
        self._head_distance = value

    def bottom_head_wetted_area(self, value: float) -> float:
        if value < 0:
            return 0.0
        return math.pi * self.diameter * min(value, self.head_distance)

    def top_head_wetted_area(self, value: float) -> float:
        if value < self.tangent_height:
            return 0.0
        return math.pi * self.diameter * (
            self.head_distance - (self.total_height - min(value, self.total_height))
        )
