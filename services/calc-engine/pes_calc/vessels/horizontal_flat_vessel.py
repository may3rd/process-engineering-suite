"""Horizontal flat vessel geometry."""

from __future__ import annotations

import math

from pes_calc.vessels.vessel import Vessel


class HorizontalFlatVessel(Vessel):
    """Horizontal flat vessel model."""

    vessel_type = "Horizontal Flat Vessel"

    def __init__(self, diameter: float = 3, length: float = 9) -> None:
        super().__init__()
        self.diameter = diameter
        self.length = length

    @property
    def head_distance(self) -> float:
        return 0.0

    @head_distance.setter
    def head_distance(self, value: float) -> None:
        if value < 0:
            raise ValueError("Head distance must be non-negative")
        self._head_distance = value

    @property
    def bottom_head_height(self) -> float:
        return 0.0

    @property
    def top_head_height(self) -> float:
        return 0.0

    def head_liquid_volume(self, value: float) -> float:
        return 0.0

    def head_wetted_area(self, value: float) -> float:
        if value <= 0:
            return 0.0
        if value >= self.diameter:
            return 2 * (math.pi * self.diameter**2 / 4)
        r = self.diameter / 2
        h = value
        term1 = r**2 * math.acos((r - h) / r)
        term2 = (r - h) * math.sqrt(2 * r * h - h**2)
        area = term1 - term2
        return 2 * area

    def shell_liquid_volume(self, value: float) -> float:
        if value <= 0:
            return 0.0
        if value >= self.diameter:
            return self.shell_volume
        r = self.diameter / 2
        h = value
        term1 = r**2 * math.acos((r - h) / r)
        term2 = (r - h) * math.sqrt(2 * r * h - h**2)
        area = term1 - term2
        return area * self.length

    def shell_wetted_area(self, value: float) -> float:
        if value <= 0:
            return 0.0
        if value >= self.diameter:
            return math.pi * self.diameter * self.length
        r = self.diameter / 2
        h = value
        arc_length = 2 * r * math.acos((r - h) / r)
        return arc_length * self.length

    @property
    def total_height(self) -> float:
        return self.diameter

    @property
    def tangent_height(self) -> float:
        return self.diameter

    @property
    def head_volume(self) -> float:
        return 0.0

    @property
    def shell_volume(self) -> float:
        return (math.pi * self.diameter**2 / 4) * self.length

    @property
    def head_surface_area(self) -> float:
        return 2 * (math.pi * self.diameter**2 / 4)

    @property
    def shell_surface_area(self) -> float:
        return math.pi * self.diameter * self.length

    @property
    def working_volume(self) -> float:
        return self.shell_liquid_volume(self.liquid_level)

    @property
    def tangent_volume(self) -> float:
        return self.shell_volume
