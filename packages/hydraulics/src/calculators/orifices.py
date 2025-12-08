"""Orifice pressure loss calculations."""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

from fluids.flow_meter import (
    ISO_5167_ORIFICE,
    differential_pressure_meter_C_epsilon,
    differential_pressure_meter_solver,
    dP_orifice,
)

from packages.hydraulics.src.calculators.base import LossCalculator
from packages.hydraulics.src.models.components import Orifice
from packages.hydraulics.src.models.fluid import Fluid
from packages.hydraulics.src.models.pipe_section import PipeSection

logger = logging.getLogger(__name__)


@dataclass
class OrificeCalculator(LossCalculator):
    fluid: Fluid
    default_pipe_diameter: Optional[float] = None
    mass_flow_rate: Optional[float] = None

    def calculate(
        self,
        section: PipeSection,
        *,
        inlet_pressure_override: Optional[float] = None,
        mass_flow_override: Optional[float] = None,
    ) -> None:
        orifice = section.orifice
        if orifice is None:
            return
        orifice.calculation_note = None

        pressure_drop = section.calculation_output.pressure_drop
        has_ratio = bool(orifice.d_over_D_ratio and orifice.d_over_D_ratio > 0)
        has_orifice_diameter = bool(orifice.orifice_diameter and orifice.orifice_diameter > 0)
        has_drop = orifice.pressure_drop is not None

        if not (has_ratio or has_orifice_diameter or has_drop):
            raise ValueError(
                "Orifice requires d_over_D_ratio, orifice_diameter, or pressure_drop to be specified"
            )

        mass_flow = None
        if not has_drop:
            mass_flow = self._mass_flow_rate(section, mass_flow_override)
        if has_drop:
            pipe_diameter = self._maybe_pipe_diameter(section)
            drop = max(orifice.pressure_drop or 0.0, 0.0)
            
            # If only pressure_drop is provided (no geometry), solve for beta ratio
            if not has_ratio and not has_orifice_diameter:
                mass_flow = self._mass_flow_rate(section, mass_flow_override)
                if mass_flow and pipe_diameter and drop > 0:
                    try:
                        beta = self._solve_beta_from_drop(
                            section, drop, pipe_diameter, mass_flow, inlet_pressure_override
                        )
                        orifice.d_over_D_ratio = beta
                        orifice.orifice_diameter = beta * pipe_diameter
                        orifice.pipe_diameter = pipe_diameter
                        orifice.calculation_note = (
                            f"Calculated beta ratio ({beta:.4f}) from pressure_drop ({self._format_drop(drop)})."
                        )
                    except Exception as exc:
                        logger.warning(
                            "Failed to solve beta from drop for section %s: %s",
                            section.id,
                            exc,
                        )
                        self._backfill_geometry_from_drop(orifice, pipe_diameter)
                        orifice.calculation_note = (
                            f"Used specified pressure_drop ({self._format_drop(drop)}). Could not determine beta ratio."
                        )
                else:
                    self._backfill_geometry_from_drop(orifice, pipe_diameter)
                    orifice.calculation_note = (
                        f"Used specified pressure_drop ({self._format_drop(drop)}). Missing flow or diameter for beta calculation."
                    )
            else:
                self._backfill_geometry_from_drop(orifice, pipe_diameter)
                orifice.calculation_note = (
                    f"Used specified pressure_drop ({self._format_drop(drop)})."
                )
        elif mass_flow is None:
            drop = 0.0
            orifice.pressure_drop = drop
            orifice.calculation_note = (
                orifice.calculation_note
                or "Skipped orifice calculation: mass_flow_rate unavailable"
            )
        else:
            drop = self._compute_drop(section, orifice, inlet_pressure_override, mass_flow)
            orifice.pressure_drop = drop

        pressure_drop.orifice_pressure_drop = drop
        baseline = pressure_drop.total_segment_loss or 0.0
        pressure_drop.total_segment_loss = baseline + drop

    def _compute_drop(
        self,
        section: PipeSection,
        orifice: Orifice,
        inlet_pressure_override: Optional[float],
        mass_flow: float,
    ) -> float:
        pipe_diameter = self._pipe_diameter(section)
        orifice_diameter = self._orifice_diameter(orifice, pipe_diameter)
        if orifice.pipe_diameter is None:
            orifice.pipe_diameter = pipe_diameter
        if orifice.orifice_diameter is None:
            orifice.orifice_diameter = orifice_diameter
        inlet_pressure = (
            inlet_pressure_override
            if inlet_pressure_override is not None
            else self._inlet_pressure(section)
        )
        if inlet_pressure is None or inlet_pressure <= 0:
            raise ValueError("Orifice inlet pressure must be positive")
        if section.temperature is None or section.temperature <= 0:
            raise ValueError("section.temperature must be set and positive for orifice calculations")
        if section.pressure is None or section.pressure <= 0:
            raise ValueError("section.pressure must be set and positive for orifice calculations")

        density = self._fluid_density(section.temperature, section.pressure)
        viscosity = self._fluid_viscosity()
        isentropic_exponent = self._isentropic_exponent()
        meter_type = orifice.meter_type or 'orifice' # ISO_5167_ORIFICE

        try:
            outlet_pressure = differential_pressure_meter_solver(
                D=pipe_diameter,
                D2=orifice_diameter,
                P1=inlet_pressure,
                P2=None,
                rho=density,
                mu=viscosity,
                k=isentropic_exponent,
                m=mass_flow,
                meter_type=meter_type,
                taps=orifice.taps,
                tap_position=orifice.tap_position,
                C_specified=orifice.discharge_coefficient,
                epsilon_specified=orifice.expansibility,
            )
            discharge_coefficient, expansibility = differential_pressure_meter_C_epsilon(
                D=pipe_diameter,
                D2=orifice_diameter,
                m=mass_flow,
                P1=inlet_pressure,
                P2=outlet_pressure,
                rho=density,
                mu=viscosity,
                k=isentropic_exponent,
                meter_type=meter_type,
                taps=orifice.taps,
                tap_position=orifice.tap_position,
                C_specified=orifice.discharge_coefficient,
                epsilon_specified=orifice.expansibility,
            )
            orifice.discharge_coefficient = discharge_coefficient
            orifice.expansibility = expansibility
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning(
                "Failed to solve orifice drop for section %s (tag=%s): %s",
                section.id,
                getattr(orifice, "tag", None),
                exc,
            )
            outlet_pressure = inlet_pressure
            discharge_coefficient = 0.0
            orifice.discharge_coefficient = discharge_coefficient
            orifice.expansibility = None
            orifice.calculation_note = f"Failed to solve orifice drop: {exc}"
        drop = dP_orifice(
            pipe_diameter,
            orifice_diameter,
            inlet_pressure,
            outlet_pressure,
            discharge_coefficient,
        )
        if orifice.calculation_note is None:
            meter_label = str(meter_type or ISO_5167_ORIFICE)
            orifice.calculation_note = (
                f"Calculated pressure_drop via {meter_label} solver ({self._format_drop(drop)})."
            )
        return drop

    def _maybe_pipe_diameter(self, section: PipeSection) -> Optional[float]:
        try:
            diameter = self._pipe_diameter(section)
        except ValueError:
            return None
        return diameter

    def _backfill_geometry_from_drop(
        self,
        orifice: Orifice,
        pipe_diameter: Optional[float],
    ) -> None:
        if orifice.pipe_diameter is None and pipe_diameter is not None:
            orifice.pipe_diameter = pipe_diameter

        if pipe_diameter is None:
            return

        if orifice.orifice_diameter and orifice.orifice_diameter > 0:
            orifice.d_over_D_ratio = orifice.orifice_diameter / pipe_diameter
            return

        if orifice.d_over_D_ratio and orifice.d_over_D_ratio > 0:
            orifice.orifice_diameter = orifice.d_over_D_ratio * pipe_diameter

    def _pipe_diameter(self, section: PipeSection) -> float:
        if section.orifice and section.orifice.pipe_diameter and section.orifice.pipe_diameter > 0:
            return section.orifice.pipe_diameter
        if section.pipe_diameter and section.pipe_diameter > 0:
            return section.pipe_diameter
        if self.default_pipe_diameter and self.default_pipe_diameter > 0:
            return self.default_pipe_diameter
        raise ValueError("Pipe diameter is required for orifice calculations")

    def _orifice_diameter(self, orifice: Orifice, pipe_diameter: float) -> float:
        if orifice.d_over_D_ratio and orifice.d_over_D_ratio > 0:
            diameter = orifice.d_over_D_ratio * pipe_diameter
            if orifice.orifice_diameter is None:
                orifice.orifice_diameter = diameter
            return diameter
        if orifice.orifice_diameter and orifice.orifice_diameter > 0:
            if orifice.pipe_diameter is None:
                orifice.pipe_diameter = pipe_diameter
            orifice.d_over_D_ratio = orifice.orifice_diameter / pipe_diameter
            return orifice.orifice_diameter
        raise ValueError("Either orifice diameter or d_over_D_ratio must be provided")

    def _inlet_pressure(self, section: PipeSection) -> float:
        summary = section.result_summary.inlet
        if summary.pressure and summary.pressure > 0:
            return summary.pressure
        if section.pressure is None or section.pressure <= 0:
            raise ValueError("section.pressure must be set and positive for orifice calculations")
        return section.pressure

    def _fluid_density(self, temperature: float, pressure: float) -> float:
        density = self.fluid.current_density(temperature, pressure)
        if density <= 0:
            raise ValueError("Fluid density must be positive for orifice calculations")
        return density

    def _fluid_viscosity(self) -> float:
        if self.fluid.viscosity <= 0:
            raise ValueError("Fluid viscosity must be positive for orifice calculations")
        return self.fluid.viscosity

    def _isentropic_exponent(self) -> float:
        if self.fluid.specific_heat_ratio and self.fluid.specific_heat_ratio > 0:
            return self.fluid.specific_heat_ratio
        return 1.4

    def _mass_flow_rate(
        self,
        section: PipeSection,
        mass_flow_override: Optional[float],
    ) -> Optional[float]:
        if mass_flow_override is not None:
            if mass_flow_override <= 0:
                raise ValueError("Mass flow rate is required for orifice calculations")
            return mass_flow_override
        if section.mass_flow_rate is not None:
            if section.mass_flow_rate <= 0:
                raise ValueError("Mass flow rate is required for orifice calculations")
            return section.mass_flow_rate
        if self.mass_flow_rate is not None:
            if self.mass_flow_rate <= 0:
                raise ValueError("Mass flow rate is required for orifice calculations")
            return self.mass_flow_rate
        return None

    def _solve_beta_from_drop(
        self,
        section: PipeSection,
        target_drop: float,
        pipe_diameter: float,
        mass_flow: float,
        inlet_pressure_override: Optional[float],
    ) -> float:
        """Solve for beta ratio that produces the target pressure drop using bisection."""
        inlet_pressure = (
            inlet_pressure_override
            if inlet_pressure_override is not None
            else self._inlet_pressure(section)
        )
        if inlet_pressure is None or inlet_pressure <= 0:
            raise ValueError("Cannot solve beta: inlet pressure must be positive")
        if section.temperature is None or section.temperature <= 0:
            raise ValueError("Cannot solve beta: temperature must be positive")
        if section.pressure is None or section.pressure <= 0:
            raise ValueError("Cannot solve beta: pressure must be positive")

        density = self._fluid_density(section.temperature, section.pressure)
        viscosity = self._fluid_viscosity()
        isentropic_exponent = self._isentropic_exponent()

        def compute_drop_for_beta(beta: float) -> float:
            """Compute pressure drop for a given beta ratio."""
            orifice_diameter = beta * pipe_diameter
            try:
                outlet_pressure = differential_pressure_meter_solver(
                    D=pipe_diameter,
                    D2=orifice_diameter,
                    P1=inlet_pressure,
                    P2=None,
                    rho=density,
                    mu=viscosity,
                    k=isentropic_exponent,
                    m=mass_flow,
                    meter_type='orifice',
                    taps=None,
                    tap_position=None,
                    C_specified=None,
                    epsilon_specified=None,
                )
                discharge_coefficient, _ = differential_pressure_meter_C_epsilon(
                    D=pipe_diameter,
                    D2=orifice_diameter,
                    m=mass_flow,
                    P1=inlet_pressure,
                    P2=outlet_pressure,
                    rho=density,
                    mu=viscosity,
                    k=isentropic_exponent,
                    meter_type='orifice',
                    taps=None,
                    tap_position=None,
                    C_specified=None,
                    epsilon_specified=None,
                )
                return dP_orifice(
                    pipe_diameter,
                    orifice_diameter,
                    inlet_pressure,
                    outlet_pressure,
                    discharge_coefficient,
                )
            except Exception:
                return float('inf')  # Invalid beta returns infinite drop

        # Bisection search for beta in range [0.1, 0.99]
        # Smaller beta = larger drop, larger beta = smaller drop
        beta_low = 0.1
        beta_high = 0.99
        
        drop_low = compute_drop_for_beta(beta_low)
        drop_high = compute_drop_for_beta(beta_high)
        
        # Check if target is achievable
        if target_drop > drop_low:
            # Target drop is larger than max possible (smallest beta)
            return beta_low  # Return minimum beta
        if target_drop < drop_high:
            # Target drop is smaller than min possible (largest beta)
            return beta_high  # Return maximum beta
        
        # Bisection iterations
        for _ in range(50):
            beta_mid = (beta_low + beta_high) / 2
            drop_mid = compute_drop_for_beta(beta_mid)
            
            if abs(drop_mid - target_drop) < 1.0:  # 1 Pa tolerance
                return beta_mid
            
            if drop_mid > target_drop:
                # Need larger beta (smaller drop)
                beta_low = beta_mid
            else:
                # Need smaller beta (larger drop)
                beta_high = beta_mid
        
        return (beta_low + beta_high) / 2

    @staticmethod
    def _format_drop(drop: Optional[float]) -> str:
        if drop is None:
            return "N/A"
        return f"{drop:.6g} Pa"

