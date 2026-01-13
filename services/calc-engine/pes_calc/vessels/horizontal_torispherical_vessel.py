"""Horizontal torispherical vessel geometry."""

from __future__ import annotations

import math

from pes_calc.vessels.horizontal_flat_vessel import HorizontalFlatVessel
from pes_calc.vessels.horizontal_integration import (
    calculate_horizontal_head_area,
    calculate_horizontal_head_volume,
)

FD_TORI = 1.0
FK_TORI = 0.06


class HorizontalTorisphericalVessel(HorizontalFlatVessel):
    """Horizontal torispherical vessel model."""

    vessel_type = "Horizontal ToriSpherical Vessel"

    def __init__(
        self, diameter: float = 3, length: float = 9, fd: float = FD_TORI, fk: float = FK_TORI
    ) -> None:
        super().__init__(diameter, length)
        self._fd = fd
        self._fk = fk

    @property
    def fd(self) -> float:
        return self._fd

    @fd.setter
    def fd(self, value: float) -> None:
        self._fd = value

    @property
    def fk(self) -> float:
        return self._fk

    @fk.setter
    def fk(self, value: float) -> None:
        self._fk = value

    @property
    def a1(self) -> float:
        return self.fd * (
            1
            - math.sqrt(
                1
                - ((0.5 - self.fk) * (0.5 - self.fk))
                / ((self.fd - self.fk) * (self.fd - self.fk))
            )
        )

    @property
    def a2(self) -> float:
        return self.fd - math.sqrt(self.fd**2 - 2 * self.fd * self.fk + self.fk - 0.25)

    @property
    def head_distance(self) -> float:
        return self.a2 * self.diameter

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
        x = z / self.diameter
        if x <= self.a1:
            val = self.fd**2 - (x - self.fd) ** 2
            return 0.0 if val < 0 else self.diameter * math.sqrt(val)
        val = self.fk**2 - (x - self.a2) ** 2
        return 0.0 if val < 0 else self.diameter * (0.5 - self.fk + math.sqrt(val))

    def _get_derivative_at(self, z: float) -> float:
        x = z / self.diameter
        if x <= self.a1:
            r = self._get_radius_at(z)
            if r == 0:
                return 0.0
            return -(self.diameter**2) * (x - self.fd) / r / self.diameter
        val = self.fk**2 - (x - self.a2) ** 2
        sqrt_term = 1e-9 if val <= 0 else math.sqrt(val)
        return -(self.diameter) * (x - self.a2) / sqrt_term / self.diameter

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
