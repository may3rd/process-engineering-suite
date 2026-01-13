"""Vertical conical vessel geometry."""

from __future__ import annotations

import math

from pes_calc.vessels.vertical_flat_vessel import VerticalFlatVessel


class VerticalConicalVessel(VerticalFlatVessel):
    """Vertical conical vessel model."""

    vessel_type = "Vertical Conical Vessels"

    def __init__(self, diameter: float = 3, length: float = 9, head_distance: float = 0.0) -> None:
        super().__init__(diameter, length)
        self._head_distance = head_distance

    @property
    def head_distance(self) -> float:
        return self._head_distance

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

    def bottom_head_liquid_volume(self, value: float) -> float:
        if value <= 0:
            return 0.0
        return self._head_liquid_volume_fn(min(value, self.bottom_head_height), self.bottom_head_height)

    def top_head_liquid_volume(self, value: float) -> float:
        if value < self.tangent_height:
            return 0.0
        return (
            (1 / 12) * math.pi * self.diameter**2 * self.top_head_height
            - self._head_liquid_volume_fn(
                self.total_height - min(value, self.total_height),
                self.top_head_height,
            )
        )

    def bottom_head_wetted_area(self, value: float) -> float:
        if value < 0:
            return 0.0
        return self.vertical_cone_surface_area(min(value, self.bottom_head_height))

    def top_head_wetted_area(self, value: float) -> float:
        if value < self.tangent_height:
            return 0.0
        return self.vertical_cone_surface_area(self.top_head_height) - self.vertical_cone_surface_area(
            self.total_height - min(value, self.total_height)
        )

    def _head_liquid_volume_fn(self, value: float, head_height: float) -> float:
        if value <= 0.0 or head_height <= 0.0:
            return 0.0
        return (1 / 3) * math.pi * value * ((value * self.diameter) / 2 / head_height) ** 2

    @property
    def total_height(self) -> float:
        return self.length + self.bottom_head_height + self.top_head_height

    @property
    def tangent_height(self) -> float:
        return self.bottom_head_height + self.length

    @property
    def head_volume(self) -> float:
        return self.bottom_head_liquid_volume(self.total_height) + self.top_head_liquid_volume(
            self.total_height
        )

    @property
    def shell_volume(self) -> float:
        return (math.pi * self.diameter**2 / 4) * self.length

    @property
    def head_surface_area(self) -> float:
        return self.bottom_head_wetted_area(self.total_height) + self.top_head_wetted_area(
            self.total_height
        )

    @property
    def shell_surface_area(self) -> float:
        return math.pi * self.diameter * self.length
