"""Vertical flat tank geometry."""

from __future__ import annotations

from pes_calc.vessels.vertical_flat_vessel import VerticalFlatVessel


class VerticalFlatTank(VerticalFlatVessel):
    """Vertical flat tank model."""

    vessel_type = "Vertical Flat Tank"

    def __init__(self, diameter: float = 3, length: float = 9) -> None:
        super().__init__(diameter, length)
