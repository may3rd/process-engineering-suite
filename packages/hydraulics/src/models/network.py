
"""Network grouping of pipe sections and result summaries.

Example:

    from network_hydraulic.models import fluid, network

    fluid_model = fluid.Fluid(...)
    net = network.Network(name="demo", description="Sample", fluid=fluid_model)
    net.add_section(...)
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import List, Optional

from network_hydraulic.models.fluid import Fluid
from network_hydraulic.models.pipe_section import PipeSection
from network_hydraulic.models.results import CalculationOutput, ResultSummary
from network_hydraulic.models.output_units import OutputUnits
from network_hydraulic.models.topology import TopologyGraph, build_topology_from_sections

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class Network:
    name: str
    description: Optional[str]
    fluid: Fluid
    boundary_temperature: float
    upstream_pressure: Optional[float] = None
    downstream_pressure: Optional[float] = None
    boundary_pressure: Optional[float] = None
    direction: str = "auto"
    mass_flow_rate: Optional[float] = None
    gas_flow_model: Optional[str] = None
    sections: List[PipeSection] = field(default_factory=list)
    calculation_output: CalculationOutput = field(default_factory=CalculationOutput)
    result_summary: ResultSummary = field(default_factory=ResultSummary)
    output_units: OutputUnits = field(default_factory=OutputUnits)
    design_margin: float = 0.0 # For design rate 110% set design_margin = 0.1
    topology: TopologyGraph = field(default_factory=TopologyGraph)
    primary: bool = False

    def __post_init__(self) -> None:
        errors: list[str] = []

        if self.boundary_temperature is None or self.boundary_temperature <= 0:
            errors.append("network.boundary_temperature must be positive")
        if self.upstream_pressure is None and self.boundary_pressure is not None:
            self.upstream_pressure = self.boundary_pressure
        if self.boundary_pressure is None and self.upstream_pressure is not None:
            self.boundary_pressure = self.upstream_pressure
        if self.upstream_pressure is None and self.downstream_pressure is None:
            errors.append("Either upstream_pressure or downstream_pressure must be provided")
        if self.upstream_pressure is not None and self.upstream_pressure <= 0:
            errors.append("network.upstream_pressure must be positive if provided")
        if self.downstream_pressure is not None and self.downstream_pressure <= 0:
            errors.append("network.downstream_pressure must be positive if provided")

        if self.mass_flow_rate is None:
            errors.append("mass_flow_rate must be provided for the network")
        if self.mass_flow_rate is not None and self.mass_flow_rate < 0:
            errors.append("Network mass_flow_rate cannot be negative")

        normalized_direction = (self.direction or "").strip().lower()
        if normalized_direction not in {"auto", "forward", "backward"}:
            errors.append(f"Network direction '{self.direction}' must be 'auto', 'forward', or 'backward'")
        self.direction = normalized_direction

        if self.direction == "auto":
            if self.upstream_pressure is not None and self.downstream_pressure is None:
                self.direction = "forward"
            elif self.downstream_pressure is not None and self.upstream_pressure is None:
                self.direction = "backward"

        normalized_gas_flow_model = (self.gas_flow_model or "").strip().lower()
        fluid_is_gas = False
        try:
            fluid_is_gas = self.fluid.is_gas()
        except AttributeError:
            fluid_is_gas = False

        if fluid_is_gas:
            if not normalized_gas_flow_model:
                normalized_gas_flow_model = "isothermal"
            if normalized_gas_flow_model not in {"isothermal", "adiabatic"}:
                errors.append(
                    f"Gas flow model '{self.gas_flow_model}' must be 'isothermal' or 'adiabatic'"
                )
            else:
                self.gas_flow_model = normalized_gas_flow_model
        else:
            if normalized_gas_flow_model and normalized_gas_flow_model not in {"isothermal", "adiabatic"}:
                errors.append(
                    f"Gas flow model '{self.gas_flow_model}' must be 'isothermal' or 'adiabatic'"
                )
            else:
                if normalized_gas_flow_model:
                    logger.warning(
                        "Liquid/vapor network '%s' specified gas_flow_model='%s'; this setting is ignored for liquid runs.",
                        self.name,
                        normalized_gas_flow_model,
                    )
                self.gas_flow_model = normalized_gas_flow_model or None

        if self.design_margin is not None and self.design_margin < 0:
            errors.append("Network design_margin must be non-negative")

        if errors:
            raise ValueError("; ".join(errors))

        self.primary = bool(self.primary)
        self.rebuild_topology()

    def add_section(self, section: PipeSection) -> None:
        self.sections.append(section)
        self.rebuild_topology()

    def current_volumetric_flow_rate(self) -> float:
        if self.mass_flow_rate is None:
            raise ValueError("mass_flow_rate must be set to calculate volumetric flow rate")
        reference_pressure = self.upstream_pressure or self.downstream_pressure
        if reference_pressure is None or reference_pressure <= 0:
            raise ValueError("A valid upstream or downstream pressure is required")
        density = self.fluid.current_density(self.boundary_temperature, reference_pressure)
        if density == 0:
            raise ValueError("Cannot calculate volumetric flow rate with zero density")
        return self.mass_flow_rate / density

    def rebuild_topology(self) -> TopologyGraph:
        """Refresh the digraph that mirrors configured sections."""
        self.topology = build_topology_from_sections(self.sections)
        return self.topology
