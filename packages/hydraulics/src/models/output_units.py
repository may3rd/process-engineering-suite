"""Configuration for report/output units.

Example:

    from network_hydraulic.models.output_units import OutputUnits

    units = OutputUnits(pressure="kPag", temperature="degC")
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Dict

from network_hydraulic.utils.units import convert


@dataclass(slots=True)
class OutputUnits:
    pressure: str = "Pa"
    pressure_drop: str = "Pa"
    temperature: str = "K"
    density: str = "kg/m^3"
    velocity: str = "m/s"
    volumetric_flow_rate: str = "m^3/s"
    mass_flow_rate: str = "kg/s"
    flow_momentum: str = "Pa"
    gas_flow_critical_pressure: str = "Pa"
    length: str = "m"
    small_length: str = "mm"
    area: str = "m^2"


    def __post_init__(self) -> None:
        self.pressure = self._normalize(self.pressure, "kPag")
        self.pressure_drop = self._normalize(self.pressure_drop, "kPa")
        self.temperature = self._normalize(self.temperature, "degC")
        self.density = self._normalize(self.density, "kg/m^3")
        self.velocity = self._normalize(self.velocity, "m/s")
        self.volumetric_flow_rate = self._normalize(self.volumetric_flow_rate, "m^3/h")
        self.mass_flow_rate = self._normalize(self.mass_flow_rate, "kg/s")
        self.flow_momentum = self._normalize(self.flow_momentum, "kPa")
        self.gas_flow_critical_pressure = self._normalize(self.gas_flow_critical_pressure or self.pressure_drop, "kPa")
        self.length = self._normalize(self.length, "m")
        self.small_length = self._normalize(self.small_length, "mm")
        self.area = self._normalize(self.area, "m^2")

        errors: list[str] = []
        for field_name in self.__dataclass_fields__:
            unit_string = getattr(self, field_name)
            try:
                # Attempt a dummy conversion to validate the unit string
                convert(1.0, unit_string, unit_string)
            except ValueError:
                errors.append(f"Output unit '{unit_string}' for '{field_name}' is not a recognized unit")
        
        if errors:
            raise ValueError("; ".join(errors))

    def as_dict(self) -> Dict[str, str]:
        """Return a serializable snapshot of the configured units."""
        return asdict(self)

    @staticmethod
    def _normalize(value: str | None, default: str) -> str:
        text = (value or "").strip()
        return text or default
