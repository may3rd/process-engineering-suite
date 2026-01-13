"""Numerical integration helpers for vessel geometry."""

from __future__ import annotations

from typing import Callable


def integrate(func: Callable[[float], float], a: float, b: float, n: int = 100) -> float:
    """Integrate a function using Simpson's 1/3 rule."""
    if n % 2 != 0:
        n += 1
    h = (b - a) / n
    total = func(a) + func(b)
    for i in range(1, n):
        x = a + i * h
        total += (2 if i % 2 == 0 else 4) * func(x)
    return (total * h) / 3


def safe_integrate(func: Callable[[float], float], a: float, b: float) -> float:
    """Integrate and return 0.0 if evaluation fails."""
    try:
        return integrate(func, a, b)
    except Exception:
        return 0.0
