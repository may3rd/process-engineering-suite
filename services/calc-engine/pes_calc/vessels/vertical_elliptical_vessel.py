"""Vertical elliptical vessel geometry."""

from __future__ import annotations

import math

from pes_calc.vessels.vertical_torispherical_vessel import VerticalTorisphericalVessel

FD_ELLIP = 0.9045
FK_ELLIP = 0.1727


class VerticalEllipticalVessel(VerticalTorisphericalVessel):
    """Vertical elliptical vessel model."""

    vessel_type = "Vertical Elliptical Vessels"

    def __init__(
        self, diameter: float = 3, length: float = 9, fd: float = FD_ELLIP, fk: float = FK_ELLIP
    ) -> None:
        super().__init__(diameter, length, fd, fk)

    @property
    def head_distance(self) -> float:
        return self.diameter / 4

    @head_distance.setter
    def head_distance(self, value: float) -> None:
        if value < 0:
            raise ValueError("Head distance must be non-negative")
        self._head_distance = value

    def bottom_head_liquid_volume(self, value: float) -> float:
        if value < 0:
            return 0.0
        return _elliptical_head_volume(
            self.diameter / 2,
            self.diameter / 2,
            self.head_distance,
            min(value, self.head_distance),
        )

    def top_head_liquid_volume(self, value: float) -> float:
        if value <= self.head_distance + self.length:
            return 0.0
        val = self.total_height - min(value, self.total_height)
        v1 = _elliptical_head_volume(
            self.diameter / 2,
            self.diameter / 2,
            self.head_distance,
            self.head_distance,
        )
        v2 = _elliptical_head_volume(
            self.diameter / 2,
            self.diameter / 2,
            self.head_distance,
            val,
        )
        return v1 - v2


def _elliptical_head_volume(
    x_radii: float, y_radii: float, z_radii: float, cap_height: float
) -> float:
    if z_radii == 0:
        return 0.0
    return (
        math.pi
        * x_radii
        * y_radii
        * cap_height**2
        * (3 * z_radii - cap_height)
        / (3 * z_radii**2)
    )
