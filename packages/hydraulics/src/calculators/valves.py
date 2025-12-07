"""Control valve pressure loss calculations."""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Callable, Optional

from fluids.control_valve import convert_flow_coefficient, size_control_valve_g, size_control_valve_l

from network_hydraulic.calculators.base import LossCalculator
from network_hydraulic.models.fluid import Fluid
from network_hydraulic.models.pipe_section import PipeSection

MIN_PRESSURE = 1.0  # Pa to avoid zero/negative outlet pressures


@dataclass
class ControlValveCalculator(LossCalculator):
    fluid: Fluid

    def __post_init__(self) -> None:
        self.logger = logging.getLogger(__name__)

    def calculate(
        self,
        section: PipeSection,
        *,
        inlet_pressure_override: Optional[float] = None,
    ) -> None:
        valve = section.control_valve
        if valve is None:
            return
        valve.calculation_note = None
        self._apply_section_defaults(section, valve)

        if valve.cv is None and valve.cg:
            valve.cv = self._cv_from_cg(valve.cg, valve)
        if valve.pressure_drop is None and valve.cv is None:
            valve.calculation_note = (
                "Skipped control valve calculation: provide pressure_drop or Cv/Cg."
            )
            return

        flow = self._determine_flow_rate(section)
        phase = self.fluid.phase.lower()
        inlet_pressure = (
            inlet_pressure_override
            if inlet_pressure_override is not None
            else self._inlet_pressure(section)
        )
        if inlet_pressure is None or inlet_pressure <= 0:
            raise ValueError("Control valve inlet pressure must be positive")
        drop: float

        if valve.pressure_drop is not None:
            drop = self._apply_drop_from_spec(valve, inlet_pressure, flow, phase, section)
            valve.calculation_note = (
                f"Used specified pressure_drop ({self._format_drop(drop)})."
            )
        else:
            drop = self._solve_drop_from_cv(valve, inlet_pressure, flow, phase, section)
            valve.pressure_drop = drop
            valve.calculation_note = (
                f"Calculated pressure_drop from Cv ({self._format_drop(drop)})."
            )

        pressure_drop = section.calculation_output.pressure_drop
        pressure_drop.control_valve_pressure_drop = drop
        baseline = pressure_drop.total_segment_loss or 0.0
        pressure_drop.total_segment_loss = baseline + drop

    def _apply_drop_from_spec(
        self, valve, inlet_pressure: float, flow_rate: float, phase: str, section: PipeSection
    ) -> float:
        drop = max(valve.pressure_drop or 0.0, 0.0)
        max_drop = max(inlet_pressure - MIN_PRESSURE, MIN_PRESSURE)
        if drop > max_drop:
            raise ValueError("Specified control valve pressure drop exceeds inlet pressure")
        if valve.cv is None:
            if section.temperature is None or section.temperature <= 0:
                raise ValueError("section.temperature must be set and positive for control valve calculations")
            kv = self._kv_from_drop(phase, inlet_pressure, drop, flow_rate, valve, section.temperature, section.id)
            valve.cv = convert_flow_coefficient(kv, "Kv", "Cv")
            if valve.cg is None:
                valve.cg = self._cg_from_cv(valve.cv, valve)
        valve.pressure_drop = drop
        return drop

    def _solve_drop_from_cv(
        self, valve, inlet_pressure: float, flow_rate: float, phase: str, section: PipeSection
    ) -> float:
        if valve.cv is None or valve.cv <= 0:
            raise ValueError("Control valve Cv must be positive to compute pressure drop")
        max_drop = max(inlet_pressure - MIN_PRESSURE, MIN_PRESSURE)
        kv_target = convert_flow_coefficient(valve.cv, "Cv", "Kv")

        def kv_from_drop(delta_p: float) -> float:
            if section.temperature is None or section.temperature <= 0:
                raise ValueError("section.temperature must be set and positive for control valve calculations")
            return self._kv_from_drop(phase, inlet_pressure, delta_p, flow_rate, valve, section.temperature, section.id)

        drop = self._bisect_on_drop(kv_target, kv_from_drop, max_drop)
        return drop

    def _kv_from_drop(
        self,
        phase: str,
        inlet_pressure: float,
        drop: float,
        flow_rate: float,
        valve,
        temperature: float,
        section_id: str,
    ) -> float:
        outlet_pressure = max(inlet_pressure - drop, MIN_PRESSURE)
        if phase == "liquid":
            return self._kv_liquid(inlet_pressure, outlet_pressure, flow_rate, valve, section_id)
        return self._kv_gas(inlet_pressure, outlet_pressure, flow_rate, valve, temperature)

    def _kv_liquid(
        self, inlet_pressure: float, outlet_pressure: float, flow_rate: float, valve, section_id: str
    ) -> float:
        if self.fluid.vapor_pressure is None or self.fluid.critical_pressure is None:
            # Fallback to general valve Cv calculation
            # Log a warning that a simplified calculation is being used
            self.logger.warning(
                "Fluid properties (vapor_pressure or critical_pressure) missing for liquid control valve calculation. "
                "Using a simplified Kv calculation for section %s.",
                section_id,
            )
            return self._kv_liquid_simplified(
                inlet_pressure, outlet_pressure, flow_rate, self.fluid.density
            )
        return size_control_valve_l(
            rho=self.fluid.density,
            Psat=self.fluid.vapor_pressure,
            Pc=self.fluid.critical_pressure,
            mu=self.fluid.viscosity,
            P1=inlet_pressure,
            P2=outlet_pressure,
            Q=flow_rate,
            D1=valve.inlet_diameter,
            D2=valve.outlet_diameter,
            d=valve.valve_diameter,
            FL=valve.FL if valve.FL is not None else 0.9,
            Fd=valve.Fd if valve.Fd is not None else 1.0,
        )

    def _kv_liquid_simplified(
        self, inlet_pressure: float, outlet_pressure: float, flow_rate_m3s: float, fluid_density: float
    ) -> float:
        # Convert flow rate from m^3/s to m^3/h
        flow_rate_m3h = flow_rate_m3s * 3600

        # Calculate pressure drop in Pa
        pressure_drop_pa = inlet_pressure - outlet_pressure

        # Convert pressure drop from Pa to bar
        pressure_drop_bar = pressure_drop_pa / 100000.0

        # Calculate specific gravity (relative to water at 1000 kg/m^3)
        # Assuming water density at 1000 kg/m^3 for specific gravity calculation
        specific_gravity = fluid_density / 1000.0

        if pressure_drop_bar <= 0 or specific_gravity <= 0:
            # This case should ideally be handled upstream or result in an error
            # For now, return a very large Kv to indicate minimal resistance
            # or raise a more specific error if this state is truly invalid.
            raise ValueError(
                "Cannot perform simplified liquid Kv calculation with non-positive pressure drop or specific gravity."
            )

        # Kv = Q_m3h / sqrt(dP_bar / SG)
        kv_value = flow_rate_m3h / (pressure_drop_bar / specific_gravity)**0.5
        return kv_value

    def _kv_gas(
        self, inlet_pressure: float, outlet_pressure: float, flow_rate: float, valve, temperature: float
    ) -> float:
        return size_control_valve_g(
            T=temperature,
            MW=self.fluid.molecular_weight,
            mu=self.fluid.viscosity,
            gamma=self.fluid.specific_heat_ratio,
            Z=self.fluid.z_factor,
            P1=inlet_pressure,
            P2=outlet_pressure,
            Q=flow_rate,
            D1=valve.inlet_diameter,
            D2=valve.outlet_diameter,
            d=valve.valve_diameter,
            FL=valve.FL if valve.FL is not None else 0.9,
            Fd=valve.Fd if valve.Fd is not None else 1.0,
            xT=valve.xT if valve.xT is not None else 0.7,
        )

    def _bisect_on_drop(
        self,
        kv_target: float,
        kv_from_drop: Callable[[float], float],
        max_drop: float,
    ) -> float:
        lower = MIN_PRESSURE
        upper = max_drop
        kv_lower = kv_from_drop(lower)
        kv_upper = kv_from_drop(upper)
        if not (kv_upper <= kv_target <= kv_lower):
            raise ValueError("Specified Cv is outside the achievable range for this valve")
        for _ in range(80):
            mid = 0.5 * (lower + upper)
            kv_mid = kv_from_drop(mid)
            if abs(kv_mid - kv_target) <= max(1e-6 * kv_target, 1e-6):
                return mid
            if kv_mid > kv_target:
                lower = mid
            else:
                upper = mid
        return 0.5 * (lower + upper)

    @staticmethod
    def _format_drop(drop: float) -> str:
        return f"{drop:.6g} Pa"

    @staticmethod
    def _apply_section_defaults(section: PipeSection, valve) -> None:
        if valve.inlet_diameter is None:
            valve.inlet_diameter = section.inlet_diameter or section.pipe_diameter
        if valve.outlet_diameter is None:
            valve.outlet_diameter = section.outlet_diameter or section.pipe_diameter
        if valve.valve_diameter is None:
            valve.valve_diameter = section.pipe_diameter

    def _determine_flow_rate(self, section: PipeSection) -> float:
        if section.mass_flow_rate is None or section.mass_flow_rate <= 0:
            raise ValueError("Section mass_flow_rate must be positive for control valve calculations")
        if section.temperature is None or section.temperature <= 0:
            raise ValueError("Section temperature must be positive for control valve calculations")
        if section.pressure is None or section.pressure <= 0:
            raise ValueError("Section pressure must be positive for control valve calculations")

        density = self.fluid.current_density(section.temperature, section.pressure)
        if density <= 0:
            raise ValueError("Fluid density must be positive for control valve calculations")
        return section.mass_flow_rate / density

    def _inlet_pressure(self, section: PipeSection) -> float:
        summary = section.result_summary.inlet
        if summary.pressure and summary.pressure > 0:
            return summary.pressure
        if section.pressure is None or section.pressure <= 0:
            raise ValueError("Section pressure must be positive for control valve calculations")
        return section.pressure

    def _cg_from_cv(self, cv: float, valve) -> Optional[float]:
        c1 = self._conversion_c1(valve)
        if c1:
            return c1 * cv
        return None

    def _cv_from_cg(self, cg: float, valve) -> float:
        c1 = self._conversion_c1(valve)
        if not c1:
            raise ValueError("Unable to convert Cg to Cv without valve C1 or xT")
        return cg / c1

    @staticmethod
    def _conversion_c1(valve) -> Optional[float]:
        if valve.C1 and valve.C1 > 0:
            return valve.C1
        if valve.xT and 0 < valve.xT < 1.0:
            return 31.6 / (valve.xT ** 0.5)
        return None
