"""Auxiliary models for valves/orifices used inside pipe sections.

Example:
    from network_hydraulic.models.components import ControlValve

    valve = ControlValve(tag="CV-1", cv=20.0, cg=None, pressure_drop=1000.0, C1=20.0)
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass(slots=True)
class ControlValve:
    tag: Optional[str]
    cv: Optional[float]
    cg: Optional[float]
    pressure_drop: Optional[float]
    C1: Optional[float]
    FL: Optional[float] = None
    Fd: Optional[float] = None
    xT: Optional[float] = None
    inlet_diameter: Optional[float] = None
    outlet_diameter: Optional[float] = None
    valve_diameter: Optional[float] = None
    calculation_note: Optional[str] = None
    adjustable: bool = False

    def __post_init__(self) -> None:
        errors: list[str] = []

        if self.cv is not None and self.cv <= 0:
            errors.append("ControlValve cv must be positive if provided")
        if self.cg is not None and self.cg <= 0:
            errors.append("ControlValve cg must be positive if provided")
        if self.pressure_drop is not None and self.pressure_drop <= 0:
            errors.append("ControlValve pressure_drop must be positive if provided")
        if self.C1 is not None and self.C1 <= 0:
            errors.append("ControlValve C1 must be positive if provided")
        if self.FL is not None and self.FL <= 0:
            errors.append("ControlValve FL must be positive if provided")
        if self.Fd is not None and self.Fd <= 0:
            errors.append("ControlValve Fd must be positive if provided")
        if self.xT is not None and self.xT <= 0:
            errors.append("ControlValve xT must be positive if provided")
        if self.inlet_diameter is not None and self.inlet_diameter <= 0:
            errors.append("ControlValve inlet_diameter must be positive if provided")
        if self.outlet_diameter is not None and self.outlet_diameter <= 0:
            errors.append("ControlValve outlet_diameter must be positive if provided")
        if self.valve_diameter is not None and self.valve_diameter <= 0:
            errors.append("ControlValve valve_diameter must be positive if provided")

        if errors:
            raise ValueError("; ".join(errors))


@dataclass(slots=True)
class Orifice:
    tag: Optional[str]
    d_over_D_ratio: Optional[float]
    pressure_drop: Optional[float]
    pipe_diameter: Optional[float] = None
    orifice_diameter: Optional[float] = None
    meter_type: Optional[str] = None
    taps: Optional[str] = None
    tap_position: Optional[str] = None
    discharge_coefficient: Optional[float] = None
    expansibility: Optional[float] = None
    calculation_note: Optional[str] = None

    def __post_init__(self) -> None:
        errors: list[str] = []

        if self.d_over_D_ratio is not None and not (0 <= self.d_over_D_ratio <= 1):
            errors.append("Orifice d_over_D_ratio must be between 0 and 1 (inclusive) if provided")
        if self.pressure_drop is not None and self.pressure_drop <= 0:
            errors.append("Orifice pressure_drop must be positive if provided")
        if self.pipe_diameter is not None and self.pipe_diameter <= 0:
            errors.append("Orifice pipe_diameter must be positive if provided")
        if self.orifice_diameter is not None and self.orifice_diameter <= 0:
            errors.append("Orifice orifice_diameter must be positive if provided")
        if self.discharge_coefficient is not None and self.discharge_coefficient <= 0:
            errors.append("Orifice discharge_coefficient must be positive if provided")
        if self.expansibility is not None and self.expansibility <= 0:
            errors.append("Orifice expansibility must be positive if provided")

        if errors:
            raise ValueError("; ".join(errors))
