"""Horizontal hemispherical vessel geometry."""

from __future__ import annotations

import math

from pes_calc.vessels.horizontal_flat_vessel import HorizontalFlatVessel


class HorizontalHemisphericalVessel(HorizontalFlatVessel):
    """Horizontal hemispherical vessel model."""

    vessel_type = "Horizontal HemiSpherical Vessel"

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

    @property
    def bottom_head_height(self) -> float:
        return self.head_distance

    @property
    def top_head_height(self) -> float:
        return self.head_distance

    def head_liquid_volume(self, value: float) -> float:
        if value <= 0:
            return 0.0
        if value >= self.diameter:
            return (4 / 3) * math.pi * (self.diameter / 2) ** 3
        h = value
        radius = self.diameter / 2
        return (math.pi * h**2 / 3) * (3 * radius - h)

    def head_wetted_area(self, value: float) -> float:
        if value <= 0:
            return 0.0
        if value >= self.diameter:
            return math.pi * self.diameter**2
        return math.pi * self.diameter * value

    @property
    def total_height(self) -> float:
        return self.diameter

    @property
    def tangent_height(self) -> float:
        return self.diameter

    @property
    def head_volume(self) -> float:
        return (4 / 3) * math.pi * (self.diameter / 2) ** 3

    @property
    def head_surface_area(self) -> float:
        return math.pi * self.diameter**2
