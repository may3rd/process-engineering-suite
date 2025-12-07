import json
import logging
from pathlib import Path

import pytest

from network_hydraulic.io.loader import ConfigurationLoader
from network_hydraulic.models.pipe_section import Fitting
from network_hydraulic.utils.units import convert


def section_cfg(**overrides):
    base = {
        "id": "sec-1",
        "description": None,
        "schedule": "40",
        "roughness": 1e-4,
        "length": 10.0,
        "elevation_change": 0.0,
        "fitting_type": "SCRD",
        "fittings": [],
        "pipe_diameter": 0.2,
        "inlet_diameter": 0.2,
        "outlet_diameter": 0.2,
        "control_valve": None,
        "orifice": None,
    }
    base.update(overrides)
    return base


def liquid_network_cfg(fluid_overrides=None, **kwargs):
    fluid = {
        "name": "water",
        "phase": "liquid",
        "density": 1000.0,
        "viscosity": 1e-3,
    }
    if fluid_overrides:
        fluid.update(fluid_overrides)

    network = {
        "name": "net",
        "direction": "forward",
        "mass_flow_rate": 1.0, 
        "boundary_temperature": 300.0,
        "boundary_pressure": 101325.0,
        "fluid": fluid,
        "sections": [section_cfg()],
    }
    if kwargs:
        network.update(kwargs)
    return {"network": network}


def test_loader_builds_structured_fittings():
    raw_config = {
        "network": {
            "mass_flow_rate": 1.0,
            "boundary_temperature": 300.0,
            "boundary_pressure": 101325.0,
            "fluid": {
                "name": "water",
                "phase": "liquid",
                "density": 1000.0,
                "viscosity": 1e-3,
            }
        }
    }
    loader = ConfigurationLoader(raw=raw_config)
    cfg = section_cfg(
        fittings=[
            {"type": "elbow_90", "count": 2},
            {"type": "tee_through", "count": 1},
        ]
    )
    section = loader._build_section(cfg)
    assert isinstance(section.fittings[0], Fitting)
    assert [(f.type, f.count) for f in section.fittings] == [
        ("elbow_90", 2),
        ("tee_through", 1),
    ]


def test_loader_auto_adds_swage_fittings():
    raw_config = {
        "network": {
            "mass_flow_rate": 1.0,
            "boundary_temperature": 300.0,
            "boundary_pressure": 101325.0,
            "fluid": {
                "name": "water",
                "phase": "liquid",
                "density": 1000.0,
                "viscosity": 1e-3,
            }
        }
    }
    loader = ConfigurationLoader(raw=raw_config)
    cfg = section_cfg(
        inlet_diameter=0.25,
        outlet_diameter=0.1,
        fittings=[],
        pipe_diameter=0.15,
    )
    section = loader._build_section(cfg)
    summary = {f.type: f.count for f in section.fittings}
    assert summary["inlet_swage"] == 1
    assert summary["outlet_swage"] == 1


def test_loader_derives_diameter_from_npd():
    raw_config = {
        "network": {
            "mass_flow_rate": 1.0,
            "boundary_temperature": 300.0,
            "boundary_pressure": 101325.0,
            "fluid": {
                "name": "water",
                "phase": "liquid",
                "density": 1000.0,
                "viscosity": 1e-3,
            }
        }
    }
    loader = ConfigurationLoader(raw=raw_config)
    cfg = section_cfg(pipe_NPD=6.0, schedule="40", pipe_diameter=None, inlet_diameter=None, outlet_diameter=None)
    section = loader._build_section(cfg)
    # 6" schedule 40 has an ID of 0.15408 m
    assert section.pipe_diameter == pytest.approx(0.15408, rel=1e-5)


def test_loader_converts_units_when_specified():
    loader = ConfigurationLoader(
        raw={
            "network": {
                "boundary_pressure": {"value": 50, "unit": "barg"},
                "direction": "forward",
                "mass_flow_rate": 2.0,
                "boundary_temperature": 300.0,
                "fluid": {
                    "name": "gas",
                    "phase": "gas",
                    "density": 15.0,
                    "molecular_weight": 18.0,
                    "z_factor": 1.0,
                    "specific_heat_ratio": 1.3,
                    "viscosity": 1.1e-5,
                },
                "sections": [
                    section_cfg(
                        length={"value": 100, "unit": "ft"},
                        elevation_change={"value": 12, "unit": "ft"},
                        roughness={"value": 1.5, "unit": "mm"},
                        control_valve={"pressure_drop": {"value": 5, "unit": "psig"}},
                    )
                ],
            }
        }
    )
    network = loader.build_network()
    assert network.boundary_pressure == pytest.approx(convert(50, "barg", "Pa"))
    section = network.sections[0]
    assert section.length == pytest.approx(convert(100, "ft", "m"))
    assert section.elevation_change == pytest.approx(convert(12, "ft", "m"))
    assert section.roughness == pytest.approx(convert(1.5, "mm", "m"))
    assert section.control_valve is not None
    assert section.control_valve.pressure_drop == pytest.approx(convert(5, "psig", "Pa"))


def test_loader_captures_section_description():
    raw = liquid_network_cfg()
    raw["network"]["sections"][0]["description"] = "Feed line to compressor"
    loader = ConfigurationLoader(raw=raw)
    network = loader.build_network()
    assert network.sections[0].description == "Feed line to compressor"


def _branching_network_cfg() -> dict:
    raw = liquid_network_cfg()
    raw["network"]["sections"] = [
        section_cfg(id="sec-a", from_node_id="node-source", to_node_id="node-split"),
        section_cfg(id="sec-b", from_node_id="node-other", to_node_id="node-leaf"),
    ]
    return raw


def _cycle_network_cfg() -> dict:
    raw = liquid_network_cfg()
    raw["network"]["sections"] = [
        section_cfg(id="sec-loop-a", from_node_id="node-loop-1", to_node_id="node-loop-2"),
        section_cfg(id="sec-loop-b", from_node_id="node-loop-2", to_node_id="node-loop-1"),
    ]
    return raw


def _multi_network_cfg() -> dict:
    fluid = {
        "name": "water",
        "phase": "liquid",
        "density": 1000.0,
        "viscosity": 1e-3,
    }
    supply_section = section_cfg(
        id="supply",
        from_node_id="node-source",
        to_node_id="node-junction",
    )
    branch_section = section_cfg(
        id="branch",
        from_node_id="node-junction",
        to_node_id="node-leaf",
    )
    return {
        "networks": [
            {
                "id": "supply-net",
                "name": "Supply",
                "direction": "forward",
                "mass_flow_rate": 1.0,
                "boundary_temperature": 300.0,
                "boundary_pressure": 101325.0,
                "fluid": fluid,
                "sections": [supply_section],
            },
            {
                "id": "branch-net",
                "name": "Branch",
                "direction": "forward",
                "mass_flow_rate": 0.5,
                "boundary_temperature": 300.0,
                "boundary_pressure": 90000.0,
                "fluid": fluid,
                "sections": [branch_section],
            },
        ],
        "links": [
            {
                "members": [
                    {"network": "supply-net", "node": "node-junction"},
                    {"network": "branch-net", "node": "node-junction"},
                ]
            }
        ],
    }


def test_loader_warns_on_branching(caplog):
    caplog.set_level(logging.WARNING)
    loader = ConfigurationLoader(raw=_branching_network_cfg())
    loader.build_network()
    assert any("multiple" in record.message for record in caplog.records)


def test_loader_warns_on_cycle(caplog):
    caplog.set_level(logging.WARNING)
    loader = ConfigurationLoader(raw=_cycle_network_cfg())
    loader.build_network()
    assert any("no start node" in record.message for record in caplog.records)


def test_loader_defaults_sections_to_series():
    raw = liquid_network_cfg()
    raw["network"]["sections"] = [
        section_cfg(id="s1"),
        section_cfg(id="s2"),
        section_cfg(id="s3"),
    ]
    loader = ConfigurationLoader(raw=raw)
    network = loader.build_network()
    topology = network.topology
    start_nodes = topology.start_nodes()
    assert start_nodes == ["s1_start"]
    first_edge = topology.edges["s1"]
    assert first_edge.end_node_id == "s1_end"
    second_edge = topology.edges["s2"]
    assert second_edge.start_node_id == "s1_end"
    third_edge = topology.edges["s3"]
    assert third_edge.start_node_id == "s2_end"


def test_loader_requires_section_length():
    raw = liquid_network_cfg()
    raw["network"]["sections"][0].pop("length")
    loader = ConfigurationLoader(raw=raw)
    with pytest.raises(ValueError, match=r"section\.length .*sec-1"):
        loader.build_network()


def test_loader_allows_lengthless_component_section():
    raw = liquid_network_cfg()
    section = raw["network"]["sections"][0]
    section.pop("length")
    section["control_valve"] = {"pressure_drop": {"value": 10.0, "unit": "kPa"}}
    loader = ConfigurationLoader(raw=raw)
    network = loader.build_network()
    loaded_section = network.sections[0]
    assert loaded_section.length == 0.0
    assert loaded_section.control_valve is not None
    assert loaded_section.control_valve.pressure_drop == pytest.approx(convert(10.0, "kPa", "Pa"))


def test_loader_aligns_adjacent_pipe_diameters():
    upstream = section_cfg(id="s1", pipe_diameter=0.1, fittings=[])
    upstream.pop("outlet_diameter", None)
    downstream = section_cfg(
        id="s2",
        pipe_diameter=0.2,
        fittings=[],
    )
    downstream.pop("inlet_diameter", None)
    downstream["outlet_diameter"] = 0.2

    raw = {
        "network": {
            "name": "adjacent",
            "direction": "forward",
            "mass_flow_rate": 1.0,
            "boundary_temperature": 300.0,
            "boundary_pressure": 101325.0,
            "fluid": {
                "name": "water",
                "phase": "liquid",
                "density": 1000.0,
                "viscosity": 1e-3,
            },
            "sections": [
                upstream,
                downstream,
            ],
        }
    }
    loader = ConfigurationLoader(raw=raw)
    network = loader.build_network()
    first, second = network.sections

    assert first.pipe_diameter == pytest.approx(0.1)
    assert second.pipe_diameter == pytest.approx(0.2)
    assert second.inlet_diameter == pytest.approx(first.pipe_diameter)
    summary = {f.type: f.count for f in second.fittings}
    assert summary.get("inlet_swage") == 1


def test_loader_does_not_add_swage_for_near_equal_diameters():
    upstream = section_cfg(
        id="s1",
        pipe_diameter=0.15408,
        inlet_diameter=0.15408,
        outlet_diameter=0.15408,
        fittings=[],
    )
    downstream = section_cfg(
        id="s2",
        pipe_diameter=0.1540805,
        inlet_diameter=None,
        outlet_diameter=0.1540805,
        fittings=[],
    )
    raw = {
        "network": {
            "name": "tolerance",
            "direction": "forward",
            "mass_flow_rate": 1.0,
            "boundary_temperature": 300.0,
            "boundary_pressure": 101325.0,
            "fluid": {
                "name": "water",
                "phase": "liquid",
                "density": 1000.0,
                "viscosity": 1e-3,
            },
            "sections": [
                upstream,
                downstream,
            ],
        }
    }
    loader = ConfigurationLoader(raw=raw)
    network = loader.build_network()
    _, second = network.sections
    assert not any(f.type == "inlet_swage" for f in second.fittings)


def test_loader_respects_user_defined_diameters_between_sections():
    raw = {
        "network": {
            "name": "adjacent",
            "direction": "forward",
            "mass_flow_rate": 1.0,
            "boundary_temperature": 300.0,
            "boundary_pressure": 101325.0,
            "fluid": {
                "name": "water",
                "phase": "liquid",
                "density": 1000.0,
                "viscosity": 1e-3,
            },
            "sections": [
                section_cfg(
                    id="s1",
                    pipe_diameter=0.1,
                    outlet_diameter=0.2,
                    fittings=[],
                ),
                section_cfg(
                    id="s2",
                    pipe_diameter=0.2,
                    inlet_diameter=0.2,
                    fittings=[],
                ),
            ],
        }
    }
    loader = ConfigurationLoader(raw=raw)
    network = loader.build_network()
    first, second = network.sections
    assert not any(f.type == "inlet_swage" for f in second.fittings)
    assert second.inlet_diameter == pytest.approx(0.2)
    assert first.outlet_diameter == pytest.approx(0.2)


def test_loader_defaults_elevation_change_to_zero_when_missing():
    raw_config = {
        "network": {
            "mass_flow_rate": 1.0,
            "boundary_temperature": 300.0,
            "boundary_pressure": 101325.0,
            "fluid": {
                "name": "water",
                "phase": "liquid",
                "density": 1000.0,
                "viscosity": 1e-3,
            }
        }
    }
    loader = ConfigurationLoader(raw=raw_config)
    cfg = section_cfg()
    cfg.pop("elevation_change")
    section = loader._build_section(cfg)
    assert section.elevation_change == 0.0


def test_loader_parses_output_units_block():
    raw = {
        "network": {
            "name": "units",
            "direction": "forward",
            "mass_flow_rate": 1.0,
            "boundary_temperature": 300.0,
            "boundary_pressure": 101325.0,
            "output_units": {
                "pressure": "kPag",
                "pressure_drop": "kPa",
                "temperature": "degC",
            },
            "fluid": {
                "name": "water",
                "phase": "liquid",
                "density": 1000.0,
                "viscosity": 1e-3,
            },
            "sections": [
                section_cfg(),
            ],
        }
    }
    loader = ConfigurationLoader(raw=raw)
    network = loader.build_network()
    units = network.output_units
    assert units.pressure == "kPag"


def test_loader_reads_upstream_only_fixture():
    loader = ConfigurationLoader.from_yaml_path(Path("tests/fixtures/networks/upstream_only.yaml"))
    network = loader.build_network()
    assert network.upstream_pressure is not None
    assert network.downstream_pressure is None
    assert network.direction == "forward"


def test_loader_reads_downstream_only_fixture():
    loader = ConfigurationLoader.from_yaml_path(Path("tests/fixtures/networks/downstream_only.yaml"))
    network = loader.build_network()
    assert network.upstream_pressure is None
    assert network.downstream_pressure is not None
    assert network.direction == "backward"


def test_loader_reads_dual_boundary_fixture():
    loader = ConfigurationLoader.from_yaml_path(Path("tests/fixtures/networks/up_down_pressures.yaml"))
    network = loader.build_network()
    assert network.upstream_pressure is not None
    assert network.downstream_pressure is not None
    assert network.direction == "auto"


def test_loader_normalizes_fitting_aliases():
    raw = liquid_network_cfg(
        boundary_temperature=300.0,
        boundary_pressure=101325.0,
    )
    raw["network"]["sections"][0]["fittings"] = [
        {"type": "check_valve_tilting", "count": 2},
    ]
    loader = ConfigurationLoader(raw=raw)
    network = loader.build_network()
    fitting = network.sections[0].fittings[0]
    assert fitting.type == "tilting_check_valve"
    assert fitting.count == 2


def test_loader_design_margin_honors_section_override():
    raw = {
        "network": {
            "name": "margin",
            "direction": "forward",
            "design_margin": 8.0,
            "mass_flow_rate": 1.0,
            "boundary_temperature": 300.0,
            "boundary_pressure": 101325.0,
            "fluid": {
                "name": "water",
                "phase": "liquid",
                "density": 1000.0,
                "viscosity": 1e-3,
            },
            "sections": [
                section_cfg(id="s1", design_margin=12.0),
                section_cfg(id="s2"),
            ],
        }
    }
    loader = ConfigurationLoader(raw=raw)
    network = loader.build_network()
    s1, s2 = network.sections
    assert s1.design_margin == 12.0
    assert s2.design_margin is None
    assert network.design_margin == 8.0


def test_loader_from_json_path(tmp_path: Path):
    config = {
        "network": {
            "name": "json-network",
            "direction": "forward",
            "boundary_pressure": 101325.0,
            "mass_flow_rate": 1.0, 
                "boundary_temperature": {"value": 25.0, "unit": "degC"},
                "boundary_pressure": 250000.0,
            "fluid": {
                "name": "water",
                "phase": "liquid",
                "density": 997.0,
                "viscosity": 1.0e-3,
            },
            "sections": [
                section_cfg(
                    length=50.0,
                    elevation_change=0.0,
                    fittings=[{"type": "elbow_90", "count": 2}],
                )
            ],
        }
    }
    json_path = tmp_path / "network.json"
    json_path.write_text(json.dumps(config), encoding="utf-8")

    loader = ConfigurationLoader.from_json_path(json_path)
    network = loader.build_network()

    assert network.name == "json-network"
    assert len(network.sections) == 1
    section = network.sections[0]
    assert section.length == 50.0
    assert section.fittings[0].type == "elbow_90"


def test_loader_from_xml_path(tmp_path: Path):
    xml_content = """<?xml version="1.0" encoding="UTF-8"?>
<network>
  <name>xml-network</name>
  <direction>forward</direction>
  <mass_flow_rate>1.0</mass_flow_rate>
  <boundary_temperature>300.0</boundary_temperature>
  <boundary_pressure>101325.0</boundary_pressure>
  <fluid>
    <name>water</name>
    <phase>liquid</phase>
    <density>997.0</density>
    <viscosity>0.001</viscosity>
  </fluid>
  <sections>
    <section>
      <id>s1</id>
      <schedule>40</schedule>
      <pipe_diameter unit="m">0.05</pipe_diameter>
      <length unit="cm">500.0</length>
      <roughness unit="mm">0.0457</roughness>
    </section>
  </sections>
</network>
"""
    xml_path = tmp_path / "network.xml"
    xml_path.write_text(xml_content, encoding="utf-8")

    loader = ConfigurationLoader.from_xml_path(xml_path)
    network = loader.build_network()

    assert network.name == "xml-network"
    assert len(network.sections) == 1
    assert network.sections[0].pipe_diameter == pytest.approx(0.05)
    assert network.sections[0].length == pytest.approx(5.0)
    assert network.sections[0].roughness == pytest.approx(0.0000457)

def test_loader_handles_invalid_unit_string():
    raw = liquid_network_cfg(
        boundary_temperature={
            "value": 100.0,
            "unit": "invalid_unit",
        },
        boundary_pressure=101325.0,
    )
    loader = ConfigurationLoader(raw=raw)
    network = loader.build_network()
    assert network.boundary_temperature == pytest.approx(100.0)


def test_loader_raises_for_non_numeric_quantity_string():
    raw = liquid_network_cfg(
        boundary_temperature="not_a_number K",
        boundary_pressure=101325.0,
    )
    loader = ConfigurationLoader(raw=raw)
    with pytest.raises(ValueError, match="network.boundary_temperature must be numeric"):
        loader.build_network()


def test_loader_raises_for_non_numeric_quantity_value_in_map():
    raw = liquid_network_cfg(
        boundary_temperature={
            "value": "not_a_number",
            "unit": "K",
        },
        boundary_pressure=101325.0,
    )
    loader = ConfigurationLoader(raw=raw)
    with pytest.raises(ValueError, match="network.boundary_temperature value must be numeric"):
        loader.build_network()


def test_loader_raises_for_missing_unit_in_map():
    raw = liquid_network_cfg(
        boundary_temperature={
            "value": 100.0,
            "unit": None,
        },
        boundary_pressure=101325.0,
    )
    loader = ConfigurationLoader(raw=raw)
    network = loader.build_network()
    assert network.boundary_temperature == pytest.approx(100.0)


def test_loader_raises_for_missing_required_positive_quantity():
    raw = liquid_network_cfg(
        boundary_temperature=None,
        boundary_pressure=101325.0,
    )
    loader = ConfigurationLoader(raw=raw)
    with pytest.raises(ValueError, match="network.boundary_temperature must be provided"):
        loader.build_network()


def test_loader_raises_for_invalid_fluid_phase():
    raw = liquid_network_cfg(
        fluid_overrides={
            "phase": "solid",
        }
    )
    loader = ConfigurationLoader(raw=raw)
    with pytest.raises(ValueError, match="fluid.phase must be 'liquid', 'gas', or 'vapor'"):
        loader.build_network()


def test_build_network_system_links_nodes():
    loader = ConfigurationLoader(raw=_multi_network_cfg())
    system = loader.build_network_system()
    assert len(system.bundles) == 2
    supply = next(bundle for bundle in system.bundles if bundle.id == "supply-net")
    branch = next(bundle for bundle in system.bundles if bundle.id == "branch-net")
    # Junction node should share a canonical ID
    assert supply.node_mapping["node-junction"] == branch.node_mapping["node-junction"]
    shared_id = supply.node_mapping["node-junction"]
    assert shared_id in system.shared_nodes
    group = system.shared_nodes[shared_id]
    assert len(group.members) == 2


def test_build_network_raises_when_multiple_networks_defined():
    loader = ConfigurationLoader(raw=_multi_network_cfg())
    with pytest.raises(ValueError, match="build_network_system"):
        loader.build_network()


def test_primary_network_member_becomes_leader():
    raw = _multi_network_cfg()
    raw["networks"][1]["primary"] = True
    loader = ConfigurationLoader(raw=raw)
    system = loader.build_network_system()
    group = next(group for group in system.shared_nodes.values() if len(group.members) > 1)
    assert group.members[0].network_id == "branch-net"


def test_backward_direction_defaults_to_last_member_leader():
    raw = _multi_network_cfg()
    for entry in raw["networks"]:
        entry["direction"] = "backward"
        entry.pop("primary", None)
    loader = ConfigurationLoader(raw=raw)
    system = loader.build_network_system()
    group = next(group for group in system.shared_nodes.values() if len(group.members) > 1)
    assert group.members[0].network_id == "branch-net"


def test_root_output_units_apply_to_single_network():
    raw = liquid_network_cfg()
    raw["output_units"] = {"pressure": "kPag"}
    loader = ConfigurationLoader(raw=raw)
    network = loader.build_network()
    assert network.output_units.pressure == "kPag"


def test_global_output_units_apply_to_multi_networks():
    raw = _multi_network_cfg()
    raw["output_units"] = {"pressure": "kPag"}
    loader = ConfigurationLoader(raw=raw)
    system = loader.build_network_system()
    for bundle in system.bundles:
        assert bundle.network.output_units.pressure == "kPag"


def test_network_output_units_override_global_defaults():
    raw = _multi_network_cfg()
    raw["output_units"] = {"pressure": "kPag"}
    raw["networks"][0]["output_units"] = {"pressure": "psig"}
    loader = ConfigurationLoader(raw=raw)
    system = loader.build_network_system()
    supply = next(bundle for bundle in system.bundles if bundle.id == "supply-net")
    branch = next(bundle for bundle in system.bundles if bundle.id == "branch-net")
    assert supply.network.output_units.pressure == "psig"
    assert branch.network.output_units.pressure == "kPag"


def test_system_solver_settings_are_parsed():
    raw = _multi_network_cfg()
    raw["system_solver"] = {
        "max_iterations": 8,
        "tolerance": 0.25,
        "relaxation": 0.6,
    }
    loader = ConfigurationLoader(raw=raw)
    system = loader.build_network_system()
    assert system.solver_settings.max_iterations == 8
    assert system.solver_settings.tolerance == 0.25
    assert system.solver_settings.relaxation == 0.6


def test_invalid_relaxation_raises_value_error():
    raw = _multi_network_cfg()
    raw["system_solver"] = {"relaxation": 1.5}
    loader = ConfigurationLoader(raw=raw)
    with pytest.raises(ValueError, match="system_solver.relaxation"):
        loader.build_network_system()
