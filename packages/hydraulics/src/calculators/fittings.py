"""Fitting loss coefficients using the 2-K method."""
from __future__ import annotations

from dataclasses import dataclass
from math import pi
from typing import Dict, Optional, Tuple

from fluids.friction import friction_factor

from network_hydraulic.calculators.base import LossCalculator
from network_hydraulic.models.fluid import Fluid
from network_hydraulic.models.pipe_section import Fitting, PipeSection
from network_hydraulic.models.results import FittingBreakdown

INCHES_PER_METER = 1 / 0.0254


FITTING_COEFFICIENTS: Dict[str, object] = {
    "elbow_90": {
        "scrd": (800.0, 0.4),
        "sr": (800.0, 0.25),
        "lr": (800.0, 0.2),
        "default": (800.0, 0.2),
    },
    "elbow_45": {
        "scrd": (500.0, 0.2),
        "sr": (500.0, 0.2),
        "lr": (500.0, 0.15),
        "default": (500.0, 0.15),
    },
    "u_bend": {
        "scrd": (1000.0, 0.6),
        "sr": (1000.0, 0.35),
        "lr": (1000.0, 0.3),
        "default": (1000.0, 0.3),
    },
    "tee_elbow": {
        "scrd": (500.0, 0.7),
        "sr": (800.0, 0.8),
        "lr": (800.0, 0.4),
        "default": (500.0, 0.7),
    },
    "tee_through": {
        "scrd": (200.0, 0.1),
        "sr": (150.0, 0.05),
        "lr": (150.0, 0.05),
        "stub_in": (100.0, 0.0),
        "default": (150.0, 0.05),
    },
    "stub_in_elbow": (1000.0, 1.0),
    "block_valve_full_line_size": (300.0, 0.1),
    "block_valve_reduced_trim_0.9d": (500.0, 0.15),
    "block_valve_reduced_trim_0.8d": (1000.0, 0.25),
    "globe_valve": (1500.0, 4.0),
    "diaphragm_valve": (1000.0, 2.0),
    "butterfly_valve": (800.0, 0.25),
    "check_valve_swing": (1500.0, 1.5),
    "lift_check_valve": (2000.0, 10.0),
    "tilting_check_valve": (1000.0, 0.5),
}


@dataclass
class FittingLossCalculator(LossCalculator):
    """Derive per-fitting K values using the 2-K method."""

    fluid: Fluid
    default_pipe_diameter: Optional[float] = None

    def calculate(self, section: PipeSection) -> None:
        """Compute total fitting K for the section and capture a breakdown."""
        details = section.calculation_output.pressure_drop
        details.fitting_breakdown = []
        if not section.has_pipeline_segment:
            section.fitting_K = 0.0
            return
        if section.control_valve or section.orifice:
            section.fitting_K = 0.0
            details.fitting_breakdown = []
            return
        if not section.fittings:
            section.fitting_K = 0.0
            return

        diameter = self._pipe_diameter(section)
        velocity = self._velocity(section, diameter)

        if section.temperature is None or section.temperature <= 0:
            raise ValueError("section.temperature must be set and positive for fittings calculations")
        if section.pressure is None or section.pressure <= 0:
            raise ValueError("section.pressure must be set and positive for fittings calculations")

        density = self.fluid.current_density(section.temperature, section.pressure)
        viscosity = self._require_positive(self.fluid.viscosity, "viscosity")
        reynolds = density * abs(velocity) * diameter / viscosity
        if reynolds <= 0:
            raise ValueError("Unable to compute Reynolds number for fittings calculation")

        total_k = 0.0
        breakdown: list[FittingBreakdown] = []
        for fitting in section.fittings:
            k_value = self._fitting_k(fitting, section, reynolds, diameter)
            count = fitting.count or 1
            breakdown.append(
                FittingBreakdown(
                    type=fitting.type,
                    count=count,
                    k_each=k_value / count,
                    k_total=k_value,
                )
            )
            total_k += k_value

        section.fitting_K = total_k
        details.fitting_breakdown = breakdown

    def _pipe_diameter(self, section: PipeSection) -> float:
        """Return the first positive diameter defined on the section or calculator."""
        for candidate in (section.pipe_diameter, self.default_pipe_diameter):
            if candidate and candidate > 0:
                return candidate
        raise ValueError("Pipe diameter is required to evaluate fittings with the 2-K method")

    def _velocity(self, section: PipeSection, diameter: float) -> float:
        """Compute axial velocity from the current volumetric flow rate."""
        flow_rate = section.current_volumetric_flow_rate(self.fluid)
        area = 0.25 * pi * diameter * diameter
        if area <= 0:
            raise ValueError("Pipe diameter must be positive to determine velocity")
        return flow_rate / area

    def _fitting_k(
        self,
        fitting: Fitting,
        section: PipeSection,
        reynolds: float,
        pipe_diameter: float,
    ) -> float:
        """Return the K value for one fitting, scaled by its count."""
        ftype = fitting.type
        coeffs = self._coefficients_for(ftype, section)
        if coeffs:
            k_value = self._two_k(coeffs[0], coeffs[1], reynolds, pipe_diameter)
        elif ftype == "pipe_entrance_normal":
            k_value = self._entrance_k(section, reynolds, pipe_diameter, 0.5)
        elif ftype == "pipe_entrance_raise":
            k_value = self._entrance_k(section, reynolds, pipe_diameter, 1.0)
        elif ftype == "pipe_exit":
            k_value = self._exit_k(section, pipe_diameter)
        elif ftype == "inlet_swage":
            k_value = self._inlet_swage_k(section, reynolds, pipe_diameter)
        elif ftype == "outlet_swage":
            k_value = self._outlet_swage_k(section, reynolds, pipe_diameter)
        else:
            raise ValueError(f"Unsupported fitting type '{ftype}' for 2-K calculation")
        return k_value * fitting.count

    def _coefficients_for(self, fitting_type: str, section: PipeSection) -> Optional[Tuple[float, float]]:
        """Look up (k1, kinf) coefficients for the given fitting and style."""
        entry = FITTING_COEFFICIENTS.get(fitting_type)
        if entry is None:
            return None
        if isinstance(entry, tuple):
            return entry
        style = self._normalized_style(section)
        for key in (style, "default"):
            if key and key in entry:
                return entry[key]
        return None

    def _normalized_style(self, section: PipeSection) -> str:
        """Normalize the section fitting style string to a lookup key."""
        raw = (section.fitting_type or "").strip().lower()
        if raw in {"scrd", "sr", "lr"}:
            return raw
        if raw in {"stub-in", "stub_in", "stab-in"}:
            return "stub_in"
        return "default"

    def _two_k(self, k1: float, kinf: float, reynolds: float, diameter: float) -> float:
        """Compute the K value from the two-constant correlation."""
        diameter_in = diameter * INCHES_PER_METER
        return k1 / reynolds + kinf * (1.0 + 1.0 / diameter_in)

    @staticmethod
    def _diameter_ratio(numerator: Optional[float], denominator: Optional[float]) -> float:
        """Return a positive diameter ratio, defaulting to 1 when data is missing."""
        if numerator is None or denominator is None or denominator <= 0:
            return 1.0
        return max(0.0, numerator / denominator)

    def _exit_k(self, section: PipeSection, pipe_diameter: float, base: float = 1.0) -> float:
        """Losses due to exit expansion that dumps into a reservoir."""
        outlet = self._outlet_diameter(section) or pipe_diameter
        ratio = self._diameter_ratio(pipe_diameter, outlet)
        return base * ratio**4

    def _entrance_k(
        self,
        section: PipeSection,
        reynolds: float,
        pipe_diameter: float,
        base: float = 1.0,
    ) -> float:
        """Losses at the pipe entrance, optionally applying additional base factors."""
        inlet = self._inlet_diameter(section) or pipe_diameter
        ratio = self._diameter_ratio(pipe_diameter, inlet)
        return (160.0 / reynolds + base) * ratio**4

    def _inlet_swage_k(self, section: PipeSection, reynolds: float, pipe_diameter: float) -> float:
        """Combined reducer + expander loss for the inlet swage."""
        inlet = self._inlet_diameter(section) or pipe_diameter
        corrected_re = reynolds * (pipe_diameter / inlet) if inlet else reynolds
        reducer = self._reducer_k(corrected_re, inlet, pipe_diameter, section.roughness)
        expander = self._expander_k(corrected_re, inlet, pipe_diameter, section.roughness)
        return reducer + expander

    def _outlet_swage_k(self, section: PipeSection, reynolds: float, pipe_diameter: float) -> float:
        """Combined reducer + expander loss for the outlet swage."""
        outlet = self._outlet_diameter(section) or pipe_diameter
        reducer = self._reducer_k(reynolds, pipe_diameter, outlet, section.roughness)
        expander = self._expander_k(reynolds, pipe_diameter, outlet, section.roughness)
        ratio = pipe_diameter / outlet if outlet else 1.0
        return (reducer + expander) * ratio**4

    def _reducer_k(
        self,
        reynolds: float,
        diameter_inlet: Optional[float],
        diameter_outlet: Optional[float],
        roughness: Optional[float],
    ) -> float:
        """Loss coefficient for a reducer with the provided hydraulic data."""
        if (
            reynolds <= 0
            or not diameter_inlet
            or not diameter_outlet
            or diameter_outlet >= diameter_inlet
        ):
            return 0.0

        ratio = diameter_inlet / diameter_outlet
        ratio2 = ratio * ratio
        ratio4 = ratio2 * ratio2
        if reynolds <= 2500.0:
            k_value = (1.2 + 160.0 / reynolds) * (ratio4 - 1.0)
        else:
            e_d = self._relative_roughness(roughness, diameter_inlet)
            fd = friction_factor(Re=reynolds, eD=e_d)
            k_value = (0.6 + 0.48 * fd) * ratio2 * (ratio2 - 1.0)
        return k_value * 0.75 / ratio4

    def _expander_k(
        self,
        reynolds: float,
        diameter_inlet: Optional[float],
        diameter_outlet: Optional[float],
        roughness: Optional[float],
    ) -> float:
        """Loss coefficient for an expander with the provided hydraulic data."""
        if (
            reynolds <= 0
            or not diameter_inlet
            or not diameter_outlet
            or diameter_outlet <= diameter_inlet
        ):
            return 0.0

        ratio = diameter_inlet / diameter_outlet
        ratio2 = ratio * ratio
        ratio4 = ratio2 * ratio2
        if reynolds < 4000.0:
            k_value = 2.0 * (1.0 - ratio4)
        else:
            e_d = self._relative_roughness(roughness, diameter_inlet)
            fd = friction_factor(Re=reynolds, eD=e_d)
            delta = 1.0 - ratio2
            k_value = (1.0 + 0.8 * fd) * (delta * delta)
        return k_value / ratio4

    @staticmethod
    def _relative_roughness(roughness: Optional[float], diameter: float) -> float:
        """Return roughness divided by diameter, tolerating optional values."""
        if not roughness or roughness <= 0:
            return 0.0
        return roughness / diameter

    def _inlet_diameter(self, section: PipeSection) -> Optional[float]:
        """Prefer the explicit inlet diameter, falling back to pipe/default."""
        return section.inlet_diameter or section.pipe_diameter or self.default_pipe_diameter

    def _outlet_diameter(self, section: PipeSection) -> Optional[float]:
        """Prefer the explicit outlet diameter, falling back to pipe/default."""
        return section.outlet_diameter or section.pipe_diameter or self.default_pipe_diameter

    @staticmethod
    def _require_positive(value: Optional[float], name: str) -> float:  # pragma: no cover - defensive
        """Validate that the given scalar is a positive float."""
        if value is None or value <= 0:
            raise ValueError(f"{name} must be positive for fittings calculations")
        return value
