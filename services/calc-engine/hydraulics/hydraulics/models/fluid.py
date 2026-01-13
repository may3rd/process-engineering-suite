"""Physical fluid definition covering liquid or gas attributes."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

GAS_CONSTANT = 8.314462618  # J/(mol*K)


@dataclass(slots=True)
class Fluid:
    name: Optional[str]
    phase: str
    viscosity: float
    density: Optional[float] = None
    molecular_weight: Optional[float] = None
    z_factor: Optional[float] = None
    specific_heat_ratio: Optional[float] = None
    standard_flow_rate: Optional[float] = None
    vapor_pressure: Optional[float] = None
    critical_pressure: Optional[float] = None

    def __post_init__(self) -> None:
        errors: list[str] = []

        # From _validate_fluid_inputs in ConfigurationLoader
        if self.viscosity <= 0:
            errors.append("fluid.viscosity must be positive")

        normalized_phase = (self.phase or "").strip().lower()
        if normalized_phase == "liquid":
            if self.density is None or self.density <= 0:
                errors.append("fluid.density must be provided and positive for liquids")
        elif normalized_phase in {"gas", "vapor"}:
            if self.molecular_weight is None or self.molecular_weight <= 0:
                errors.append("fluid.molecular_weight must be provided and positive for gases")
            if self.z_factor is None or self.z_factor <= 0:
                errors.append("fluid.z_factor must be provided and positive for gases")
            if self.specific_heat_ratio is None or self.specific_heat_ratio <= 0:
                errors.append("fluid.specific_heat_ratio must be provided and positive for gases")
        else:
            errors.append("fluid.phase must be 'liquid', 'gas', or 'vapor'")

        if errors:
            raise ValueError("; ".join(errors))

    def phase_key(self) -> str:
        return self.phase.lower().strip()

    def is_liquid(self) -> bool:
        return self.phase_key() == "liquid"

    def is_gas(self) -> bool:
        return self.phase_key() in {"gas", "vapor"}

    def current_density(self, temperature: float, pressure: float) -> float:
        if self.is_gas():
            return self._gas_density(temperature, pressure)
        return self._require_positive(self.density, "density")

    def _gas_density(self, temperature: float, pressure: float) -> float:
        pressure = self._require_positive(pressure, "pressure")
        temperature = self._require_positive(temperature, "temperature")
        molecular_weight = self._require_positive(self.molecular_weight, "molecular_weight")
        z_factor = self._require_positive(self.z_factor or 1.0, "z_factor")
        mw_kg_per_mol = molecular_weight if molecular_weight <= 0.5 else molecular_weight / 1000.0
        return pressure * mw_kg_per_mol / (GAS_CONSTANT * temperature * z_factor)

    @staticmethod
    def _require_positive(value: Optional[float], name: str) -> float:
        if value is None or value <= 0:
            raise ValueError(f"{name} must be positive to determine flow parameters")
        return value
