"""Horizontal conical vessel geometry."""

from __future__ import annotations

from pes_calc.vessels.horizontal_flat_vessel import HorizontalFlatVessel
from pes_calc.vessels.horizontal_integration import (
    calculate_horizontal_head_area,
    calculate_horizontal_head_volume,
)


class HorizontalConicalVessel(HorizontalFlatVessel):
    """Horizontal conical vessel model."""

    vessel_type = "Horizontal Conical Vessel"

    def __init__(self, diameter: float = 3, length: float = 9, head_distance: float = 0.0) -> None:
        super().__init__(diameter, length)
        self.head_distance = head_distance

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

    def _get_radius_at(self, z: float) -> float:
        if self.head_distance <= 0:
            return 0.0
        return (self.diameter / 2) * (z / self.head_distance)

    def _get_derivative_at(self, z: float) -> float:
        if self.head_distance <= 0:
            return 0.0
        return (self.diameter / 2) / self.head_distance

    def head_liquid_volume(self, value: float) -> float:
        return 2 * calculate_horizontal_head_volume(
            lambda z: self._get_radius_at(z),
            self.head_distance,
            self.diameter,
            value,
        )

    def head_wetted_area(self, value: float) -> float:
        return 2 * calculate_horizontal_head_area(
            lambda z: self._get_radius_at(z),
            lambda z: self._get_derivative_at(z),
            self.head_distance,
            self.diameter,
            value,
        )

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
