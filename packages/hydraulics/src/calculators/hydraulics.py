"""Pipe friction and fitting losses."""
from __future__ import annotations

from dataclasses import dataclass
from math import pi, log10, sqrt
from typing import Optional

from fluids.friction import friction_factor as colebrook_friction_factor
from fluids.friction import Shacham_1980 as shacham_friction_factor

from network_hydraulic.calculators.base import LossCalculator
from network_hydraulic.models.fluid import Fluid
from network_hydraulic.models.pipe_section import PipeSection


@dataclass
class FrictionCalculator(LossCalculator):
    """Compute straight-pipe resistance using the Darcy–Weisbach equation."""

    fluid: Fluid
    default_pipe_diameter: Optional[float] = None
    friction_factor_override: Optional[float] = None
    friction_factor_type: str = "darcy"

    def calculate(self, section: PipeSection) -> None:
        pressure_drop = section.calculation_output.pressure_drop
        if not section.has_pipeline_segment or section.control_valve or section.orifice:
            section.pipe_length_K = 0.0
            pressure_drop.pipe_and_fittings = 0.0
            section.equivalent_length = None
            return
        diameter = self._pipe_diameter(section)
        area = 0.25 * pi * diameter * diameter

        if section.temperature is None or section.temperature <= 0:
            raise ValueError("section.temperature must be set and positive for friction calculations")
        if section.pressure is None or section.pressure <= 0:
            raise ValueError("section.pressure must be set and positive for friction calculations")

        flow_rate = self._determine_flow_rate(section)
        velocity = flow_rate / area

        density = self.fluid.current_density(section.temperature, section.pressure)
        viscosity = self._require_positive(self.fluid.viscosity, "viscosity")
        reynolds = density * abs(velocity) * diameter / viscosity
        if reynolds <= 0:
            raise ValueError("Unable to compute Reynolds number for friction calculation")

        length = section.length or 0.0
        friction = 0.0  # Initialize friction
        if length > 0:
            friction = self._friction_factor(reynolds, section.roughness or 0.0, diameter)
            pipe_k = self._pipe_k(friction, length, diameter)
        else:
            pipe_k = 0.0
        section.pipe_length_K = pipe_k
        fitting_k = section.fitting_K or 0.0
        total_k = pipe_k + fitting_k
        # apply safety factor
        if section.piping_and_fitting_safety_factor:
            total_k *= section.piping_and_fitting_safety_factor
        section.total_K = total_k
        # determine equivalent length
        if friction > 0.0 and total_k > 0.0:
            section.equivalent_length = total_k * diameter / friction
        else:
            section.equivalent_length = None
        if total_k <= 0:
            delta_p = 0.0
        else:
            delta_p = total_k * density * velocity * velocity / 2.0

        pressure_drop.pipe_and_fittings = delta_p
        total = pressure_drop.total_segment_loss or 0.0
        pressure_drop.total_segment_loss = total + delta_p
        pressure_drop.reynolds_number = reynolds
        pressure_drop.frictional_factor = self._convert_for_output(friction)
        pressure_drop.flow_scheme = self._determine_flow_scheme(reynolds)

    def _determine_flow_scheme(self, reynolds: float) -> str:
        if reynolds < 2000:
            return "laminar"
        elif reynolds > 4000:
            return "turbulent"
        else:
            return "transition"

    def _determine_flow_rate(self, section: PipeSection) -> float:
        try:
            flow_rate = section.current_volumetric_flow_rate(self.fluid)
        except ValueError as e:
            raise ValueError(f"Volumetric flow rate is required for friction calculations: {e}")
        return flow_rate

    def _pipe_diameter(self, section: PipeSection) -> float:
        for candidate in (section.pipe_diameter, self.default_pipe_diameter):
            if candidate and candidate > 0:
                return candidate
        raise ValueError("Pipe diameter is required for friction calculations")

    @staticmethod
    def _pipe_k(friction: float, length: float, diameter: float) -> float:
        if friction <= 0 or length <= 0 or diameter <= 0:
            return 0.0
        return friction * (length / diameter)

    def _friction_factor(self, reynolds: float, roughness: float, diameter: float) -> float:
        if self.friction_factor_override and self.friction_factor_override > 0:
            return self._to_darcy(self.friction_factor_override)
        rel_roughness = roughness / diameter if diameter > 0 and roughness > 0 else 0.0
        ff = shacham_friction_factor(Re=reynolds, eD=rel_roughness)
        return ff

    def _to_darcy(self, value: float) -> float:
        kind = (self.friction_factor_type or "darcy").strip().lower()
        if kind in {"darcy", "d"}:
            return value
        if kind in {"fanning", "f"}:
            return value * 4.0
        raise ValueError(f"Unknown friction_factor_type '{self.friction_factor_type}'. Expected 'darcy' or 'fanning'.")

    def _convert_for_output(self, darcy_value: float) -> float:
        kind = (self.friction_factor_type or "darcy").strip().lower()
        if kind in {"darcy", "d"}:
            return darcy_value
        if kind in {"fanning", "f"}:
            return darcy_value / 4.0
        raise ValueError(f"Unknown friction_factor_type '{self.friction_factor_type}'. Expected 'darcy' or 'fanning'.")

    @staticmethod
    def _require_positive(value: Optional[float], name: str) -> float:  # pragma: no cover - defensive
        if value is None or value <= 0:
            raise ValueError(f"{name} must be positive for friction calculations")
        return value
    
