"""Horizontal head integration utilities."""

from __future__ import annotations

import math
from typing import Callable

from pes_calc.vessels.integration import safe_integrate


def calculate_horizontal_head_volume(
    radius_fn: Callable[[float], float],
    length: float,
    diameter: float,
    liquid_level: float,
) -> float:
    """Compute liquid volume in a horizontal head by numerical integration."""
    if liquid_level <= 0:
        return 0.0
    if liquid_level >= diameter:
        return safe_integrate(lambda x: math.pi * radius_fn(x) ** 2, 0.0, length)

    radius = diameter / 2

    def area_at(x: float) -> float:
        r = radius_fn(x)
        if r <= 0:
            return 0.0
        dist = abs(radius - liquid_level)
        if dist >= r:
            if liquid_level > radius:
                return math.pi * r**2
            return 0.0
        if liquid_level < radius:
            local_depth = r - dist
        else:
            local_depth = r + dist
        term1 = r**2 * math.acos((r - local_depth) / r)
        term2 = (r - local_depth) * math.sqrt(2 * r * local_depth - local_depth**2)
        return term1 - term2

    return safe_integrate(area_at, 0.0, length)


def calculate_horizontal_head_area(
    radius_fn: Callable[[float], float],
    derivative_fn: Callable[[float], float],
    length: float,
    diameter: float,
    liquid_level: float,
) -> float:
    """Compute wetted surface area in a horizontal head by numerical integration."""
    if liquid_level <= 0:
        return 0.0

    is_full = liquid_level >= diameter
    radius = diameter / 2

    def area_at(x: float) -> float:
        r = radius_fn(x)
        dr = derivative_fn(x)
        arc_factor = math.sqrt(1 + dr**2)
        if r <= 0:
            return 0.0
        if is_full:
            return 2 * math.pi * r * arc_factor
        dist = abs(radius - liquid_level)
        if dist >= r:
            if liquid_level > radius:
                return 2 * math.pi * r * arc_factor
            return 0.0
        alpha = math.acos(dist / r)
        if liquid_level < radius:
            wetted_arc = 2 * r * alpha
        else:
            wetted_arc = 2 * math.pi * r - 2 * r * alpha
        return wetted_arc * arc_factor

    return safe_integrate(area_at, 0.0, length)
