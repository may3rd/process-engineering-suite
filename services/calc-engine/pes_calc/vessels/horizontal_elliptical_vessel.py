"""Horizontal elliptical vessel geometry."""

from __future__ import annotations

import math

from pes_calc.vessels.horizontal_flat_vessel import HorizontalFlatVessel
from pes_calc.vessels.horizontal_integration import calculate_horizontal_head_area


class HorizontalEllipticalVessel(HorizontalFlatVessel):
    """Horizontal elliptical vessel model."""

    vessel_type = "Horizontal Elliptical Vessel"

    def __init__(self, diameter: float = 3, length: float = 9) -> None:
        super().__init__(diameter, length)

    @property
    def head_distance(self) -> float:
        return self.diameter / 4

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
        radius = self.diameter / 2
        length = self.head_distance
        h = min(value, self.diameter)
        v_sphere = (math.pi * h**2 / 3) * (3 * radius - h)
        return v_sphere * (length / radius)

    def head_wetted_area(self, value: float) -> float:
        radius = self.diameter / 2
        length = self.head_distance
        area_one_head = calculate_horizontal_head_area(
            lambda x: radius * math.sqrt(1 - (min(x, length - 1e-6) / length) ** 2),
            lambda x: -(
                radius
                * min(x, length - 1e-6)
                / (length**2 * math.sqrt(1 - (min(x, length - 1e-6) / length) ** 2))
            ),
            length,
            self.diameter,
            value,
        )
        return 2 * area_one_head

    @property
    def total_height(self) -> float:
        return self.diameter

    @property
    def tangent_height(self) -> float:
        return self.diameter

    @property
    def head_volume(self) -> float:
        return self.head_liquid_volume(self.diameter)

    @property
    def head_surface_area(self) -> float:
        return self.head_wetted_area(self.diameter)
