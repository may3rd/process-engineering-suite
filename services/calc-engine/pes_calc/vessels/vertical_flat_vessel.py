"""Vertical flat vessel geometry."""

from __future__ import annotations

import math

from pes_calc.vessels.vessel import Vessel


class VerticalFlatVessel(Vessel):
    """Vertical flat vessel model."""

    vessel_type = "Vertical Flat Vessels"

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

    @property
    def bottom_head_distance(self) -> float:
        return self.head_distance

    @property
    def top_head_distance(self) -> float:
        return self.head_distance

    @property
    def total_height(self) -> float:
        return self.length + self.bottom_head_distance + self.top_head_distance

    @property
    def tangent_height(self) -> float:
        return self.length + self.bottom_head_distance

    @property
    def head_volume(self) -> float:
        return self.bottom_head_liquid_volume(self.total_height) + self.top_head_liquid_volume(
            self.total_height
        )

    @property
    def shell_volume(self) -> float:
        return (math.pi * self.diameter**2 / 4) * self.length

    @property
    def effective_volume(self) -> float:
        return self.liquid_volume(self.high_liquid_level + self.bottom_head_distance)

    @property
    def tangent_volume(self) -> float:
        return self.liquid_volume(self.tangent_height)

    @property
    def working_volume(self) -> float:
        return (math.pi * self.diameter**2 / 4) * (self.high_liquid_level - self.low_liquid_level)

    @property
    def head_surface_area(self) -> float:
        return self.bottom_head_wetted_area(self.total_height) + self.top_head_wetted_area(
            self.total_height
        )

    @property
    def shell_surface_area(self) -> float:
        return math.pi * self.diameter * self.length

    def bottom_head_liquid_volume(self, value: float) -> float:
        return 0.0

    def top_head_liquid_volume(self, value: float) -> float:
        return 0.0

    def head_liquid_volume(self, value: float) -> float:
        return self.bottom_head_liquid_volume(value) + self.top_head_liquid_volume(value)

    def shell_liquid_volume(self, value: float) -> float:
        if value <= self.bottom_head_distance:
            return 0.0
        if value <= self.bottom_head_distance + self.length:
            return (math.pi * self.diameter**2 / 4) * (value - self.bottom_head_distance)
        return (math.pi * self.diameter**2 / 4) * self.length

    def bottom_head_wetted_area(self, value: float) -> float:
        return 0.0 if value <= 0 else math.pi * self.diameter**2 / 4

    def top_head_wetted_area(self, value: float) -> float:
        return 0.0 if value < self.total_height else math.pi * self.diameter**2 / 4

    def shell_wetted_area(self, value: float) -> float:
        if value <= self.bottom_head_distance:
            return 0.0
        if value < self.bottom_head_distance + self.length:
            return math.pi * self.diameter * (value - self.bottom_head_distance)
        return math.pi * self.diameter * self.length

    def head_wetted_area(self, value: float) -> float:
        return self.bottom_head_wetted_area(value) + self.top_head_wetted_area(value)
