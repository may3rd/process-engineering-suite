"""Orchestrates per-section hydraulic calculations and state propagation.

Example:

    from network_hydraulic.models.fluid import Fluid
    from network_hydraulic.models.network import Network
    from network_hydraulic.models.pipe_section import PipeSection, Fitting
    from network_hydraulic.solver.network_solver import NetworkSolver

    fluid = Fluid(...)
    network = Network(name="test", description=None, fluid=fluid, sections=[...])
    solver = NetworkSolver()
    result = solver.run(network)
"""
from __future__ import annotations

from collections import deque
import logging
from copy import deepcopy
from dataclasses import dataclass
from math import pi, sqrt
from typing import Dict, Iterable, List, Optional

from network_hydraulic.calculators.elevation import ElevationCalculator
from network_hydraulic.calculators.fittings import FittingLossCalculator
from network_hydraulic.calculators.hydraulics import FrictionCalculator
from network_hydraulic.calculators.normalization import NormalizedLossCalculator
from network_hydraulic.calculators.orifices import OrificeCalculator
from network_hydraulic.calculators.user_fixed_loss import UserFixedLossCalculator
from network_hydraulic.calculators.valves import ControlValveCalculator
from network_hydraulic.models.network import Network
from network_hydraulic.models.pipe_section import PipeSection
from network_hydraulic.models.results import (
    CalculationOutput,
    NetworkResult,
    PressureDropDetails,
    ResultSummary,
    SectionResult,
    StatePoint,
)
from network_hydraulic.models.topology import TopologyGraph
from network_hydraulic.calculators.gas_flow import (
    UNIVERSAL_GAS_CONSTANT,
    GasState,
    solve_adiabatic,
    solve_isothermal,
)

EROSIONAL_CONVERSION = 0.3048 * sqrt(16.018463)
logger = logging.getLogger(__name__)

@dataclass
class NetworkSolver:
    """Runs calculations for all pipe sections in a network."""

    default_pipe_diameter: Optional[float] = None
    direction: Optional[str] = None
    boundary_pressure: Optional[float] = None
    gas_flow_model: Optional[str] = None
    friction_factor_type: str = "darcy"

    def run(
        self,
        network: Network,
        direction_override: Optional[str] = None,
        *,
        node_pressure_overrides: Optional[Dict[str, float]] = None,
    ) -> NetworkResult:

        calculators = self._build_calculators(network)
        result = NetworkResult()

        sections = list(network.sections)
        logger.info(
            "Starting solver run for network '%s' (%d section(s))",
            network.name,
            len(sections),
        )
        for section in sections:
            self._reset_section(section)

        resolved_direction = self._resolve_direction(network, direction_override or self.direction)
        network.direction = resolved_direction
        base_mass_flow = network.mass_flow_rate
        self._assign_design_flows(sections, network, base_mass_flow)
        self._distribute_mass_flow(network, resolved_direction != "backward")

        for section in sections:
            self._validate_section_prerequisites(section)
            for calculator in calculators:
                calculator.calculate(section)
            self._apply_loss_precedence(section)
            fitting_K = section.fitting_K or 0.0
            pipe_length_K = section.pipe_length_K or 0.0
            user_K = section.user_K or 0.0
            piping_and_fitting_safety_factor = section.piping_and_fitting_safety_factor or 1.0
            section.total_K = (fitting_K + pipe_length_K + user_K) * piping_and_fitting_safety_factor

            pressure_drop = section.calculation_output.pressure_drop
            pressure_drop.fitting_K = section.fitting_K
            pressure_drop.pipe_length_K = section.pipe_length_K
            pressure_drop.user_K = section.user_K
            pressure_drop.piping_and_fitting_safety_factor = section.piping_and_fitting_safety_factor
            pressure_drop.total_K = section.total_K

        boundary_hint = (
            self.boundary_pressure
            if self.boundary_pressure is not None
            else (
                network.boundary_pressure
                if resolved_direction != "backward"
                else network.downstream_pressure or network.boundary_pressure
            )
        )
        node_pressures = self._apply_pressure_profile(
            sections,
            network,
            direction=resolved_direction,
            boundary=boundary_hint,
            node_pressure_overrides=node_pressure_overrides,
        )
        result.node_pressures = node_pressures
        self._populate_states(sections, network)
        self._set_network_summary(network, sections)

        for section in sections:
            result.sections.append(
                SectionResult(
                    section_id=section.id,
                    calculation=section.calculation_output,
                    summary=section.result_summary,
                )
            )
            self._accumulate(result.aggregate.pressure_drop, section.calculation_output.pressure_drop)

        result.summary = network.result_summary
        logger.info("Completed solver run for network '%s'", network.name)
        return result

    def _build_calculators(self, network: Network) -> Iterable:
        fluid = network.fluid
        elevation = ElevationCalculator(
            fluid=fluid,
        )
        return [
            FittingLossCalculator(
                fluid=fluid,
                default_pipe_diameter=self.default_pipe_diameter,
            ),
            FrictionCalculator(
                fluid=fluid,
                default_pipe_diameter=self.default_pipe_diameter,
                friction_factor_type=self.friction_factor_type,
            ),
            elevation,
            UserFixedLossCalculator(),
        ]

    @staticmethod
    def _reset_section(section: PipeSection) -> None:
        section.calculation_output = CalculationOutput()
        section.result_summary = ResultSummary()
        section.fitting_K = None
        section.pipe_length_K = None
        section.design_flow_multiplier = 1.0
        section.design_mass_flow_rate = None

    def _validate_section_prerequisites(self, section: PipeSection) -> None:
        errors: list[str] = []
        has_pipeline = section.has_pipeline_segment
        has_user_loss = (
            section.user_specified_fixed_loss is not None and section.user_specified_fixed_loss > 0
        )
        has_component = (
            section.control_valve is not None or section.orifice is not None or has_user_loss
        )
        if not has_pipeline and not has_component:
            errors.append(
                f"Section '{section.id}' must define either a pipeline segment or a control valve/orifice"
            )
        if has_pipeline:
            diameter = section.pipe_diameter or self.default_pipe_diameter
            if diameter is None or diameter <= 0:
                errors.append("pipe diameter is required")
        if errors:
            raise ValueError(
                f"Section '{section.id}' is invalid: {', '.join(errors)}"
            )

    def _assign_design_flows(
        self,
        sections: Iterable[PipeSection],
        network: Network,
        base_mass_flow: Optional[float],
    ) -> None:
        for section in sections:
            multiplier = self._design_multiplier(section, network)
            section.design_flow_multiplier = multiplier
            section.design_mass_flow_rate = (
                base_mass_flow * multiplier if base_mass_flow is not None else None
            )
            section.mass_flow_rate = section.design_mass_flow_rate
            section.temperature = network.boundary_temperature
            boundary = (
                network.upstream_pressure
                if network.direction != "backward"
                else network.downstream_pressure
            )
            section.pressure = boundary

    def _distribute_mass_flow(self, network: Network, forward: bool) -> None:
        base_mass_flow = network.mass_flow_rate
        if base_mass_flow is None:
            return
        graph = network.topology
        if not graph.nodes:
            return
        start_nodes = graph.start_nodes(forward=forward)
        if not start_nodes:
            start_nodes = list(graph.nodes.keys())
        if not start_nodes:
            return
        node_mass: dict[str, float] = {node_id: 0.0 for node_id in graph.nodes}
        share_per_start = base_mass_flow / len(start_nodes)
        queue = deque()
        for node_id in start_nodes:
            node_mass[node_id] = share_per_start
            queue.append(node_id)
        while queue:
            node_id = queue.popleft()
            mass_available = node_mass.get(node_id, 0.0)
            if mass_available <= 0:
                continue
            node_mass[node_id] = 0.0
            edges = graph.outgoing_edges(node_id) if forward else graph.incoming_edges(node_id)
            if not edges:
                continue
            sections = []
            total_weight = 0.0
            for edge in edges:
                section = edge.metadata.get("section")
                if not isinstance(section, PipeSection):
                    continue
                sections.append((edge, section))
                total_weight += section.flow_splitting_factor
            if not sections:
                continue
            if total_weight <= 0:
                total_weight = len(sections)
            for edge, section in sections:
                multiplier = section.design_flow_multiplier or 1.0
                weight = section.flow_splitting_factor if section.flow_splitting_factor > 0 else 1.0
                share_ratio = weight / total_weight if total_weight > 0 else 1.0 / len(sections)
                share = mass_available * share_ratio
                section.mass_flow_rate = share
                section.design_mass_flow_rate = share * multiplier
                next_node_id = edge.end_node_id if forward else edge.start_node_id
                node_mass[next_node_id] = node_mass.get(next_node_id, 0.0) + share
                queue.append(next_node_id)

    @staticmethod
    def _design_multiplier(section: PipeSection, network: Network) -> float:
        margin = (
            section.design_margin
            if section.design_margin is not None
            else network.design_margin
        )
        if margin is None:
            return 1.0
        return 1.0 + margin

    def _apply_pressure_profile(
        self,
        sections: Iterable[PipeSection],
        network: Network,
        direction: str,
        boundary: Optional[float],
        node_pressure_overrides: Optional[Dict[str, float]],
    ) -> dict[str, float]:
        sections = list(sections)
        if not sections:
            return
        forward = direction != "backward"
        ordered_sections = self._ordered_sections_by_topology(network, forward)
        iterator = ordered_sections
        boundary_hint = boundary if boundary is not None else network.boundary_pressure
        current = self._initial_pressure(network, forward, boundary_hint)
        current_temperature = network.boundary_temperature
        mass_flow = network.mass_flow_rate
        gas_flow_model = self.gas_flow_model or network.gas_flow_model

        control_valve_calculator = ControlValveCalculator(
            fluid=network.fluid,
        )
        orifice_calculator = OrificeCalculator(
            fluid=network.fluid,
            default_pipe_diameter=self.default_pipe_diameter,
            mass_flow_rate=mass_flow,
        )
        graph = network.topology
        node_pressures: dict[str, Optional[float]] = {node_id: None for node_id in graph.nodes}
        overrides = node_pressure_overrides or {}
        for node_id, override in overrides.items():
            if node_id not in node_pressures:
                node_pressures[node_id] = None
            self._set_node_pressure(node_pressures, node_id, override)
        start_nodes = graph.start_nodes(forward)
        if not start_nodes:
            start_nodes = list(graph.nodes.keys())
        for node_id in start_nodes:
            if node_id in overrides and overrides[node_id] is not None:
                continue
            self._set_node_pressure(node_pressures, node_id, boundary_hint)

        if network.fluid.is_gas():
            for section in iterator:
                summary = section.result_summary
                start_node, end_node = self._section_node_ids(section, graph, forward)
                node_pressure = node_pressures.get(start_node)
                section_start_pressure = (
                    section.boundary_pressure
                    if section.boundary_pressure is not None
                    else node_pressure
                    if node_pressure is not None
                    else current
                )

                if section_start_pressure is None:
                    break

                if section.temperature is None or section.temperature <= 0:
                    section.temperature = current_temperature
                section_start_temperature = section.temperature
                section.pressure = section_start_pressure
                has_pipeline = section.has_pipeline_segment

                self._apply_pressure_dependent_losses(
                    section,
                    inlet_pressure=section_start_pressure,
                    control_valve_calculator=control_valve_calculator,
                    orifice_calculator=orifice_calculator,
                    mass_flow_override=section.mass_flow_rate,
                )

                loss = section.calculation_output.pressure_drop.total_segment_loss or 0.0

                if not has_pipeline:
                    if forward:
                        summary.inlet.pressure = section_start_pressure
                        summary.outlet.pressure = self._safe_subtract(section_start_pressure, loss)
                        current = summary.outlet.pressure
                    else:
                        summary.outlet.pressure = section_start_pressure
                        summary.inlet.pressure = self._safe_add(section_start_pressure, loss)
                        current = summary.inlet.pressure

                    NormalizedLossCalculator().calculate(section)

                    entry_state = summary.inlet if forward else summary.outlet
                    exit_state = summary.outlet if forward else summary.inlet
                    self._apply_section_entry_state(section, entry_state, section_start_temperature)
                    exit_pressure = exit_state.pressure
                    if exit_pressure is not None:
                        current = exit_pressure
                        self._set_node_pressure(node_pressures, end_node, exit_pressure)
                    exit_temperature = exit_state.temperature
                    if exit_temperature is not None and exit_temperature > 0:
                        current_temperature = exit_temperature
                    continue

                # Gather parameters for gas flow solvers
                temperature = section.temperature
                pressure = section.pressure
                molar_mass = network.fluid.molecular_weight
                z_factor = network.fluid.z_factor
                gamma = network.fluid.specific_heat_ratio
                length = section.length or 0.0
                friction_factor = section.calculation_output.pressure_drop.frictional_factor
                k_total = section.total_K
                pipe_k = section.pipe_length_K or 0.0
                # k_additional = max((k_total or 0.0) - pipe_k, 0.0)
                k_additional = 0.0
                diameter = section.pipe_diameter or self.default_pipe_diameter
                roughness = section.roughness or 0.0
                viscosity = network.fluid.viscosity

                section_mass_flow = section.mass_flow_rate
                missing_params: list[str] = []
                positive_required = {
                    "temperature": temperature,
                    "pressure": pressure,
                    "mass_flow": section_mass_flow,
                    "diameter": diameter,
                    "molar_mass": molar_mass,
                    "z_factor": z_factor,
                    "gamma": gamma,
                    "viscosity": viscosity,
                }
                for name, value in positive_required.items():
                    if value is None or value <= 0:
                        missing_params.append(name)

                nullable_required = {
                    "length": length,
                    "friction_factor": friction_factor,
                    "k_total": k_total,
                }
                for name, value in nullable_required.items():
                    if value is None:
                        missing_params.append(name)

                if section_start_pressure is None:
                    missing_params.append("section_start_pressure")

                if missing_params:
                    raise ValueError(
                        f"Section '{section.id}' is missing required gas-flow inputs: {', '.join(missing_params)}"
                    )

                if gas_flow_model == "isothermal":
                    if forward:
                        summary.inlet.pressure = section_start_pressure
                        inlet_state = self._gas_state_from_conditions(
                            pressure=section_start_pressure,
                            temperature=temperature,
                            mass_flow=section_mass_flow,
                            diameter=diameter,
                            molar_mass=molar_mass,
                            z_factor=z_factor,
                            gamma=gamma,
                        )
                        outlet_pressure, outlet_state = solve_isothermal(
                            inlet_pressure=section_start_pressure,
                            temperature=temperature,
                            mass_flow=section_mass_flow,
                            diameter=diameter,
                            length=length,
                            friction_factor=friction_factor,
                            k_total=k_total,
                            k_additional=k_additional,
                            molar_mass=molar_mass,
                            z_factor=z_factor,
                            gamma=gamma,
                            is_forward=True,
                            friction_factor_type=self.friction_factor_type,
                            viscosity=viscosity,
                            roughness=roughness,
                        )
                        summary.outlet.pressure = outlet_pressure
                        self._apply_gas_state(summary.inlet, inlet_state)
                        self._apply_gas_state(summary.outlet, outlet_state)
                        self._apply_gas_flow_critical_pressure(section, inlet_state, gas_flow_model)
                        # self._apply_gas_flow_critical_pressure(section, outlet_state, gas_flow_model)
                        current = outlet_pressure
                    else:
                        summary.outlet.pressure = section_start_pressure
                        outlet_state = self._gas_state_from_conditions(
                            pressure=section_start_pressure,
                            temperature=temperature,
                            mass_flow=section_mass_flow,
                            diameter=diameter,
                            molar_mass=molar_mass,
                            z_factor=z_factor,
                            gamma=gamma,
                        )
                        inlet_pressure, inlet_state = solve_isothermal(
                            inlet_pressure=section_start_pressure, # Pass current as inlet_pressure for backward calculation
                            temperature=temperature,
                            mass_flow=section_mass_flow,
                            diameter=diameter,
                            length=length,
                            friction_factor=friction_factor,
                            k_total=k_total,
                            k_additional=k_additional,
                            molar_mass=molar_mass,
                            z_factor=z_factor,
                            gamma=gamma,
                            is_forward=False,
                            friction_factor_type=self.friction_factor_type,
                            viscosity=viscosity,
                            roughness=roughness,
                        )
                        summary.inlet.pressure = inlet_pressure
                        self._apply_gas_state(summary.inlet, inlet_state)
                        self._apply_gas_state(summary.outlet, outlet_state)
                        self._apply_gas_flow_critical_pressure(section, inlet_state, gas_flow_model)
                        current = inlet_pressure
                    
                    # Update pipe_and_fittings and total_segment_loss for gas flow
                    self._update_gas_friction_losses(section)

                    entry_state = summary.inlet if forward else summary.outlet
                    exit_state = summary.outlet if forward else summary.inlet
                    self._apply_section_entry_state(section, entry_state, section_start_temperature)
                    exit_pressure = exit_state.pressure
                    if exit_pressure is not None:
                        current = exit_pressure
                    exit_temperature = exit_state.temperature
                    if exit_temperature is not None and exit_temperature > 0:
                        current_temperature = exit_temperature

                elif gas_flow_model == "adiabatic":
                    if forward:
                        summary.inlet.pressure = section_start_pressure
                        inlet_state = self._gas_state_from_conditions(
                            pressure=section_start_pressure,
                            temperature=temperature,
                            mass_flow=section_mass_flow,
                            diameter=diameter,
                            molar_mass=molar_mass,
                            z_factor=z_factor,
                            gamma=gamma,
                        )
                        inlet_state, outlet_state = solve_adiabatic(
                            boundary_pressure=section_start_pressure, # Use boundary_pressure
                            temperature=temperature,
                            mass_flow=section_mass_flow,
                            diameter=diameter,
                            length=length,
                            friction_factor=friction_factor,
                            k_total=k_total,
                            k_additional=k_additional,
                            molar_mass=molar_mass,
                            z_factor=z_factor,
                            gamma=gamma,
                            is_forward=True,
                            label=section.id,
                            friction_factor_type=self.friction_factor_type,
                        )
                        outlet_pressure = outlet_state.pressure
                        summary.outlet.pressure = outlet_pressure
                        self._apply_gas_state(summary.inlet, inlet_state)
                        self._apply_gas_state(summary.outlet, outlet_state)
                        self._apply_gas_flow_critical_pressure(section, inlet_state, gas_flow_model)
                        # self._apply_gas_flow_critical_pressure(section, outlet_state, gas_flow_model)
                        current = outlet_pressure
                    else:
                        summary.outlet.pressure = section_start_pressure
                        outlet_state = self._gas_state_from_conditions(
                            pressure=section_start_pressure,
                            temperature=temperature,
                            mass_flow=section_mass_flow,
                            diameter=diameter,
                            molar_mass=molar_mass,
                            z_factor=z_factor,
                            gamma=gamma,
                        )
                        inlet_state, outlet_state = solve_adiabatic(
                            boundary_pressure=section_start_pressure, # Use boundary_pressure
                            temperature=temperature,
                            mass_flow=section_mass_flow,
                            diameter=diameter,
                            length=length,
                            friction_factor=friction_factor,
                            k_total=k_total,
                            k_additional=k_additional,
                            molar_mass=molar_mass,
                            z_factor=z_factor,
                            gamma=gamma,
                            is_forward=False,
                            label=section.id,
                            friction_factor_type=self.friction_factor_type,
                        )
                        inlet_pressure = inlet_state.pressure
                        summary.inlet.pressure = inlet_pressure
                        self._apply_gas_state(summary.inlet, inlet_state)
                        self._apply_gas_state(summary.outlet, outlet_state)
                        self._apply_gas_flow_critical_pressure(section, inlet_state, gas_flow_model)
                        current = inlet_pressure

                    # Update pipe_and_fittings and total_segment_loss for gas flow
                    self._update_gas_friction_losses(section)
                    entry_state = summary.inlet if forward else summary.outlet
                    exit_state = summary.outlet if forward else summary.inlet
                    self._apply_section_entry_state(section, entry_state, section_start_temperature)
                    exit_pressure = exit_state.pressure
                    if exit_pressure is not None:
                        current = exit_pressure
                    exit_temperature = exit_state.temperature
                    if exit_temperature is not None and exit_temperature > 0:
                        current_temperature = exit_temperature

                else:
                    # Fallback for unknown gas flow model, treat as liquid
                    loss = section.calculation_output.pressure_drop.total_segment_loss or 0.0
                    if forward:
                        summary.inlet.pressure = section_start_pressure
                        summary.outlet.pressure = self._safe_subtract(section_start_pressure, loss)
                        current = summary.outlet.pressure
                    else:
                        summary.outlet.pressure = section_start_pressure
                        summary.inlet.pressure = self._safe_add(section_start_pressure, loss)
                        current = summary.inlet.pressure
                    
                    # Recalculate normalized loss after pipe_and_fittings is updated
                    NormalizedLossCalculator().calculate(section)

                    entry_state = summary.inlet if forward else summary.outlet
                    exit_state = summary.outlet if forward else summary.inlet
                    self._apply_section_entry_state(section, entry_state, section_start_temperature)
                    exit_pressure = exit_state.pressure
                    if exit_pressure is not None:
                        current = exit_pressure
                    exit_temperature = exit_state.temperature
                    if exit_temperature is not None and exit_temperature > 0:
                        current_temperature = exit_temperature
        else: # Liquid flow logic
            for section in iterator:
                summary = section.result_summary
                start_node, end_node = self._section_node_ids(section, graph, forward)
                node_pressure = node_pressures.get(start_node)
                section_start_pressure = (
                    section.boundary_pressure
                    if section.boundary_pressure is not None
                    else node_pressure
                    if node_pressure is not None
                    else current
                )

                if section_start_pressure is None:
                    break

                if section.temperature is None or section.temperature <= 0:
                    section.temperature = current_temperature
                section_start_temperature = section.temperature
                section.pressure = section_start_pressure

                self._apply_pressure_dependent_losses(
                    section,
                    inlet_pressure=section_start_pressure,
                    control_valve_calculator=control_valve_calculator,
                    orifice_calculator=orifice_calculator,
                    mass_flow_override=section.mass_flow_rate,
                )
                loss = section.calculation_output.pressure_drop.total_segment_loss or 0.0
                if forward:
                    summary.inlet.pressure = section_start_pressure
                    summary.outlet.pressure = self._safe_subtract(section_start_pressure, loss)
                    current = summary.outlet.pressure
                else:
                    summary.outlet.pressure = section_start_pressure
                    summary.inlet.pressure = self._safe_add(section_start_pressure, loss)
                    current = summary.inlet.pressure
                
                # Recalculate normalized loss after pipe_and_fittings is updated
                NormalizedLossCalculator().calculate(section)

                entry_state = summary.inlet if forward else summary.outlet
                exit_state = summary.outlet if forward else summary.inlet
                self._apply_section_entry_state(section, entry_state, section_start_temperature)
                exit_pressure = exit_state.pressure
                if exit_pressure is not None:
                    current = exit_pressure
                    self._set_node_pressure(node_pressures, end_node, exit_pressure)

        if forward:
            network.result_summary.inlet.pressure = sections[0].result_summary.inlet.pressure
            network.result_summary.outlet.pressure = sections[-1].result_summary.outlet.pressure
        else:
            network.result_summary.outlet.pressure = sections[-1].result_summary.outlet.pressure
            network.result_summary.inlet.pressure = sections[0].result_summary.inlet.pressure

        node_pressures_cleaned = {
            node_id: pressure
            for node_id, pressure in node_pressures.items()
            if pressure is not None
        }
        return node_pressures_cleaned

    def _apply_pressure_dependent_losses(
        self,
        section: PipeSection,
        *,
        inlet_pressure: Optional[float],
        control_valve_calculator: ControlValveCalculator,
        orifice_calculator: OrificeCalculator,
        mass_flow_override: Optional[float] = None,
    ) -> None:
        """
        Add the component's loss to the pipe_section by considering that only one of 
        `control valve`, `orifice`, or `pipeline`.
        """
        if inlet_pressure is None or inlet_pressure <= 0:
            if section.control_valve or section.orifice:
                raise ValueError(
                    f"Section '{section.id}' requires a valid inlet pressure for component calculations"
                )
            return

        pressure_drop = section.calculation_output.pressure_drop
        ignored = section.calculation_output.ignored_components

        component = self._primary_loss_component(section)

        if not component == "pipeline" and section.has_pipeline_segment:
            reason = "control valve" if component == "control_valve" else "orifice"
            ignored.append(f"Pipeline ignored because {reason} takes precedence in this section.")

        if component == "control_valve" and section.control_valve:
            control_valve_calculator.calculate(
                section,
                inlet_pressure_override=inlet_pressure,
            )
            if section.orifice:
                ignored.append("Orifice ignored because control valve takes precedence in this section.")
            pressure_drop.orifice_pressure_drop = 0.0
            return

        if component == "orifice" and section.orifice:
            orifice_calculator.calculate(
                section,
                inlet_pressure_override=inlet_pressure,
                mass_flow_override=mass_flow_override,
            )
            pressure_drop.control_valve_pressure_drop = 0.0
            return

    def _apply_loss_precedence(self, section: PipeSection) -> None:
        component = self._primary_loss_component(section)
        if component != "pipeline":
            section.pipe_length_K = 0.0
            section.fitting_K = 0.0
            section.equivalent_length = None
            section.calculation_output.pressure_drop.pipe_and_fittings = 0.0
            self._remove_pipeline_elevation(section)

    @staticmethod
    def _primary_loss_component(section: PipeSection) -> str:
        if section.control_valve:
            return "control_valve"
        if section.orifice:
            return "orifice"
        if section.has_pipeline_segment:
            return "pipeline"
        if section.user_specified_fixed_loss:
            return "user_loss"
        return "none"

    @staticmethod
    def _remove_pipeline_elevation(section: PipeSection) -> None:
        pressure_drop = section.calculation_output.pressure_drop
        elevation = pressure_drop.elevation_change or 0.0
        if elevation == 0.0:
            return
        baseline = pressure_drop.total_segment_loss or 0.0
        pressure_drop.total_segment_loss = baseline - elevation
        pressure_drop.elevation_change = 0.0

    def _update_gas_friction_losses(self, section: PipeSection) -> None:
        """Derive friction + normalized losses directly from gas solver pressures."""
        pd = section.calculation_output.pressure_drop
        summary = section.result_summary
        inlet_pressure = summary.inlet.pressure
        outlet_pressure = summary.outlet.pressure
        if inlet_pressure is None or outlet_pressure is None:
            return

        total_drop = abs(inlet_pressure - outlet_pressure)
        pd.total_segment_loss = total_drop

        other_losses = (
            (pd.elevation_change or 0.0)
            + (pd.control_valve_pressure_drop or 0.0)
            + (pd.orifice_pressure_drop or 0.0)
        )
        frictional_loss = max(0.0, total_drop - other_losses)
        pd.pipe_and_fittings = frictional_loss

        total_k = section.total_K
        length = section.equivalent_length or 0.0
        if total_k is not None and total_k > 0 and length > 0:
            # Report pipe-only drop scaled to a 100 m reference length.
            pd.normalized_friction_loss = frictional_loss / length * 100.0
        else:
            pd.normalized_friction_loss = None

    @staticmethod
    def _apply_section_entry_state(
        section: PipeSection,
        entry_state: StatePoint,
        fallback_temperature: Optional[float],
    ) -> None:
        if entry_state.pressure is not None:
            section.pressure = entry_state.pressure
        temperature = entry_state.temperature
        if temperature is not None and temperature > 0:
            section.temperature = temperature
        elif fallback_temperature is not None and fallback_temperature > 0:
            section.temperature = fallback_temperature

    def _initial_pressure(
        self,
        network: Network,
        forward: bool,
        boundary: Optional[float],
    ) -> Optional[float]:
        if boundary and boundary > 0:
            return boundary
        if network.boundary_pressure and network.boundary_pressure > 0:
            return network.boundary_pressure
        return None

    @staticmethod
    def _safe_subtract(value: Optional[float], delta: float) -> Optional[float]:
        if value is None:
            return None
        return value - delta

    @staticmethod
    def _safe_add(value: Optional[float], delta: float) -> Optional[float]:
        if value is None:
            return None
        return value + delta

    @staticmethod
    def _accumulate(target: PressureDropDetails, source: PressureDropDetails) -> None:
        for field_name in [
            "pipe_and_fittings",
            "elevation_change",
            "control_valve_pressure_drop",
            "orifice_pressure_drop",
            "user_specified_fixed_loss",
            "total_segment_loss",
            "normalized_friction_loss",
        ]:
            value = getattr(source, field_name)
            current = getattr(target, field_name)
            setattr(target, field_name, (current or 0.0) + (value or 0.0))

    def _populate_states(self, sections: Iterable[PipeSection], network: Network) -> None:
        sections = list(sections)
        if not sections:
            return
        fluid = network.fluid
        for section in sections:
            self._populate_section_state(
                section,
                fluid,
                section.mass_flow_rate,
                section.temperature,
                section.pressure,
            )

    def _populate_section_state(
        self,
        section: PipeSection,
        fluid,
        mass_flow: Optional[float],
        temperature: Optional[float],
        pressure: Optional[float],
    ) -> None:
        summary = section.result_summary
        pipe_diameter = section.pipe_diameter or self.default_pipe_diameter
        if not pipe_diameter or pipe_diameter <= 0:
            return
        pipe_area = pi * pipe_diameter * pipe_diameter * 0.25
        inlet_diameter = section.inlet_diameter or pipe_diameter
        outlet_diameter = section.outlet_diameter or pipe_diameter

        inlet_area = (
            pi * inlet_diameter * inlet_diameter * 0.25
            if inlet_diameter and inlet_diameter > 0
            else pipe_area
        )
        outlet_area = (
            pi * outlet_diameter * outlet_diameter * 0.25
            if outlet_diameter and outlet_diameter > 0
            else pipe_area
        )
        
        if temperature is None or temperature <= 0:
            raise ValueError("temperature must be set and positive for section state calculations")
        if pressure is None or pressure <= 0:
            raise ValueError("pressure must be set and positive for section state calculations")

        vol_flow = None
        if section.mass_flow_rate is not None:
            try:
                vol_flow = section.current_volumetric_flow_rate(fluid)
            except ValueError:
                vol_flow = None
        mass_flow_value = mass_flow if mass_flow is not None else section.mass_flow_rate

        velocity = None
        velocity_in = None
        velocity_out = None
        if vol_flow and vol_flow > 0:
            if pipe_area and pipe_area > 0:
                velocity = vol_flow / pipe_area
            if inlet_area and inlet_area > 0:
                velocity_in = vol_flow / inlet_area
            if outlet_area and outlet_area > 0:
                velocity_out = vol_flow / outlet_area
        
        base_density = fluid.current_density(temperature, pressure)
        reference_pressure = pressure
        reference_temperature = temperature
        inlet_density = base_density
        outlet_density = base_density
        if fluid.is_gas() and base_density and reference_pressure:
            inlet_density = self._recomputed_density(
                base_density=base_density,
                reference_pressure=reference_pressure,
                reference_temperature=reference_temperature,
                target_pressure=summary.inlet.pressure,
                target_temperature=summary.inlet.temperature,
            )
            outlet_density = self._recomputed_density(
                base_density=base_density,
                reference_pressure=reference_pressure,
                reference_temperature=reference_temperature,
                target_pressure=summary.outlet.pressure,
                target_temperature=summary.outlet.temperature,
            )
        phase = (fluid.phase or "").lower()
        mach = None
        if velocity and phase in {"gas", "vapor"} and fluid.specific_heat_ratio and temperature and fluid.molecular_weight:
            rs = UNIVERSAL_GAS_CONSTANT / fluid.molecular_weight
            sound_speed = sqrt(max(fluid.specific_heat_ratio, 1.0) * rs * temperature)
            if sound_speed > 0:
                mach = velocity / sound_speed
        eros_const = section.erosional_constant if section.erosional_constant is not None else 100.0
        eros_const_si = eros_const * EROSIONAL_CONVERSION
        erosional_velocity_in = None
        erosional_velocity_out = None
        if inlet_density and inlet_density > 0:
            erosional_velocity_in = eros_const_si / sqrt(inlet_density)
        if outlet_density and outlet_density > 0:
            erosional_velocity_out = eros_const_si / sqrt(outlet_density)
        def _velocity_from_mass_flow(
            density: Optional[float],
            area: Optional[float],
            fallback: Optional[float],
        ) -> Optional[float]:
            if (
                mass_flow_value is not None
                and density is not None
                and density > 0
                and area is not None
                and area > 0
            ):
                return mass_flow_value / (density * area)
            return fallback
        velocity_in = _velocity_from_mass_flow(inlet_density, inlet_area, velocity_in)
        velocity_out = _velocity_from_mass_flow(outlet_density, outlet_area, velocity_out)
        velocity = _velocity_from_mass_flow(base_density, pipe_area, velocity)
        flow_momentum_in = (
            inlet_density * velocity_in * velocity_in if inlet_density and velocity_in is not None else None
        )
        flow_momentum_out = (
            outlet_density * velocity_out * velocity_out if outlet_density and velocity_out is not None else None
        )
        section.mach_number = mach
        extra_warnings = list(section.calculation_output.ignored_components)
        mach_in = summary.inlet.mach_number if summary.inlet.mach_number is not None else mach
        mach_out = summary.outlet.mach_number if summary.outlet.mach_number is not None else mach
        inlet_velocity_for_remarks = velocity_in or velocity
        outlet_velocity_for_remarks = velocity_out or velocity
        remarks_in = self._build_remarks(
            section,
            summary,
            mach_in,
            inlet_velocity_for_remarks,
            erosional_velocity_in,
            extra_warnings=extra_warnings,
        )
        remarks_out = self._build_remarks(
            section,
            summary,
            mach_out,
            outlet_velocity_for_remarks,
            erosional_velocity_out,
            extra_warnings=extra_warnings,
        )
        section.calculation_output.ignored_components.clear()
        self._assign_state(
            summary.inlet,
            fluid,
            inlet_density,
            velocity_in or velocity,
            velocity,
            erosional_velocity_in,
            flow_momentum_in,
            mach if phase in {"gas", "vapor"} else None,
            remarks_in,
            temperature,
            pressure,
        )
        self._assign_state(
            summary.outlet,
            fluid,
            outlet_density,
            velocity_out or velocity,
            velocity,
            erosional_velocity_out,
            flow_momentum_out,
            mach if phase in {"gas", "vapor"} else None,
            remarks_out,
            temperature,
            pressure,
        )

    @staticmethod
    def _assign_state(
        state,
        fluid, # fluid is not used here, but kept for compatibility
        density: Optional[float],
        velocity: Optional[float],
        pipe_velocity: Optional[float],
        erosional_velocity: Optional[float],
        flow_momentum: Optional[float],
        mach: Optional[float],
        remarks: str,
        temperature: Optional[float],
        pressure: Optional[float],
    ) -> None:
        if state.temperature is None and temperature is not None:
            state.temperature = temperature
        if state.pressure is None and pressure is not None:
            state.pressure = pressure
        if state.density is None and density is not None:
            state.density = density
        if state.velocity is None and velocity is not None:
            state.velocity = velocity
        if state.pipe_velocity is None and pipe_velocity is not None:
            state.pipe_velocity = pipe_velocity
        if state.erosional_velocity is None and erosional_velocity is not None:
            state.erosional_velocity = erosional_velocity
        if state.flow_momentum is None and flow_momentum is not None:
            state.flow_momentum = flow_momentum
        if state.mach_number is None and mach is not None:
            state.mach_number = mach
        state.remarks = remarks

    def _build_remarks(
        self,
        section: PipeSection,
        summary: ResultSummary,
        mach: Optional[float],
        velocity: Optional[float],
        erosional_velocity: Optional[float],
        *,
        extra_warnings: Optional[list[str]] = None,
    ) -> str:
        warnings: list[str] = []
        drop = section.calculation_output.pressure_drop.total_segment_loss or 0.0
        inlet_pressure = summary.inlet.pressure
        if inlet_pressure and drop > inlet_pressure:
            warnings.append("Pressure drop exceeds inlet pressure")
        if velocity and erosional_velocity and velocity > erosional_velocity:
            warnings.append(f"Velocity {velocity:.2f} m/s exceeds erosional limit {erosional_velocity:.2f} m/s")
        if mach and mach >= 1.0:
            warnings.append(f"Mach {mach:.2f} exceeds sonic conditions")
        elif mach and mach > 0.7:
            warnings.append(f"Mach {mach:.2f} exceeds 0.7 threshold")
        elif mach and mach > 0.5:
            warnings.append(f"Mach {mach:.2f} exceeds 0.5 threshold")
        if extra_warnings:
            warnings.extend(extra_warnings)
        return "; ".join(warnings) if warnings else "OK"

    @staticmethod
    def _gas_state_from_conditions(
        *,
        pressure: Optional[float],
        temperature: Optional[float],
        mass_flow: Optional[float],
        diameter: Optional[float],
        molar_mass: Optional[float],
        z_factor: Optional[float],
        gamma: Optional[float],
    ) -> Optional[GasState]:
        if (
            pressure is None
            or pressure <= 0
            or temperature is None
            or temperature <= 0
            or diameter is None
            or diameter <= 0
            or molar_mass is None
            or molar_mass <= 0
            or z_factor is None
            or z_factor <= 0
        ):
            return None
        area = pi * diameter * diameter * 0.25
        density = pressure * molar_mass / (z_factor * UNIVERSAL_GAS_CONSTANT * temperature)
        velocity = None
        if mass_flow and mass_flow > 0 and density > 0 and area > 0:
            velocity = mass_flow / (density * area)
        sonic = None
        if gamma and gamma > 0:
            sonic = sqrt(max(gamma, 1e-9) * z_factor * UNIVERSAL_GAS_CONSTANT * temperature / molar_mass)
        mach = velocity / sonic if velocity is not None and sonic not in (None, 0) else None
        return GasState(
            pressure=pressure,
            temperature=temperature,
            density=density,
            velocity=velocity,
            mach=mach,
            gamma=gamma,
            molar_mass=molar_mass,
            z_factor=z_factor,
        )

    @staticmethod
    def _apply_gas_state(target: StatePoint, gas_state: Optional[GasState]) -> None:
        if target is None or gas_state is None:
            return
        target.temperature = gas_state.temperature
        target.density = gas_state.density
        target.velocity = gas_state.velocity
        target.pipe_velocity = gas_state.velocity
        target.mach_number = gas_state.mach

    @staticmethod
    def _apply_gas_flow_critical_pressure(section: PipeSection, gas_state: Optional[GasState], gas_flow_model: Optional[str] = "adiabatic") -> None:
        if gas_state is None:
            return

        critical = gas_state.gas_flow_critical_pressure
        if critical is None:
            mass_flow = section.mass_flow_rate
            pipe_dimensions = section.pipe_diameter or 0.0
            if pipe_dimensions and pipe_dimensions < 0:
                raise ValueError("Pipe diameter must be positive")
            area = pi * pipe_dimensions * pipe_dimensions * 0.25
            temperature = gas_state.temperature
            molar_mass = gas_state.molar_mass
            z_state = gas_state.z_factor
            gamma = gas_state.gamma
            if (
                mass_flow
                and mass_flow > 0
                and pipe_dimensions > 0
                and temperature
                and molar_mass
                and z_state
                and gamma
            ):
                sonic = sqrt(gamma * z_state * UNIVERSAL_GAS_CONSTANT * temperature / molar_mass)
                if sonic > 0:
                    density_star = mass_flow / (area * sonic)
                    critical = density_star * z_state * UNIVERSAL_GAS_CONSTANT * temperature / molar_mass
        if critical is None:
            return
        section.calculation_output.pressure_drop.gas_flow_critical_pressure = critical

    @staticmethod
    def _recomputed_density(
        *,
        base_density: Optional[float],
        reference_pressure: Optional[float],
        reference_temperature: Optional[float],
        target_pressure: Optional[float],
        target_temperature: Optional[float],
    ) -> Optional[float]:
        if (
            base_density is None
            or reference_pressure is None
            or reference_pressure <= 0
            or target_pressure is None
            or target_pressure <= 0
        ):
            return base_density
        density = base_density * (target_pressure / reference_pressure)
        if (
            reference_temperature
            and reference_temperature > 0
            and target_temperature
            and target_temperature > 0
        ):
            density *= reference_temperature / target_temperature
        return density

    def _set_network_summary(self, network: Network, sections: Iterable[PipeSection]) -> None:
        sections = list(sections)
        if not sections:
            network.result_summary = ResultSummary()
            return
        network.result_summary = ResultSummary(
            inlet=deepcopy(sections[0].result_summary.inlet),
            outlet=deepcopy(sections[-1].result_summary.outlet),
        )

    def _ordered_sections_by_topology(self, network: Network, forward: bool) -> List[PipeSection]:
        graph = network.topology
        if not graph.edges:
            return list(network.sections) if forward else list(reversed(network.sections))

        start_nodes = self._topology_start_nodes(graph, forward)
        if not start_nodes:
            start_nodes = list(graph.nodes.keys())

        ordered: List[PipeSection] = []
        visited_edges: set[str] = set()
        queue = deque()

        for node_id in start_nodes:
            neighbors = graph.outgoing_edges(node_id) if forward else graph.incoming_edges(node_id)
            queue.extend(neighbors)

        while queue:
            edge = queue.popleft()
            if edge.id in visited_edges:
                continue
            visited_edges.add(edge.id)
            section = edge.metadata.get("section")
            if isinstance(section, PipeSection):
                ordered.append(section)
            next_node = edge.end_node_id if forward else edge.start_node_id
            neighbors = graph.outgoing_edges(next_node) if forward else graph.incoming_edges(next_node)
            for neighbor in neighbors:
                if neighbor.id not in visited_edges:
                    queue.append(neighbor)

        for edge in graph.edges.values():
            if edge.id in visited_edges:
                continue
            section = edge.metadata.get("section")
            if isinstance(section, PipeSection):
                ordered.append(section)

        if not ordered:
            ordered = list(network.sections)

        return ordered

    @staticmethod
    def _section_node_ids(
        section: PipeSection,
        graph: TopologyGraph,
        forward: bool,
    ) -> tuple[Optional[str], Optional[str]]:
        edge = graph.edges.get(section.id)
        if not edge:
            return None, None
        return (
            (edge.start_node_id, edge.end_node_id)
            if forward
            else (edge.end_node_id, edge.start_node_id)
        )

    @staticmethod
    def _topology_start_nodes(graph: TopologyGraph, forward: bool) -> List[str]:
        lookup = graph.reverse_adjacency if forward else graph.adjacency
        start_nodes = [node_id for node_id, edges in lookup.items() if not edges]
        return start_nodes

    @staticmethod
    def _set_node_pressure(node_pressures: dict[str, Optional[float]], node_id: Optional[str], pressure: Optional[float]) -> None:
        if node_id is None or pressure is None:
            return
        existing = node_pressures.get(node_id)
        if existing is None or pressure < existing:
            node_pressures[node_id] = pressure

    def _resolve_direction(self, network: Network, requested: Optional[str]) -> str:
        candidate = (requested or "").lower()
        if candidate in {"forward", "backward"}:
            return candidate # 1. Explicitly requested direction (solver arg)

        net_dir = (network.direction or "").lower()
        if net_dir in {"forward", "backward"}:
            return net_dir
        
        # Default
        return "forward"
