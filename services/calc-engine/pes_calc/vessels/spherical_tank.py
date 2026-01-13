"""Spherical tank geometry."""

from __future__ import annotations

import math

from pes_calc.vessels.vessel import Vessel


class SphericalTank(Vessel):
    """Spherical tank model."""

    vessel_type = "Spherical Tank"

    def __init__(self, diameter: float = 3) -> None:
        super().__init__()
        self.diameter = diameter
        self.length = diameter

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
        return self.diameter / 2

    @property
    def top_head_height(self) -> float:
        return self.diameter / 2

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
    def shell_volume(self) -> float:
        return 0.0

    @property
    def head_surface_area(self) -> float:
        return math.pi * self.diameter**2

    @property
    def shell_surface_area(self) -> float:
        return 0.0

    @property
    def working_volume(self) -> float:
        return self.liquid_volume(self.liquid_level)

    @property
    def tangent_volume(self) -> float:
        return self.total_volume

    def head_liquid_volume(self, value: float) -> float:
        if value <= 0:
            return 0.0
        if value >= self.diameter:
            return self.head_volume
        h = value
        radius = self.diameter / 2
        return (math.pi * h**2 / 3) * (3 * radius - h)

    def shell_liquid_volume(self, value: float) -> float:
        return 0.0

    def head_wetted_area(self, value: float) -> float:
        if value <= 0:
            return 0.0
        if value >= self.diameter:
            return self.head_surface_area
        radius = self.diameter / 2
        return 2 * math.pi * radius * value

    def shell_wetted_area(self, value: float) -> float:
        return 0.0
