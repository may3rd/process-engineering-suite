import json
from pathlib import Path

import pytest
import yaml

from network_hydraulic.io import results as results_io
from network_hydraulic.models.fluid import Fluid, GAS_CONSTANT
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
from network_hydraulic.models.output_units import OutputUnits
from network_hydraulic.models.network_system import NetworkResultBundle, NetworkSystemResult
from network_hydraulic.utils.units import convert


def build_section(section_id: str = "sec-1") -> PipeSection:
    return PipeSection(
        id=section_id,
        schedule="40",
        roughness=1e-4,
        length=5.0,
        elevation_change=0.0,
        fitting_type="SCRD",
        fittings=[],
        fitting_K=None,
        pipe_length_K=None,
        user_K=None,
        piping_and_fitting_safety_factor=None,
        total_K=None,
        user_specified_fixed_loss=None,
        pipe_NPD=4.0,
        pipe_diameter=0.1,
        inlet_diameter=0.1,
        outlet_diameter=0.1,
        erosional_constant=None,
        mach_number=None,
        boundary_pressure=None,
        control_valve=None,
        orifice=None,
    )


def build_fluid() -> Fluid:
    return Fluid(
        name="gas",
        phase="gas",
        density=5.0,
        molecular_weight=18.0,
        z_factor=1.0,
        specific_heat_ratio=1.3,
        viscosity=1.0e-5,
        standard_flow_rate=None,
        vapor_pressure=None,
        critical_pressure=None,
    )


def make_summary(density: float) -> ResultSummary:
    inlet_state = StatePoint(pressure=2e5, temperature=300.0, density=density)
    outlet_state = StatePoint(pressure=1.9e5, temperature=300.0, density=density)
    return ResultSummary(inlet=inlet_state, outlet=outlet_state)


def make_results(summary: ResultSummary, section_id: str = "sec-1") -> SectionResult:
    calc = CalculationOutput(pressure_drop=PressureDropDetails())
    return SectionResult(section_id=section_id, calculation=calc, summary=summary)


def test_write_output_includes_flow_rates(tmp_path: Path):
    section = build_section()
    fluid = build_fluid()
    network = Network(
        name="demo",
        description=None,
        fluid=fluid,
        direction="forward",
        boundary_pressure=150000.0,
        gas_flow_model="isothermal",
        sections=[section],
        boundary_temperature=300.0,
        mass_flow_rate=2.0,
    )
    summary = make_summary(density=4.0)
    section.mass_flow_rate = network.mass_flow_rate
    section_result = make_results(summary)
    network_result = NetworkResult(sections=[section_result], aggregate=CalculationOutput(), summary=summary)

    out_path = tmp_path / "result.yaml"
    results_io.write_output(out_path, network, network_result)

    with out_path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)

        flow_summary = data["network"]["summary"]["flow"]
        actual_expected = network.mass_flow_rate / summary.inlet.density
        std_density = results_io._standard_gas_density(fluid, results_io.STANDARD_TEMPERATURE, results_io.STANDARD_PRESSURE)
        standard_expected = network.mass_flow_rate / std_density
        assert flow_summary["volumetric_actual"] == pytest.approx(actual_expected)
        assert flow_summary["volumetric_standard"] == pytest.approx(standard_expected)
    
    section_flow = data["network"]["sections"][0]["calculation_result"]["flow"]
    assert section_flow["volumetric_actual"] == pytest.approx(actual_expected)
    assert section_flow["volumetric_standard"] == pytest.approx(standard_expected)
    assert data["network"]["output_units"] == network.output_units.as_dict()


def test_section_flow_uses_section_mass_flow(tmp_path: Path):
    section = build_section()
    fluid = build_fluid()
    network = Network(
        name="section-flow",
        description=None,
        fluid=fluid,
        direction="forward",
        boundary_pressure=150000.0,
        gas_flow_model="isothermal",
        sections=[section],
        boundary_temperature=300.0,
        mass_flow_rate=2.0,
    )
    summary = make_summary(density=4.0)
    section.mass_flow_rate = 1.5
    section_result = make_results(summary)
    network_result = NetworkResult(sections=[section_result], aggregate=CalculationOutput(), summary=summary)

    out_path = tmp_path / "section_flow.yaml"
    results_io.write_output(out_path, network, network_result)

    with out_path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)

    network_flow = data["network"]["summary"]["flow"]
    section_flow = data["network"]["sections"][0]["calculation_result"]["flow"]
    network_expected = network.mass_flow_rate / summary.inlet.density
    section_expected = section.mass_flow_rate / summary.inlet.density
    assert network_flow["volumetric_actual"] == pytest.approx(network_expected)
    assert section_flow["volumetric_actual"] == pytest.approx(section_expected)


def test_write_output_handles_multiple_sections_flow_rates(tmp_path: Path):
    sec1 = build_section("sec-1")
    sec2 = build_section("sec-2")
    fluid = build_fluid()
    network = Network(
        name="multi",
        description=None,
        fluid=fluid,
        direction="forward",
        boundary_pressure=150000.0,
        gas_flow_model="isothermal",
        sections=[sec1, sec2],
        boundary_temperature=300.0,
        mass_flow_rate=3.0,
    )
    summary1 = make_summary(density=4.0)
    summary2 = make_summary(density=5.0)
    sec1.mass_flow_rate = 2.0
    sec2.mass_flow_rate = 1.0
    result1 = make_results(summary1, section_id="sec-1")
    result2 = make_results(summary2, section_id="sec-2")
    network_result = NetworkResult(
        sections=[result1, result2],
        aggregate=CalculationOutput(),
        summary=summary1,
    )

    out_path = tmp_path / "multi_sections.yaml"
    results_io.write_output(out_path, network, network_result)

    with out_path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)

    sections_payload = data["network"]["sections"]
    flow1 = sections_payload[0]["calculation_result"]["flow"]
    flow2 = sections_payload[1]["calculation_result"]["flow"]
    assert flow1["volumetric_actual"] == pytest.approx(sec1.mass_flow_rate / summary1.inlet.density)
    assert flow2["volumetric_actual"] == pytest.approx(sec2.mass_flow_rate / summary2.inlet.density)


def test_write_output_respects_custom_output_units(tmp_path: Path):
    section = build_section()
    fluid = build_fluid()
    network = Network(
        name="demo",
        description=None,
        fluid=fluid,
        direction="forward",
        boundary_pressure=150000.0,
        gas_flow_model="isothermal",
        sections=[section],
        boundary_temperature=300.0,
        mass_flow_rate=2.0,
    )
    network.output_units = OutputUnits(
        pressure="kPag",
        pressure_drop="kPa",
        temperature="degC",
        density="kg/m^3",
        velocity="ft/s",
        volumetric_flow_rate="m^3/h",
        mass_flow_rate="kg/h",
    )
    summary = make_summary(density=4.0)
    section.mass_flow_rate = network.mass_flow_rate
    section_result = make_results(summary)
    pd = section_result.calculation.pressure_drop
    pd.pipe_and_fittings = 5000.0
    pd.total_segment_loss = 5000.0
    network_result = NetworkResult(sections=[section_result], aggregate=CalculationOutput(), summary=summary)

    out_path = tmp_path / "custom_units.yaml"
    results_io.write_output(out_path, network, network_result)

    with out_path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)

    units_block = data["network"]["output_units"]
    assert units_block["pressure"] == "kPag"
    boundary_expected = convert(network.boundary_pressure, "Pa", "kPag")
    assert data["network"]["boundary_pressure"] == pytest.approx(boundary_expected)

    fluid_block = data["network"]["fluid"]

    flow_summary = data["network"]["summary"]["flow"]
    actual_expected = convert(network.mass_flow_rate / summary.inlet.density, "m^3/s", "m^3/h")
    assert flow_summary["volumetric_actual"] == pytest.approx(actual_expected)

    section_drop = data["network"]["sections"][0]["calculation_result"]["pressure_drop"]
    assert section_drop["pipe_and_fittings"] == pytest.approx(convert(5000.0, "Pa", "kPa"))
    assert section_drop["total"] == pytest.approx(convert(5000.0, "Pa", "kPa"))


def test_write_output_writes_json_when_requested(tmp_path: Path):
    section = build_section()
    fluid = build_fluid()
    network = Network(
        name="demo",
        description=None,
        fluid=fluid,
        direction="forward",
        boundary_pressure=150000.0,
        gas_flow_model="isothermal",
        sections=[section],
        boundary_temperature=300.0,
        mass_flow_rate=2.0,
    )
    summary = make_summary(density=4.0)
    section_result = make_results(summary)
    network_result = NetworkResult(sections=[section_result], aggregate=CalculationOutput(), summary=summary)

    out_path = tmp_path / "result.json"
    results_io.write_output(out_path, network, network_result)

    with out_path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    assert "network" in data
    assert data["network"]["name"] == "demo"


def test_section_description_included_in_output(tmp_path: Path):
    section = build_section()
    section.description = "Feed gas from knockout drum"
    fluid = build_fluid()
    network = Network(
        name="demo",
        description="Overall feed network",
        fluid=fluid,
        direction="forward",
        boundary_pressure=150000.0,
        gas_flow_model="isothermal",
        sections=[section],
        boundary_temperature=300.0,
        mass_flow_rate=2.0,
    )
    summary = make_summary(density=4.0)
    section_result = make_results(summary)
    network_result = NetworkResult(sections=[section_result], aggregate=CalculationOutput(), summary=summary)

    out_path = tmp_path / "section_description.yaml"
    results_io.write_output(out_path, network, network_result)

    with out_path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    assert data["network"]["sections"][0]["description"] == "Feed gas from knockout drum"


def test_print_summary_output(capfd):
    section = build_section()
    fluid = build_fluid()
    network = Network(
        name="demo-summary",
        description="A demo network for summary printing",
        fluid=fluid,
        direction="forward",
        boundary_pressure=150000.0,
        gas_flow_model="isothermal",
        sections=[section],
        boundary_temperature=300.0,
        mass_flow_rate=2.0,
    )
    network.output_units = OutputUnits(
        pressure="kPag",
        pressure_drop="kPa",
        temperature="degC",
        density="kg/m^3",
        velocity="m/s",
        volumetric_flow_rate="m^3/h",
        mass_flow_rate="kg/h",
    )
    summary = make_summary(density=4.0)
    section_result = make_results(summary)
    pd = section_result.calculation.pressure_drop
    pd.pipe_and_fittings = 5000.0
    pd.control_valve_pressure_drop = 1000.0
    pd.orifice_pressure_drop = 500.0
    # Removed pd.elevation = 200.0
    pd.total_segment_loss = 6700.0
    pd.gas_flow_critical_pressure = 120000.0
    section_result.summary.inlet.pressure = 150000.0
    section_result.summary.outlet.pressure = 143300.0
    section_result.summary.inlet.temperature = 300.0
    section_result.summary.outlet.temperature = 299.5
    section_result.summary.inlet.velocity = 10.0
    section_result.summary.outlet.velocity = 10.5
    section_result.summary.inlet.pipe_velocity = 9.5
    section_result.summary.outlet.pipe_velocity = 9.5
    section_result.summary.inlet.mach_number = 0.1
    section_result.summary.outlet.mach_number = 0.11
    section_result.summary.inlet.flow_momentum = 1000.0
    section_result.summary.outlet.flow_momentum = 1050.0
    section_result.summary.inlet.erosional_velocity = 20.0
    section_result.summary.outlet.erosional_velocity = 20.5
    section_result.summary.inlet.remarks = "OK"
    section_result.summary.outlet.remarks = "OK"

    network_result = NetworkResult(sections=[section_result], aggregate=section_result.calculation, summary=summary)

    results_io.print_summary(network, network_result)

    out, err = capfd.readouterr()
    assert "Network: demo-summary" in out
    assert "Section sec-1:" in out
    assert "Section ID: sec-1" in out
    assert "Description: A demo network for summary printing" in out
    assert "Pipe Avg Velocity: 9.500 m/s" in out

    # Test with None values
    network.description = None
    network.fluid.name = None
    network.gas_flow_model = "isothermal" # Keep valid for Network.__post_init__
    network_result.aggregate.pressure_drop.control_valve_pressure_drop = None
    network_result.aggregate.pressure_drop.orifice_pressure_drop = None
    section_result.summary.inlet.mach_number = None
    section_result.summary.outlet.mach_number = None
    section_result.summary.inlet.flow_momentum = None
    section_result.summary.outlet.flow_momentum = None
    section_result.summary.inlet.pipe_velocity = None
    section_result.summary.outlet.pipe_velocity = None
    section_result.summary.inlet.erosional_velocity = None
    section_result.summary.outlet.erosional_velocity = None
    section_result.summary.inlet.remarks = None
    section_result.summary.outlet.remarks = None

    results_io.print_summary(network, network_result)
    out, err = capfd.readouterr()
    assert "Description: —" in out
    assert "Flow Type (gas): isothermal" in out
    assert "Control Valve Loss: — kPa" in out
    assert "Orifice Loss: — kPa" in out
    assert "Mach: —" in out
    assert "Mach: —" in out
    assert "Flow Momentum (rho V^2): — Pa" in out
    assert "Flow Momentum (rho V^2): — Pa" in out
    assert "Pipe Avg Velocity: — m/s" in out
    assert "Erosional Velocity: — m/s" in out
    assert "Erosional Velocity: — m/s" in out


def test_write_results_with_none_values(tmp_path: Path):
    section = build_section()
    fluid = build_fluid()
    network = Network(
        name="none-values",
        description=None, # Set to None
        fluid=fluid,
        direction="forward",
        boundary_pressure=150000.0,
        gas_flow_model="isothermal", # Corrected to a valid value
        sections=[section],
        boundary_temperature=300.0,
        mass_flow_rate=2.0,
    )
    summary = make_summary(density=4.0)
    summary.inlet.mach_number = None
    summary.outlet.mach_number = None
    section_result = make_results(summary)
    pd = section_result.calculation.pressure_drop
    pd.control_valve_pressure_drop = None
    pd.orifice_pressure_drop = None
    # Removed pd.elevation = None
    network_result = NetworkResult(sections=[section_result], aggregate=section_result.calculation, summary=summary)

    out_path = tmp_path / "none_result.yaml"
    results_io.write_output(out_path, network, network_result)

    with out_path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)

    # Assert that None values are represented as null or omitted
    assert data["network"]["description"] is None
    assert data["network"]["boundary_pressure"] == pytest.approx(150000.0)
    assert data["network"]["gas_flow_model"] == "isothermal" # Should not be None
    assert data["network"]["sections"][0]["calculation_result"]["summary"]["inlet"]["mach_number"] is None
    assert data["network"]["sections"][0]["calculation_result"]["summary"]["outlet"]["mach_number"] is None
    assert data["network"]["sections"][0]["calculation_result"]["pressure_drop"]["control_valve"] is None
    assert data["network"]["sections"][0]["calculation_result"]["pressure_drop"]["orifice"] is None
    # Removed assert data["network"]["sections"][0]["calculation_result"]["pressure_drop"]["elevation"] is None


def test_write_output_exports_topology_nodes(tmp_path: Path):
    sec1 = build_section("sec-1")
    sec1.start_node_id = "node-start"
    sec1.end_node_id = "node-mid"
    sec2 = build_section("sec-2")
    sec2.start_node_id = "node-mid"
    sec2.end_node_id = "node-end"
    fluid = build_fluid()
    network = Network(
        name="topology",
        description=None,
        fluid=fluid,
        direction="forward",
        boundary_pressure=150000.0,
        gas_flow_model="isothermal",
        sections=[sec1, sec2],
        boundary_temperature=300.0,
        mass_flow_rate=5.0,
    )
    summary1 = make_summary(density=4.0)
    summary2 = make_summary(density=5.0)
    sec1.mass_flow_rate = 2.0
    sec2.mass_flow_rate = 3.0
    result1 = make_results(summary1, section_id="sec-1")
    result2 = make_results(summary2, section_id="sec-2")
    network_result = NetworkResult(
        sections=[result1, result2],
        aggregate=CalculationOutput(),
        summary=summary1,
    )

    out_path = tmp_path / "topology.yaml"
    results_io.write_output(out_path, network, network_result)

    with out_path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)

    topology = data["network"]["topology"]
    nodes_by_id = {node["id"]: node for node in topology["nodes"]}
    assert nodes_by_id["node-start"]["to_nodes"] == ["node-mid"]
    assert nodes_by_id["node-mid"]["from_nodes"] == ["node-start"]
    assert nodes_by_id["node-mid"]["to_nodes"] == ["node-end"]
    assert nodes_by_id["node-end"]["incoming_sections"] == ["sec-2"]
    sections_payload = data["network"]["sections"]
    assert sections_payload[0]["from_node"] == "node-start"
    assert sections_payload[0]["to_node"] == "node-mid"
    assert sections_payload[1]["from_node"] == "node-mid"
    assert sections_payload[1]["to_node"] == "node-end"


def test_topology_node_state_uses_lowest_pressure(tmp_path: Path):
    sec1 = build_section("sec-1")
    sec2 = build_section("sec-2")
    sec1.start_node_id = "node-split"
    sec1.end_node_id = "node-merge"
    sec2.start_node_id = "node-split"
    sec2.end_node_id = "node-merge"
    fluid = build_fluid()
    network = Network(
        name="merge",
        description=None,
        fluid=fluid,
        direction="forward",
        boundary_pressure=150000.0,
        gas_flow_model="isothermal",
        sections=[sec1, sec2],
        boundary_temperature=300.0,
        mass_flow_rate=4.0,
    )
    summary1 = make_summary(density=4.0)
    summary2 = make_summary(density=4.0)
    summary1.inlet.pressure = 1.0e5
    summary2.inlet.pressure = 9.5e4
    result1 = make_results(summary1, section_id="sec-1")
    result2 = make_results(summary2, section_id="sec-2")
    network_result = NetworkResult(
        sections=[result1, result2],
        aggregate=CalculationOutput(),
        summary=summary1,
    )
    out_path = tmp_path / "merge.yaml"
    results_io.write_output(out_path, network, network_result)
    with out_path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    nodes = data["network"]["topology"]["nodes"]
    center = next(node for node in nodes if node["id"] == "node-split")
    assert center["state"]["pressure"] == pytest.approx(95000.0)


def test_write_system_output_writes_multiple_networks(tmp_path: Path):
    section_a = build_section("a")
    section_b = build_section("b")
    fluid = build_fluid()
    network_a = Network(
        name="north",
        description=None,
        fluid=fluid,
        direction="forward",
        boundary_pressure=150000.0,
        gas_flow_model="isothermal",
        sections=[section_a],
        boundary_temperature=300.0,
        mass_flow_rate=2.0,
    )
    network_b = Network(
        name="south",
        description=None,
        fluid=fluid,
        direction="forward",
        boundary_pressure=140000.0,
        gas_flow_model="isothermal",
        sections=[section_b],
        boundary_temperature=295.0,
        mass_flow_rate=1.0,
    )
    summary_a = make_summary(density=4.0)
    summary_b = make_summary(density=5.0)
    result_a = NetworkResult(
        sections=[make_results(summary_a, section_id="a")],
        aggregate=CalculationOutput(),
        summary=summary_a,
    )
    result_b = NetworkResult(
        sections=[make_results(summary_b, section_id="b")],
        aggregate=CalculationOutput(),
        summary=summary_b,
    )
    system_result = NetworkSystemResult(
        bundles=[
            NetworkResultBundle(bundle_id="north-bundle", network=network_a, result=result_a),
            NetworkResultBundle(bundle_id="south-bundle", network=network_b, result=result_b),
        ],
        shared_node_pressures={"north::junction": 101325.0},
    )

    out_path = tmp_path / "system.yaml"
    results_io.write_system_output(out_path, system_result)

    with out_path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)

    assert len(data["networks"]) == 2
    ids = {entry["id"] for entry in data["networks"]}
    assert ids == {"north-bundle", "south-bundle"}
    assert data["shared_nodes"]["north::junction"] == pytest.approx(101325.0)
