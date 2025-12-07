from __future__ import annotations

from network_hydraulic.models.components import ControlValve
from network_hydraulic.models.fluid import Fluid
from network_hydraulic.models.network import Network
from network_hydraulic.models.pipe_section import PipeSection
from network_hydraulic.optimizer import optimize_control_valves


def _branch_network(nested: bool = False, one_valve: bool = False) -> Network:
    fluid = Fluid(
        name="water",
        phase="liquid",
        density=998.2,
        molecular_weight=18.0,
        z_factor=1.0,
        specific_heat_ratio=1.0,
        viscosity=1e-3,
        standard_flow_rate=None,
        vapor_pressure=2000.0,
        critical_pressure=2.2e7,
    )

    def make_section(section_id: str, start: str, end: str, has_valve: bool = False) -> PipeSection:
        control_valve = ControlValve(
            tag=f"CV-{section_id}",
            cv=0.5,
            cg=None,
            pressure_drop=10e3,
            C1=None,
            adjustable=has_valve,
        ) if has_valve else None
        return PipeSection(
            id=section_id,
            schedule="40",
            roughness=1e-4,
            length=10.0,
            elevation_change=0.0,
            fitting_type="LR",
            fittings=[],
            fitting_K=None,
            pipe_length_K=None,
            user_K=None,
            piping_and_fitting_safety_factor=None,
            total_K=None,
            user_specified_fixed_loss=None,
            pipe_NPD=None,
            pipe_diameter=0.1,
            inlet_diameter=0.1,
            outlet_diameter=0.1,
            erosional_constant=None,
            mach_number=None,
            boundary_pressure=None,
            control_valve=control_valve,
            orifice=None,
            flow_splitting_factor=1.0,
            from_pipe_id=start,
            to_pipe_id=end,
        )

    sections = [
        make_section("inlet", "node-start", "node-split"),
        make_section("branch-a", "node-split", "node-a", has_valve=True),
        make_section("branch-b", "node-split", "node-b", has_valve=True),
        make_section("return-a", "node-a", "node-merge"),
        make_section("return-b", "node-b", "node-merge"),
        make_section("outlet", "node-merge", "node-end"),
    ]
    
    sections_with_one_valve = [
        make_section("inlet", "node-start", "node-split"),
        make_section("branch-a-1", "node-split", "node-a-1"),
        make_section("branch-a-cv", "node-a-1", "node-a-2", has_valve=True),
        make_section("branch-a-2", "node-a-2", "node-merge"),
        make_section("branch-b", "node-split", "node-b"),
        make_section("return-b", "node-b", "node-merge"),
        make_section("outlet", "node-merge", "node-end"),
    ]
    
    nested_sections = [
        make_section("inlet", "node-start", "node-split"),
        make_section("branch-a-1", "node-split", "node-a-1"),
        make_section("branch-a-cv-1", "node-a-1", "node-a-1-1", has_valve=True),
        make_section("branch-a-cv-2", "node-a-1", "node-a-1-2", has_valve=True),
        make_section("branch-a-cv-3", "node-a-1-1", "node-a-2"),
        make_section("branch-a-cv-4", "node-a-1-2", "node-a-2"),
        make_section("branch-a-2", "node-a-2", "node-merge"),
        make_section("branch-b", "node-split", "node-b"),
        make_section("return-b", "node-b", "node-merge"),
        make_section("outlet", "node-merge", "node-end"),
    ]
    
    if one_valve:
        sections = sections_with_one_valve
        
    if nested:
        sections = nested_sections
    
    return Network(
        name="branch-valves",
        description="Two-branch network",
        fluid=fluid,
        boundary_temperature=300.0,
        boundary_pressure=200000.0,
        downstream_pressure=150000.0,
        direction="forward",
        mass_flow_rate=1.0,
        sections=sections,
    )


def test_optimize_two_branch_two_valves():
    network = _branch_network()
    baseline_diff = abs(network.boundary_pressure - network.downstream_pressure)
    error = optimize_control_valves(network)
    assert error is not None
    assert error <= baseline_diff
    for section in network.sections:
        valve = section.control_valve
        if valve and valve.adjustable:
            assert valve.pressure_drop is not None and valve.pressure_drop > 0

def test_optimize_two_branch_one_valve():
    network = _branch_network(one_valve=True)
    baseline_diff = abs(network.boundary_pressure - network.downstream_pressure)
    error = optimize_control_valves(network)
    assert error is not None
    assert error <= baseline_diff
    for section in network.sections:
        valve = section.control_valve
        if valve and valve.adjustable:
            assert valve.pressure_drop is not None and valve.pressure_drop > 0
    
def test_optimize_nested_two_branch_two_valves():
    network = _branch_network(nested=True)
    baseline_diff = abs(network.boundary_pressure - network.downstream_pressure)
    error = optimize_control_valves(network)
    assert error is not None
    assert error <= baseline_diff
    for section in network.sections:
        valve = section.control_valve
        if valve and valve.adjustable:
            assert valve.pressure_drop is not None and valve.pressure_drop > 0
    