"""Configuration loader utilities that parse YAML/JSON configs.

Example:

    from network_hydraulic.io.loader import ConfigurationLoader

    loader = ConfigurationLoader.from_yaml_path(Path("config/sample.yaml"))
    network = loader.build_network()
"""
from __future__ import annotations

import json
import logging
import re
import warnings
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional
from xml.etree import ElementTree as ET

from ruamel.yaml import YAML

from network_hydraulic.models.components import ControlValve, Orifice
from network_hydraulic.models.fluid import Fluid
from network_hydraulic.models.network import Network
from network_hydraulic.models.network_system import (
    NetworkBundle,
    NetworkSystem,
    NetworkSystemSettings,
    NetworkOptimizerSettings,
    SystemOptimizerSettings,
    SharedNodeGroup,
    SharedNodeMember,
)
from network_hydraulic.models.network_system import (
    NetworkBundle,
    NetworkSystem,
    SharedNodeGroup,
    SharedNodeMember,
)
from network_hydraulic.models.pipe_section import Fitting, PipeSection
from network_hydraulic.models.output_units import OutputUnits
from network_hydraulic.utils.pipe_dimensions import inner_diameter_from_nps
from network_hydraulic.utils.units import convert as convert_units

SWAGE_ABSOLUTE_TOLERANCE = 1e-6
SWAGE_RELATIVE_TOLERANCE = 1e-3
QUANTITY_PATTERN = re.compile(r"^\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*(\S.+)$")

logger = logging.getLogger(__name__)
NETWORK_ALLOWED_KEYS = {
    "name",
    "description",
    "direction",
    "boundary_pressure",
    "boundary_temperature",
    "pressure",
    "temperature",
    "gas_flow_model",
    "gas_flow_type",
    "fluid",
    "sections",
    "output_units",
    "design_margin",
    "mass_flow_rate",
}

SECTION_ALLOWED_KEYS = {
    "id",
    "description",
    "schedule",
    "roughness",
    "length",
    "elevation_change",
    "fitting_type",
    "fittings",
    "pipe_diameter",
    "inlet_diameter",
    "outlet_diameter",
    "control_valve",
    "orifice",
    "pipe_NPD",
    "design_margin",
    "fitting_K",
    "pipe_length_K",
    "user_K",
    "piping_and_fitting_safety_factor",
    "total_K",
    "user_specified_fixed_loss",
    "erosional_constant",
    "boundary_pressure",
    "direction",
    "inlet_diameter_specified",
    "outlet_diameter_specified",
    "flow_splitting_factor",
    "from_pipe_id",
    "to_pipe_id",
    "from_node_id",
    "to_node_id",
}

def _yaml_loader() -> YAML:
    yaml = YAML(typ="safe")
    yaml.default_flow_style = False
    return yaml


def _element_to_dict(element: ET.Element) -> Any:
    children = list(element)
    # Leaf node: return text value or merged attributes/text.
    if not children:
        text = (element.text or "").strip()
        if element.attrib:
            attributes = dict(element.attrib)
            if text:
                attributes["value"] = text
            return attributes
        return text

    data: Dict[str, Any] = {}
    counts: Dict[str, int] = {}
    for child in children:
        child_value = _element_to_dict(child)
        tag = child.tag
        counts[tag] = counts.get(tag, 0) + 1
        existing = data.get(tag)
        if existing is None:
            data[tag] = child_value
        elif isinstance(existing, list):
            existing.append(child_value)
        else:
            data[tag] = [existing, child_value]

    if len(data) == 1:
        (only_value,) = data.values()
        if isinstance(only_value, list):
            return only_value
    return data


def _normalize_xml_collections(value: Any) -> Any:
    if isinstance(value, dict):
        normalized: Dict[str, Any] = {}
        for key, sub_value in value.items():
            child = _normalize_xml_collections(sub_value)
            if key.endswith("s") and isinstance(child, dict) and len(child) == 1:
                (inner_value,) = child.values()
                normalized[key] = inner_value if isinstance(inner_value, list) else [inner_value]
            else:
                normalized[key] = child
        return normalized
    if isinstance(value, list):
        return [_normalize_xml_collections(item) for item in value]
    return value


@dataclass(slots=True)
class ConfigurationLoader:
    raw: Dict[str, Any]

    @classmethod
    def from_yaml_path(cls, path: Path) -> "ConfigurationLoader":
        yaml = _yaml_loader()
        with path.open("r", encoding="utf-8") as handle:
            data = yaml.load(handle) or {}
        return cls(raw=data)

    @classmethod
    def from_path(cls, path: Path) -> "ConfigurationLoader":
        warnings.warn(
            "ConfigurationLoader.from_path is deprecated; use from_yaml_path instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return cls.from_yaml_path(path)

    @classmethod
    def from_json_path(cls, path: Path) -> "ConfigurationLoader":
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle) or {}
        return cls(raw=data)

    @classmethod
    def from_xml_path(cls, path: Path) -> "ConfigurationLoader":
        tree = ET.parse(path)
        root = tree.getroot()
        raw_data = _element_to_dict(root)
        raw_data = _normalize_xml_collections(raw_data)
        if root.tag == "network":
            raw = {"network": raw_data}
        elif isinstance(raw_data, dict) and "network" in raw_data:
            raw = {"network": raw_data["network"]}
        else:
            raw = {root.tag: raw_data}
        return cls(raw=raw)

    @property
    def has_network_collection(self) -> bool:
        networks_cfg = self.raw.get("networks")
        if isinstance(networks_cfg, list):
            return len(networks_cfg) > 0
        return False

    def build_network(self) -> Network:
        if self.has_network_collection:
            raise ValueError(
                "Configuration defines multiple networks; call build_network_system() instead."
            )
        network_cfg = self.raw.get("network", {})
        default_units = self.raw.get("output_units")
        return self._build_network_from_config(network_cfg, default_output_units_cfg=default_units)

    def _build_network_from_config(
        self,
        network_cfg: Dict[str, Any],
        *,
        default_output_units_cfg: Optional[Dict[str, Any]] = None,
    ) -> Network:
        logger.info("Building network configuration from loader data")
        logger.info("'%s' is loaded successfully.", network_cfg.get("name", "network"))

        raw_boundary_temperature = (
            network_cfg.get("boundary_temperature")
            if network_cfg.get("boundary_temperature") is not None
            else network_cfg.get("temperature")
        )
        boundary_temperature = self._require_positive_quantity(
            raw_boundary_temperature,
            "network.boundary_temperature",
            target_unit="K",
        )
        logger.info(f"{boundary_temperature} is loaded successfully.")

        upstream_pressure = self._quantity(
            network_cfg.get("upstream_pressure"),
            "network.upstream_pressure",
            target_unit="Pa",
        )
        downstream_pressure = self._quantity(
            network_cfg.get("downstream_pressure"),
            "network.downstream_pressure",
            target_unit="Pa",
        )
        legacy_pressure = self._quantity(
            network_cfg.get("boundary_pressure") or network_cfg.get("pressure"),
            "network.boundary_pressure",
            target_unit="Pa",
        )
        configured_direction = str(network_cfg.get("direction", "auto")).strip().lower()
        if upstream_pressure is None and downstream_pressure is None:
            if legacy_pressure is None:
                raise ValueError("Either upstream_pressure or downstream_pressure must be provided")
            if configured_direction == "backward":
                downstream_pressure = legacy_pressure
            else:
                upstream_pressure = legacy_pressure
        logger.info(
            "Loaded pressures: upstream=%s Pa downstream=%s Pa",
            upstream_pressure,
            downstream_pressure,
        )

        mass_flow_rate_val = self._require_positive_quantity(
            network_cfg.get("mass_flow_rate"),
            "network.mass_flow_rate",
            target_unit="kg/s",
        )
        logger.info(f"{mass_flow_rate_val} is loaded successfully.")

        fluid_cfg = network_cfg.get("fluid", {})
        if fluid_cfg is None or fluid_cfg == {}:
            raise ValueError("network.fluid must be provided")
        fluid = self._build_fluid(fluid_cfg)

        sections_cfg: List[Dict[str, Any]] = network_cfg.get("sections", [])
        sections = [self._build_section(cfg) for cfg in sections_cfg]
        self._align_adjacent_diameters(sections)
        direction = network_cfg.get("direction", "auto")
        raw_gas_flow_model = network_cfg.get("gas_flow_model", network_cfg.get("gas_flow_type"))
        if raw_gas_flow_model is None:
            gas_flow_model = "isothermal" if fluid.is_gas() else None
        else:
            text_value = str(raw_gas_flow_model).strip().lower()
            if not text_value:
                gas_flow_model = "isothermal" if fluid.is_gas() else None
            else:
                gas_flow_model = text_value
        units_cfg = network_cfg.get("output_units")
        if units_cfg is None:
            units_cfg = default_output_units_cfg
        output_units = self._build_output_units(units_cfg)
        network = Network(
            name=network_cfg.get("name", "network"),
            description=network_cfg.get("description"),
            fluid=fluid,
            boundary_temperature=boundary_temperature,
            upstream_pressure=upstream_pressure,
            downstream_pressure=downstream_pressure,
            boundary_pressure=upstream_pressure,
            direction=direction,
            mass_flow_rate=mass_flow_rate_val,
            gas_flow_model=gas_flow_model,
            sections=sections,
            output_units=output_units,
            design_margin=self._coerce_optional_float(
                network_cfg.get("design_margin"), "network.design_margin"
            ),
            primary=bool(network_cfg.get("primary", False)),
        )
        logger.info(
            "Built network '%s' with %d section(s) and fluid '%s'",
            network.name,
            len(sections),
            network.fluid.name or network.fluid.phase,
        )
        network.rebuild_topology()
        logger.info(
            "Configured topology contains %d node(s) and %d edge(s)",
            len(network.topology.nodes),
            len(network.topology.edges),
        )
        start_nodes = network.topology.start_nodes()
        if not start_nodes:
            logger.warning(
                "Network '%s' topology has no start node; specify 'direction' or tie sections to a common inlet",
                network.name,
            )
        elif len(start_nodes) > 1:
            logger.warning(
                "Network '%s' has multiple (%d) start node(s) %s; branching detected",
                network.name,
                len(start_nodes),
                start_nodes,
            )
        else:
            logger.info(
                "Network '%s' source node '%s' will drive flow direction", network.name, start_nodes[0]
            )

        if start_nodes:
            reachable = network.topology.reachable_nodes(start_nodes)
            disconnected = sorted(
                node_id for node_id in network.topology.nodes if node_id not in reachable
            )
            if disconnected:
                logger.warning(
                    "Network '%s' has disconnected node(s) %s; verify from_node_id/to_node_id (or from_pipe_id/to_pipe_id)",
                    network.name,
                    disconnected,
                )
        return network

    def build_network_system(self) -> NetworkSystem:
        networks_cfg = self.raw.get("networks")
        default_units = self.raw.get("output_units")
        bundles: List[NetworkBundle] = []
        if networks_cfg:
            if not isinstance(networks_cfg, list):
                raise ValueError("networks must be a list of network definitions")
            for index, entry in enumerate(networks_cfg):
                if not isinstance(entry, dict):
                    raise ValueError("Each item in networks must be a mapping")
                entry_cfg = entry.get("network") if isinstance(entry.get("network"), dict) else entry
                network_cfg = dict(entry_cfg)
                network_id = (
                    network_cfg.pop("id", None)
                    or network_cfg.get("name")
                    or f"network-{index + 1}"
                )
                network = self._build_network_from_config(
                    network_cfg,
                    default_output_units_cfg=default_units,
                )
                bundles.append(self._create_bundle(str(network_id), network))
        else:
            network_cfg = self.raw.get("network")
            if not network_cfg:
                raise ValueError("network configuration is required")
            network = self._build_network_from_config(
                dict(network_cfg),
                default_output_units_cfg=default_units,
            )
            network_id = network_cfg.get("id") or network_cfg.get("name") or "network"
            bundles.append(self._create_bundle(str(network_id), network))

        links_cfg = self.raw.get("links") or []
        if links_cfg and not isinstance(links_cfg, list):
            raise ValueError("links must be provided as a list")
        shared_nodes = self._build_shared_node_groups(bundles, links_cfg)
        solver_settings = self._build_system_solver_settings(self.raw.get("system_solver"))
        optimizer_settings = self._build_system_optimizer_settings(self.raw.get("system_optimizer"))
        return NetworkSystem(
            bundles=bundles,
            shared_nodes=shared_nodes,
            solver_settings=solver_settings,
            optimizer_settings=optimizer_settings,
        )

    def _build_fluid(self, fluid_cfg: Dict[str, Any]) -> Fluid:
        # self._validate_keys(fluid_cfg, {"name", "phase", "viscosity"}, context="fluid")
        logger.info(f"{fluid_cfg.get('name')} is loaded successfully.")
        
        phase = fluid_cfg.get("phase", "liquid")
        logger.info(f"{fluid_cfg.get('name')} has phase {phase}.")
        
        viscosity = self._require_positive_quantity(
            fluid_cfg.get("viscosity"),
            "fluid.viscosity",
            target_unit="Pa*s",
        )
        logger.info(f"viscosity is {viscosity} is loaded successfully.")
        
        if phase == "liquid":
            # self._validate_keys(fluid_cfg, {"density"}, context="liquid")
            molecular_weight = None
            z_factor = None
            specific_heat_ratio = None
            density_value = self._quantity(
                fluid_cfg.get("density"),
                "fluid.density",
                target_unit="kg/m^3",
            )
            logger.info(f"density is {density_value} is loaded successfully.")
        else:
            density_value = None
            molecular_weight = self._coerce_optional_float(
                fluid_cfg.get("molecular_weight"),
                "fluid.molecular_weight",
            )
            logger.info(f"molecular_weight is {molecular_weight} is loaded successfully.")
            z_factor = self._coerce_optional_float(
                fluid_cfg.get("z_factor", 1.0),
                "fluid.z_factor",
            )
            logger.info(f"z_factor is {z_factor} is loaded successfully.")
            specific_heat_ratio = self._coerce_optional_float(
                fluid_cfg.get("specific_heat_ratio", 1.0),
                "fluid.specific_heat_ratio",
            )
            logger.info(f"specific_heat_ratio is {specific_heat_ratio} is loaded successfully.")

        fluid = Fluid(
            name=fluid_cfg.get("name"),
            phase=phase,
            density=density_value if density_value is not None else 0.0,
            molecular_weight=molecular_weight if molecular_weight is not None else 0.0,
            z_factor=z_factor if z_factor is not None else 1.0,
            specific_heat_ratio=specific_heat_ratio if specific_heat_ratio is not None else 1.0,
            viscosity=viscosity,
            standard_flow_rate=self._quantity(
                fluid_cfg.get("standard_flow_rate"), "fluid.standard_flow_rate", target_unit="m^3/s"
            ),
            vapor_pressure=self._quantity(fluid_cfg.get("vapor_pressure"), "fluid.vapor_pressure", target_unit="Pa"),
            critical_pressure=self._quantity(
                fluid_cfg.get("critical_pressure"), "fluid.critical_pressure", target_unit="Pa"
            ),
        )
        return fluid

    def _build_section(self, cfg: Dict[str, Any]) -> PipeSection:
        # Build the pipe_section from read network config
        # self._validate_keys(cfg, SECTION_ALLOWED_KEYS, context=f"section '{cfg.get('id', '<unknown>')}'")
        control_valve = self._build_control_valve(cfg.get("control_valve"))
        orifice = self._build_orifice(cfg.get("orifice"))
        schedule = str(cfg.get("schedule", "40"))
        pipe_npd = self._quantity(cfg.get("pipe_NPD"), "pipe_NPD")
        pipe_diameter = self._quantity(cfg.get("pipe_diameter"), "pipe_diameter", target_unit="m")
        if pipe_diameter is None:
            if pipe_npd is None or schedule is None:
                raise ValueError("Either pipe_diameter or pipe_NPD must be provided")
            pipe_diameter = inner_diameter_from_nps(pipe_npd, schedule)
        inlet_specified = cfg.get("inlet_diameter") is not None
        outlet_specified = cfg.get("outlet_diameter") is not None
        inlet_diameter = self._diameter(cfg.get("inlet_diameter"), "inlet_diameter", default=pipe_diameter)
        outlet_diameter = self._diameter(cfg.get("outlet_diameter"), "outlet_diameter", default=pipe_diameter)
        fittings = self._build_fittings(cfg.get("fittings"), inlet_diameter, outlet_diameter, pipe_diameter)
        roughness = self._quantity(cfg.get("roughness"), "roughness", target_unit="m", default=0.0)
        length = self._quantity(cfg.get("length"), "length", target_unit="m", default=0.0) or 0.0
        elevation_change = self._quantity(
            cfg.get("elevation_change"), "elevation_change", target_unit="m", default=0.0
        )
        boundary_pressure = self._quantity(cfg.get("boundary_pressure"), "section.boundary_pressure", target_unit="Pa")
        user_fixed_loss = self._quantity(
            cfg.get("user_specified_fixed_loss"), "user_specified_fixed_loss", target_unit="Pa"
        )
        has_component = bool(control_valve or orifice or user_fixed_loss)
        if length <= 0.0 and not has_component:
            section_id = cfg.get("id", "<unknown>")
            raise ValueError(f"section.length must be provided for section '{section_id}'")
        start_node = cfg.get("from_node_id") or cfg.get("from_pipe_id")
        end_node = cfg.get("to_node_id") or cfg.get("to_pipe_id")
        pipe_section = PipeSection(
            id=cfg["id"],
            schedule=schedule,
            roughness=roughness,
            length=length,
            elevation_change=elevation_change,
            fitting_type=cfg.get("fitting_type", "LR"),
            fittings=fittings,
            fitting_K=cfg.get("fitting_K"),
            pipe_length_K=cfg.get("pipe_length_K"),
            user_K=cfg.get("user_K"),
            piping_and_fitting_safety_factor=cfg.get("piping_and_fitting_safety_factor"),
            total_K=cfg.get("total_K"),
            user_specified_fixed_loss=user_fixed_loss,
            pipe_NPD=pipe_npd,
            description=cfg.get("description") or f"Line {cfg['id']}",
            design_margin=self._coerce_optional_float(cfg.get("design_margin"), "section.design_margin"),
            pipe_diameter=pipe_diameter,
            inlet_diameter=inlet_diameter,
            outlet_diameter=outlet_diameter,
            erosional_constant=cfg.get("erosional_constant"),
            inlet_diameter_specified=inlet_specified,
            outlet_diameter_specified=outlet_specified,
            control_valve=control_valve,
            orifice=orifice,
            boundary_pressure=boundary_pressure,
            direction=cfg.get("direction"),
            flow_splitting_factor=self._coerce_optional_float(cfg.get("flow_splitting_factor"), "section.flow_splitting_factor") or 1.0,
            from_pipe_id=start_node,
            to_pipe_id=end_node,
        )
        return pipe_section

    def _build_output_units(self, cfg: Optional[Dict[str, Any]]) -> OutputUnits:
        if not cfg:
            return OutputUnits()
        valid_keys = set(OutputUnits.__dataclass_fields__.keys())
        normalized: Dict[str, str] = {}
        for key, value in cfg.items():
            if key not in valid_keys:
                raise ValueError(f"Unknown output unit key '{key}'. Valid keys: {sorted(valid_keys)}")
            if value is None:
                continue
            normalized[key] = str(value).strip()
        return OutputUnits(**normalized)

    def _build_system_solver_settings(
        self,
        cfg: Optional[Dict[str, Any]],
    ) -> NetworkSystemSettings:
        if not cfg:
            return NetworkSystemSettings()
        settings = NetworkSystemSettings()
        if "max_iterations" in cfg and cfg["max_iterations"] is not None:
            try:
                value = int(cfg["max_iterations"])
            except (TypeError, ValueError) as exc:
                raise ValueError("system_solver.max_iterations must be an integer") from exc
            if value <= 0:
                raise ValueError("system_solver.max_iterations must be positive")
            settings.max_iterations = value
        if "tolerance" in cfg and cfg["tolerance"] is not None:
            try:
                tolerance = float(cfg["tolerance"])
            except (TypeError, ValueError) as exc:
                raise ValueError("system_solver.tolerance must be numeric") from exc
            if tolerance <= 0:
                raise ValueError("system_solver.tolerance must be positive")
            settings.tolerance = tolerance
        if "relaxation" in cfg and cfg["relaxation"] is not None:
            try:
                relaxation = float(cfg["relaxation"])
            except (TypeError, ValueError) as exc:
                raise ValueError("system_solver.relaxation must be numeric") from exc
            if not (0 < relaxation <= 1):
                raise ValueError("system_solver.relaxation must be in (0, 1]")
            settings.relaxation = relaxation
        return settings

    def _build_system_optimizer_settings(
        self,
        cfg: Optional[Dict[str, Any]],
    ) -> SystemOptimizerSettings:
        settings = SystemOptimizerSettings()
        if not cfg:
            return settings
        settings.enabled = bool(cfg.get("enable", False))
        if "tolerance" in cfg and cfg["tolerance"] is not None:
            try:
                settings.tolerance = float(cfg["tolerance"])
            except (TypeError, ValueError) as exc:
                raise ValueError("system_optimizer.tolerance must be numeric") from exc
        if "damping_factor" in cfg and cfg["damping_factor"] is not None:
            try:
                settings.damping_factor = float(cfg["damping_factor"])
            except (TypeError, ValueError) as exc:
                raise ValueError("system_optimizer.damping_factor must be numeric") from exc
        if "max_iterations" in cfg and cfg["max_iterations"] is not None:
            try:
                value = int(cfg["max_iterations"])
            except (TypeError, ValueError) as exc:
                raise ValueError("system_optimizer.max_iterations must be an integer") from exc
            settings.max_iterations = value
        settings.verbose = bool(cfg.get("verbose", False))
        networks_cfg = cfg.get("networks") or {}
        if not isinstance(networks_cfg, dict):
            raise ValueError("system_optimizer.networks must be a mapping")
        for network_id, entry in networks_cfg.items():
            if not isinstance(entry, dict):
                raise ValueError("system_optimizer network entries must be mappings")
            method = str(entry.get("method", "advanced")).strip().lower() or "advanced"
            downstream_pressure = self._quantity(
                entry.get("downstream_pressure"),
                f"system_optimizer.networks['{network_id}'].downstream_pressure",
                target_unit="Pa",
            )
            tolerance = entry.get("tolerance")
            damping = entry.get("damping_factor")
            max_iterations = entry.get("max_iterations")
            network_settings = NetworkOptimizerSettings(
                network_id=str(network_id),
                downstream_pressure=downstream_pressure,
                method=method,
            )
            if tolerance is not None:
                try:
                    network_settings.tolerance = float(tolerance)
                except (TypeError, ValueError) as exc:
                    raise ValueError(
                        f"system_optimizer.networks['{network_id}'].tolerance must be numeric"
                    ) from exc
            if damping is not None:
                try:
                    network_settings.damping_factor = float(damping)
                except (TypeError, ValueError) as exc:
                    raise ValueError(
                        f"system_optimizer.networks['{network_id}'].damping_factor must be numeric"
                    ) from exc
            if max_iterations is not None:
                try:
                    network_settings.max_iterations = int(max_iterations)
                except (TypeError, ValueError) as exc:
                    raise ValueError(
                        f"system_optimizer.networks['{network_id}'].max_iterations must be an integer"
                    ) from exc
            settings.networks[network_settings.network_id] = network_settings
        return settings

    def _align_adjacent_diameters(self, sections: List[PipeSection]) -> None:
        if not sections:
            return
        for upstream, downstream in zip(sections, sections[1:]):
            upstream_exit = (
                upstream.outlet_diameter if upstream.outlet_diameter_specified else upstream.pipe_diameter
            )
            downstream_entry = (
                downstream.inlet_diameter if downstream.inlet_diameter_specified else downstream.pipe_diameter
            )
            if upstream_exit is None or downstream_entry is None:
                continue
            if self._diameters_within_tolerance(upstream_exit, downstream_entry):
                continue
            if upstream.outlet_diameter_specified or downstream.inlet_diameter_specified:
                continue
            downstream.inlet_diameter = upstream_exit
            self._ensure_swage_fitting(downstream, "inlet_swage")
            logger.debug(
                "Aligned downstream inlet diameter for section '%s' to match upstream '%s'",
                downstream.id,
                upstream.id,
            )

    def _ensure_swage_fitting(self, section: PipeSection, fit_type: str) -> None:
        if self._has_fitting(section.fittings, fit_type):
            return
        section.fittings.append(Fitting(type=fit_type, count=1))

    def _build_control_valve(self, cfg: Optional[Dict[str, Any]]) -> Optional[ControlValve]:
        if not cfg:
            return None
        return ControlValve(
            tag=cfg.get("tag"),
            cv=cfg.get("cv"),
            cg=cfg.get("cg"),
            pressure_drop=self._quantity(cfg.get("pressure_drop"), "control_valve.pressure_drop", target_unit="Pa"),
            C1=cfg.get("C1"),
            FL=cfg.get("FL"),
            Fd=cfg.get("Fd"),
            xT=cfg.get("xT"),
            inlet_diameter=self._quantity(cfg.get("inlet_diameter"), "control_valve.inlet_diameter", target_unit="m"),
            outlet_diameter=self._quantity(
                cfg.get("outlet_diameter"), "control_valve.outlet_diameter", target_unit="m"
            ),
            valve_diameter=self._quantity(cfg.get("valve_diameter"), "control_valve.valve_diameter", target_unit="m"),
            calculation_note=cfg.get("calculation_note"),
            adjustable=bool(cfg.get("adjustable")),
        )

    def _build_orifice(self, cfg: Optional[Dict[str, Any]]) -> Optional[Orifice]:
        if not cfg:
            return None
        return Orifice(
            tag=cfg.get("tag"),
            d_over_D_ratio=cfg.get("d_over_D_ratio"),
            pressure_drop=self._quantity(cfg.get("pressure_drop"), "orifice.pressure_drop", target_unit="Pa"),
            pipe_diameter=self._quantity(cfg.get("pipe_diameter"), "orifice.pipe_diameter", target_unit="m"),
            orifice_diameter=self._quantity(cfg.get("orifice_diameter"), "orifice.orifice_diameter", target_unit="m"),
            meter_type=cfg.get("meter_type"),
            taps=cfg.get("taps"),
            tap_position=cfg.get("tap_position"),
            discharge_coefficient=cfg.get("discharge_coefficient"),
            expansibility=cfg.get("expansibility"),
            calculation_note=cfg.get("calculation_note"),
        )

    def _build_fittings(
        self,
        cfg: Optional[List[Any]],
        inlet_diameter: float,
        outlet_diameter: float,
        main_diameter: float,
    ) -> List[Fitting]:
        fittings: List[Fitting] = []
        for raw in cfg or []:
            fittings.append(self._normalize_fitting(raw))

        if self._needs_swage(inlet_diameter, main_diameter) and not self._has_fitting(fittings, "inlet_swage"):
            fittings.append(Fitting(type="inlet_swage", count=1))
        if self._needs_swage(main_diameter, outlet_diameter) and not self._has_fitting(fittings, "outlet_swage"):
            fittings.append(Fitting(type="outlet_swage", count=1))

        return fittings

    def _normalize_fitting(self, raw_entry: Any) -> Fitting:
        if isinstance(raw_entry, dict):
            fit_type = str(raw_entry.get("type", "")).strip().lower()
            count = raw_entry.get("count", 1)
        else:
            fit_type = str(raw_entry).strip().lower()
            count = 1
        if not fit_type:
            raise ValueError("Fitting type must be specified")
        try:
            count_int = int(count)
        except (TypeError, ValueError) as exc:
            raise ValueError("Fitting count must be an integer") from exc
        return Fitting(type=fit_type, count=count_int)

    @staticmethod
    def _needs_swage(upstream: float, downstream: float) -> bool:
        if upstream is None or downstream is None:
            return False
        return not ConfigurationLoader._diameters_within_tolerance(upstream, downstream)

    @staticmethod
    def _has_fitting(fittings: List[Fitting], fit_type: str) -> bool:
        return any(fitting.type == fit_type for fitting in fittings)

    @staticmethod
    def _validate_keys(cfg: Dict[str, Any], allowed: set[str], *, context: str) -> None:
        unknown = set(cfg or {}) - allowed
        if unknown:
            keys = ", ".join(sorted(unknown))
            raise ValueError(f"Unknown keys in {context}: {keys}")

    @staticmethod
    def _diameters_within_tolerance(a: Optional[float], b: Optional[float]) -> bool:
        if a is None or b is None:
            return False
        diff = abs(a - b)
        scale = max(abs(a), abs(b), 1.0)
        tolerance = max(SWAGE_ABSOLUTE_TOLERANCE, SWAGE_RELATIVE_TOLERANCE * scale)
        return diff <= tolerance

    def _diameter(self, value: Optional[Any], name: str, default: Optional[float] = None) -> float:
        diameter = self._quantity(value, name, target_unit="m")
        if diameter is None:
            if default is None:
                raise ValueError(f"{name} must be provided")
            return default
        return diameter

    def _quantity(
        self,
        raw: Optional[Any],
        name: str,
        *,
        target_unit: Optional[str] = None,
        default: Optional[float] = None,
    ) -> Optional[float]:
        value = self._convert_value(raw, name, target_unit)
        if value is None:
            return default
        return value

    def _convert_value(self, raw: Optional[Any], name: str, target_unit: Optional[str]) -> Optional[float]:
        if raw is None:
            return None
        if isinstance(raw, dict):
            return self._convert_from_mapping(raw, name, target_unit)
        if isinstance(raw, (int, float)):
            return float(raw)
        if isinstance(raw, str):
            stripped = raw.strip()
            if not stripped:
                return None
            if target_unit and any(char.isspace() for char in stripped):
                converted = self._convert_from_string(stripped, target_unit)
                if converted is not None:
                    return converted
            try:
                return float(stripped)
            except ValueError as exc:
                raise ValueError(f"{name} must be numeric") from exc
        try:
            return float(raw)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"{name} must be numeric") from exc

    def _convert_from_mapping(self, raw_map: Dict[str, Any], name: str, target_unit: Optional[str]) -> float:
        if "value" not in raw_map or "unit" not in raw_map:
            raise ValueError(f"{name} entries with units must include 'value' and 'unit'")
        magnitude = raw_map["value"]
        unit = raw_map["unit"]
        try:
            magnitude_f = float(magnitude)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"{name} value must be numeric") from exc
        unit_str = str(unit).strip()
        if not unit_str:
            raise ValueError(f"{name} unit must be a non-empty string")
        if target_unit and unit_str == target_unit: # Added condition
            return magnitude_f # Return directly if units are the same
        if target_unit:
            return convert_units(magnitude_f, unit_str, target_unit)
        return magnitude_f

    def _convert_from_string(self, raw: str, target_unit: str) -> Optional[float]:
        match = QUANTITY_PATTERN.match(raw)
        if not match:
            return None
        magnitude = float(match.group(1))
        unit = match.group(2).strip()
        return convert_units(magnitude, unit, target_unit)

    def _require_positive_quantity(
        self,
        raw: Optional[Any],
        name: str,
        *,
        target_unit: Optional[str] = None,
    ) -> float:
        value = self._quantity(raw, name, target_unit=target_unit)
        if value is None:
            raise ValueError(f"{name} must be provided")
        if value <= 0:
            raise ValueError(f"{name} must be positive")
        return value

    @staticmethod
    def _coerce_optional_float(value: Optional[Any], name: str) -> Optional[float]:
        if value is None:
            return None
        try:
            return float(value)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"{name} must be numeric") from exc

    def _create_bundle(self, bundle_id: str, network: Network) -> NetworkBundle:
        node_mapping: Dict[str, str] = {}
        for node_id in network.topology.nodes.keys():
            local_id = str(node_id)
            node_mapping[local_id] = f"{bundle_id}::{local_id}"
        return NetworkBundle(id=bundle_id, network=network, node_mapping=node_mapping)

    def _build_shared_node_groups(
        self,
        bundles: List[NetworkBundle],
        links_cfg: List[Dict[str, Any]],
    ) -> Dict[str, SharedNodeGroup]:
        union = _NodeUnion()
        for bundle in bundles:
            for canonical in bundle.node_mapping.values():
                union.add(canonical)

        bundle_lookup = {bundle.id: bundle for bundle in bundles}
        for link_idx, link in enumerate(links_cfg):
            if not isinstance(link, dict):
                raise ValueError("links entries must be mappings")
            members_cfg = link.get("members")
            if not isinstance(members_cfg, list) or len(members_cfg) < 2:
                raise ValueError("Each link must include at least two members")
            canonical_members: List[str] = []
            for member in members_cfg:
                if not isinstance(member, dict):
                    raise ValueError("link members must be mappings")
                network_id = member.get("network")
                node_id = member.get("node")
                if not network_id or not node_id:
                    raise ValueError("link members must define 'network' and 'node'")
                bundle = bundle_lookup.get(str(network_id))
                if bundle is None:
                    raise ValueError(f"Unknown network '{network_id}' referenced in links[{link_idx}]")
                canonical = bundle.node_mapping.get(str(node_id))
                if canonical is None:
                    raise ValueError(
                        f"Network '{network_id}' has no node '{node_id}' referenced in links[{link_idx}]"
                    )
                canonical_members.append(canonical)
            anchor = canonical_members[0]
            for other in canonical_members[1:]:
                union.union(anchor, other)

        bias_map: Dict[str, float] = {}
        leader_lookup: Dict[str, SharedNodeMember] = {}
        for link_idx, link in enumerate(links_cfg):
            members_cfg = link.get("members") or []
            if not members_cfg:
                continue
            resolved_members: List[tuple[str, str, NetworkBundle]] = []
            for member in members_cfg:
                bundle_id = str(member.get("network"))
                node_id = str(member.get("node"))
                bundle = bundle_lookup.get(bundle_id)
                if bundle is None:
                    continue
                canonical = bundle.node_mapping.get(node_id)
                if canonical is None:
                    continue
                resolved_members.append((bundle_id, node_id, bundle))
            if not resolved_members:
                continue
            first_bundle = resolved_members[0][2]
            root = union.find(first_bundle.node_mapping[resolved_members[0][1]])
            leader_member = self._select_leader_member(resolved_members)
            leader_lookup.setdefault(
                root,
                SharedNodeMember(
                    network_id=leader_member[0],
                    node_id=leader_member[1],
                ),
            )
            bias = self._coerce_optional_float(
                link.get("pressure_bias"),
                f"links[{link_idx}].pressure_bias",
            )
            if bias is None:
                bias = 0.0
            existing_bias = bias_map.get(root)
            if existing_bias is not None and abs(existing_bias - bias) > 1e-6:
                raise ValueError(
                    f"Conflicting pressure_bias values for linked nodes in links[{link_idx}]"
                )
            bias_map[root] = bias

        groups: Dict[str, SharedNodeGroup] = {}
        for bundle in bundles:
            for node_id, canonical in list(bundle.node_mapping.items()):
                root = union.find(canonical)
                bundle.node_mapping[node_id] = root
                group = groups.get(root)
                if group is None:
                    group = SharedNodeGroup(
                        canonical_node_id=root,
                        pressure_bias=bias_map.get(root, 0.0),
                    )
                    groups[root] = group
                group.members.append(SharedNodeMember(network_id=bundle.id, node_id=node_id))

        for group in groups.values():
            leader = leader_lookup.get(group.canonical_node_id)
            if leader is None and group.members:
                leader = group.members[0]
            if leader is None:
                continue
            group.members.sort(
                key=lambda member: 0
                if (member.network_id == leader.network_id and member.node_id == leader.node_id)
                else 1,
            )
        pruned = {gid: group for gid, group in groups.items() if len(group.members) > 1}
        return pruned

    @staticmethod
    def _select_leader_member(
        resolved_members: List[tuple[str, str, NetworkBundle]],
    ) -> tuple[str, str, NetworkBundle]:
        primary_members = [member for member in resolved_members if member[2].network.primary]
        if primary_members:
            return primary_members[0]
        forward_members = [
            member for member in resolved_members if member[2].network.direction != "backward"
        ]
        if forward_members:
            return forward_members[0]
        return resolved_members[-1]


class _NodeUnion:
    def __init__(self) -> None:
        self.parent: Dict[str, str] = {}

    def add(self, item: str) -> None:
        if item not in self.parent:
            self.parent[item] = item

    def find(self, item: str) -> str:
        if item not in self.parent:
            self.parent[item] = item
        if self.parent[item] != item:
            self.parent[item] = self.find(self.parent[item])
        return self.parent[item]

    def union(self, a: str, b: str) -> None:
        root_a = self.find(a)
        root_b = self.find(b)
        if root_a == root_b:
            return
        self.parent[root_b] = root_a
