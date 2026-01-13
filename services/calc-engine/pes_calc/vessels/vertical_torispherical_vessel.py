"""Vertical torispherical vessel geometry."""

from __future__ import annotations

import math

from pes_calc.vessels.integration import safe_integrate
from pes_calc.vessels.vertical_flat_vessel import VerticalFlatVessel

FD_TORI = 1.0
FK_TORI = 0.06


class VerticalTorisphericalVessel(VerticalFlatVessel):
    """Vertical torispherical vessel model."""

    vessel_type = "Vertical ToriSpherical Vessels"

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
    def a3(self) -> float:
        return self.length / self.diameter + self.a2

    @property
    def a4(self) -> float:
        return self.a3 + (self.a2 - self.a1)

    @property
    def a5(self) -> float:
        return self.a3 + self.a2

    @property
    def b1(self) -> float:
        return (self.fd * (0.5 - self.fk)) / (self.fd - self.fk)

    @property
    def b2(self) -> float:
        return 0.5

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

    def head_liquid_volume(self, value: float) -> float:
        return self.bottom_head_liquid_volume(value) + self.top_head_liquid_volume(value)

    def bottom_head_liquid_volume(self, value: float) -> float:
        if value <= 0:
            return 0.0
        if value <= self.bottom_head_height:
            return self._vertical_bottom_fd_head_volume(value)
        return self._vertical_bottom_fd_head_volume(self.bottom_head_height)

    def top_head_liquid_volume(self, value: float) -> float:
        if value < self.tangent_height:
            return 0.0
        return self._vertical_top_fd_head_volume(min(value, self.total_height))

    def head_wetted_area(self, value: float) -> float:
        return self.bottom_head_wetted_area(value) + self.top_head_wetted_area(value)

    def bottom_head_wetted_area(self, value: float) -> float:
        return self._vertical_bottom_fd_head_wetted_area(value)

    def top_head_wetted_area(self, value: float) -> float:
        return self._vertical_top_fd_head_wetted_area(value)

    def _vertical_bottom_fd_head_volume(self, value: float) -> float:
        if value < 0:
            return 0.0
        return self.diameter * safe_integrate(
            lambda x: self._vertical_fd_head_surface_area(x),
            0.0,
            min(value / self.diameter, self.a2),
        )

    def _vertical_top_fd_head_volume(self, value: float) -> float:
        if value <= self.bottom_head_height + self.length:
            return 0.0
        val = self.total_height - value
        a = val / self.diameter
        head_volume = safe_integrate(
            lambda x: self._vertical_fd_head_surface_area(x),
            0.0,
            self.a2,
        )
        sub_volume = safe_integrate(
            lambda x: self._vertical_fd_head_surface_area(x),
            0.0,
            a,
        )
        return (head_volume - sub_volume) * self.diameter

    def _vertical_fd_head_surface_area(self, x: float) -> float:
        if x <= self.a1:
            return math.pi * self.diameter**2 * (self.fd**2 - (x - self.fd) ** 2)
        return (
            math.pi
            * self.diameter**2
            * (0.5 - self.fk + math.sqrt(self.fk**2 - (x - self.a2) ** 2)) ** 2
        )

    def _vertical_bottom_fd_head_wetted_area(self, value: float) -> float:
        if value <= 0.0:
            return 0.0
        a = min(value / self.diameter, self.a2)
        wetted_area = 0.0
        wetted_area += self._vertical_surface_area1(a)
        wetted_area += self._vertical_surface_area2(a)
        return wetted_area

    def _vertical_top_fd_head_wetted_area(self, value: float) -> float:
        if value <= self.bottom_head_height + self.length:
            return 0.0
        val = self.total_height - min(value, self.total_height)
        sa1 = self._vertical_bottom_fd_head_wetted_area(self.top_head_height)
        sa2 = self._vertical_bottom_fd_head_wetted_area(val)
        return sa1 - sa2

    def _vertical_surface_area1(self, a: float) -> float:
        val = min(a, self.a1)
        if val < 0:
            return 0.0
        return 2 * math.pi * self.diameter**2 * self.fd * val

    def _vertical_surface_area2(self, a: float) -> float:
        if a < self.a1:
            return 0.0
        val = min(a, self.a2)
        return (
            2
            * math.pi
            * self.diameter**2
            * self.fk
            * (
                val
                - self.a1
                + (0.5 - self.fk)
                * (math.asin((val - self.a2) / self.fk) - math.asin((self.a1 - self.a2) / self.fk))
            )
        )

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
        return self._vertical_bottom_fd_head_wetted_area(self.total_height) + self._vertical_top_fd_head_wetted_area(
            self.total_height
        )

    @property
    def shell_surface_area(self) -> float:
        return math.pi * self.diameter * self.length
