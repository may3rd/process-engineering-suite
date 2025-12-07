from __future__ import annotations

from unittest.mock import patch

import pytest
from _pytest.logging import LogCaptureFixture

from network_hydraulic.calculators.fittings import FittingLossCalculator
from network_hydraulic.calculators.hydraulics import FrictionCalculator
from network_hydraulic.calculators.valves import ControlValveCalculator
from network_hydraulic.models.components import ControlValve, Orifice
from network_hydraulic.models.fluid import Fluid
from network_hydraulic.models.network import Network
from network_hydraulic.models.pipe_section import Fitting, PipeSection
from network_hydraulic.models.results import CalculationOutput
from network_hydraulic.solver.network_solver import NetworkSolver


def make_fluid() -> Fluid:
    return Fluid(
        name="water",
        phase="liquid",
        density=998.2,
        molecular_weight=18.0,
        z_factor=1.0,
        specific_heat_ratio=1.0,
        viscosity=9.5e-4,
        standard_flow_rate=None,
        vapor_pressure=2000.0,
        critical_pressure=2.2e7,
    )


def make_section() -> PipeSection:
    control_valve = ControlValve(
        tag="CV-1",
        cv=None,
        cg=None,
        pressure_drop=2000.0,
        C1=None,
        FL=0.9,
        Fd=0.95,
        xT=0.7,
        inlet_diameter=0.15,
        outlet_diameter=0.15,
        valve_diameter=0.15,
    )
    orifice = Orifice(
        tag="FE-1",
        d_over_D_ratio=0.4,
        pressure_drop=800.0,
        pipe_diameter=0.15,
    )
    return PipeSection(
        id="sec-1",
        schedule="40",
        roughness=4.6e-5,
        length=100.0,
        elevation_change=10.0,
        fitting_type="LR",
        fittings=[Fitting("elbow_90", 2)],
        fitting_K=None,
        pipe_length_K=None,
        user_K=None,
        piping_and_fitting_safety_factor=None,
        total_K=None,
        user_specified_fixed_loss=None,
        pipe_NPD=None,
        pipe_diameter=0.15,
        inlet_diameter=0.15,
        outlet_diameter=0.15,
        erosional_constant=None,
        mach_number=None,
        boundary_pressure=None,
        control_valve=control_valve,
        orifice=orifice,
        temperature=298.15,
        pressure=250000.0,
    )


def test_network_solver_runs_all_calculations():
    fluid = make_fluid()
    section = make_section()
    network = Network(
        name="test",
        description=None,
        fluid=fluid,
        sections=[section],
        mass_flow_rate=5.0,
        boundary_temperature=298.15,
        boundary_pressure=250000.0,
    )
    solver = NetworkSolver()
    result = solver.run(network)

    assert len(result.sections) == 1
    calc = section.calculation_output.pressure_drop
    assert calc.pipe_and_fittings == 0.0
    assert calc.control_valve_pressure_drop == pytest.approx(2000.0)
    assert calc.orifice_pressure_drop == 0.0
    assert calc.total_segment_loss is not None and calc.total_segment_loss > 0
    assert section.calculation_output.pressure_drop.normalized_friction_loss is None

    aggregate = result.aggregate.pressure_drop.total_segment_loss
    assert aggregate == pytest.approx(calc.total_segment_loss)
    assert section.result_summary.inlet.pressure is not None
    assert section.result_summary.outlet.pressure is not None


def make_gas_fluid() -> Fluid:
    return Fluid(
        name="nitrogen",
        phase="gas",
        density=1.2,
        molecular_weight=28.0,
        z_factor=0.95,
        specific_heat_ratio=1.32,
        viscosity=1.8e-5,
        standard_flow_rate=None,
        vapor_pressure=None,
        critical_pressure=None,
    )


def make_component_section(section_id: str) -> PipeSection:
    control_valve = ControlValve(
        tag=f"CV-{section_id}",
        cv=None,
        cg=None,
        pressure_drop=1500.0,
        C1=None,
        FL=0.9,
        Fd=0.95,
        xT=0.7,
        inlet_diameter=0.1,
        outlet_diameter=0.1,
        valve_diameter=0.1,
    )
    orifice = Orifice(
        tag=f"FE-{section_id}",
        d_over_D_ratio=0.6,
        pressure_drop=900.0,
        pipe_diameter=0.1,
    )
    section = PipeSection(
        id=section_id,
        schedule="40",
        roughness=1e-5,
        length=0.0,
        elevation_change=0.0,
        fitting_type="LR",
        fittings=[Fitting("elbow_90", 2)],
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
        orifice=orifice,
    )
    section.calculation_output = CalculationOutput() # Initialize calculation_output
    return section


def _capture_component_pressures():
    valve_pressures: list[float | None] = []
    orifice_pressures: list[float | None] = []

    def _fake_valve_calculate(self, section, *, inlet_pressure_override=None):
        valve_pressures.append(inlet_pressure_override)
        delta = section.control_valve.pressure_drop or 0.0
        pressure_drop = section.calculation_output.pressure_drop
        pressure_drop.control_valve_pressure_drop = delta
        pressure_drop.total_segment_loss = (pressure_drop.total_segment_loss or 0.0) + delta

    def _fake_orifice_calculate(self, section, *, inlet_pressure_override=None, mass_flow_override=None):
        orifice_pressures.append(inlet_pressure_override)
        delta = section.orifice.pressure_drop or 0.0
        pressure_drop = section.calculation_output.pressure_drop
        pressure_drop.orifice_pressure_drop = delta
        pressure_drop.total_segment_loss = (pressure_drop.total_segment_loss or 0.0) + delta

    return valve_pressures, orifice_pressures, _fake_valve_calculate, _fake_orifice_calculate


def test_solver_uses_section_pressures_for_components_forward():
    fluid = make_gas_fluid()
    sections = [make_component_section("1"), make_component_section("2")]
    sections[1].boundary_pressure = 220000.0

    network = Network(
        name="gas-forward",
        description=None,
        fluid=fluid,
        direction="forward",
        boundary_pressure=260000.0,
        gas_flow_model="isothermal",
        sections=sections,
        mass_flow_rate=2.5,
        boundary_temperature=320.0,
    )

    valve_pressures, orifice_pressures, fake_valve, fake_orifice = _capture_component_pressures()

    with patch("network_hydraulic.calculators.valves.ControlValveCalculator.calculate", new=fake_valve), patch(
        "network_hydraulic.calculators.orifices.OrificeCalculator.calculate", new=fake_orifice
    ):
        solver = NetworkSolver(default_pipe_diameter=0.1)
        solver.run(network)

    assert valve_pressures == [260000.0, 220000.0]
    assert orifice_pressures == []


def test_solver_uses_section_pressures_for_components_backward():
    fluid = make_gas_fluid()
    sections = [make_component_section("A"), make_component_section("B")]
    sections[0].boundary_pressure = 140000.0
    sections[1].boundary_pressure = 200000.0

    network = Network(
        name="gas-backward",
        description=None,
        fluid=fluid,
        direction="backward",
        boundary_pressure=250000.0,
        gas_flow_model="adiabatic",
        sections=sections,
        mass_flow_rate=2.5,
        boundary_temperature=320.0,
    )

    valve_pressures, orifice_pressures, fake_valve, fake_orifice = _capture_component_pressures()

    with patch("network_hydraulic.calculators.valves.ControlValveCalculator.calculate", new=fake_valve), patch(
        "network_hydraulic.calculators.orifices.OrificeCalculator.calculate", new=fake_orifice
    ):
        solver = NetworkSolver(default_pipe_diameter=0.1)
        solver.run(network)

    assert valve_pressures == [200000.0, 140000.0]
    assert orifice_pressures == []


def test_component_drops_match_total_loss_when_no_pipe_losses():
    fluid = make_fluid()
    control_valve = ControlValve(
        tag="CV-MATCH",
        cv=None,
        cg=None,
        pressure_drop=5000.0,
        C1=None,
        FL=0.9,
        Fd=0.95,
        xT=0.7,
        inlet_diameter=0.2,
        outlet_diameter=0.2,
        valve_diameter=0.2,
    )
    orifice = Orifice(
        tag="FE-MATCH",
        d_over_D_ratio=0.5,
        pressure_drop=1200.0,
        pipe_diameter=0.2,
    )
    section = PipeSection(
        id="component-loss",
        schedule="40",
        roughness=4.6e-5,
        length=0.0,
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
        pipe_diameter=0.2,
        inlet_diameter=0.2,
        outlet_diameter=0.2,
        erosional_constant=None,
        mach_number=None,
        boundary_pressure=None,
        control_valve=control_valve,
        orifice=orifice,
    )
    network = Network(
        name="component-only",
        description=None,
        fluid=fluid,
        direction="forward",
        boundary_pressure=250000.0,
        sections=[section],
        mass_flow_rate=5.0,
        boundary_temperature=298.15,
    )
    solver = NetworkSolver()
    solver.run(network)

    drop = section.calculation_output.pressure_drop
    assert drop.pipe_and_fittings == 0.0
    assert drop.control_valve_pressure_drop == pytest.approx(5000.0)
    assert drop.orifice_pressure_drop == 0.0
    assert drop.total_segment_loss == pytest.approx(5000.0)
    assert section.result_summary.inlet.pressure == pytest.approx(250000.0)
    assert section.result_summary.outlet.pressure == pytest.approx(250000.0 - 5000.0)


def test_orifice_used_when_no_control_valve():
    fluid = make_fluid()
    orifice = Orifice(
        tag="FE-ONLY",
        d_over_D_ratio=0.5,
        pressure_drop=900.0,
        pipe_diameter=0.2,
    )
    section = PipeSection(
        id="orifice-only",
        schedule="40",
        roughness=4.6e-5,
        length=0.0,
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
        pipe_diameter=0.2,
        inlet_diameter=0.2,
        outlet_diameter=0.2,
        control_valve=None,
        orifice=orifice,
    )
    network = Network(
        name="orifice-only",
        description=None,
        fluid=fluid,
        direction="forward",
        boundary_pressure=200000.0,
        sections=[section],
        mass_flow_rate=5.0,
        boundary_temperature=298.15,
    )
    solver = NetworkSolver()
    solver.run(network)

    drop = section.calculation_output.pressure_drop
    assert drop.control_valve_pressure_drop == 0.0 or drop.control_valve_pressure_drop is None
    assert drop.orifice_pressure_drop == pytest.approx(900.0)
    assert drop.total_segment_loss == pytest.approx(900.0)


def test_user_defined_loss_component_only():
    fluid = make_fluid()
    section = PipeSection(
        id="user-loss",
        schedule="40",
        roughness=4.6e-5,
        length=0.0,
        elevation_change=0.0,
        fitting_type="LR",
        fittings=[],
        fitting_K=None,
        pipe_length_K=None,
        user_K=None,
        piping_and_fitting_safety_factor=None,
        total_K=None,
        user_specified_fixed_loss=1500.0,
        pipe_NPD=None,
        pipe_diameter=0.2,
        inlet_diameter=0.2,
        outlet_diameter=0.2,
        control_valve=None,
        orifice=None,
    )
    network = Network(
        name="user-loss",
        description=None,
        fluid=fluid,
        direction="forward",
        boundary_pressure=180000.0,
        sections=[section],
        mass_flow_rate=5.0,
        boundary_temperature=298.15,
    )
    solver = NetworkSolver()
    solver.run(network)

    drop = section.calculation_output.pressure_drop
    assert drop.control_valve_pressure_drop in (0.0, None)
    assert drop.orifice_pressure_drop in (0.0, None)
    assert drop.user_specified_fixed_loss == pytest.approx(1500.0)
    assert drop.total_segment_loss == pytest.approx(1500.0)


def test_solver_errors_for_missing_gas_parameters():
    fluid = make_gas_fluid()
    section = make_component_section("missing")
    section.length = 1.0
    # Explicitly set friction_factor to avoid it being the first missing parameter
    section.calculation_output.pressure_drop.frictional_factor = 0.02
    network = Network(
        name="gas-missing",
        description=None,
        fluid=fluid,
        direction="forward",
        boundary_pressure=260000.0,
        gas_flow_model="isothermal",
        sections=[section],
        mass_flow_rate=2.5,
        boundary_temperature=320.0,
    )
    # Intentionally drop a required gas parameter to trigger validation
    fluid.molecular_weight = None

    solver = NetworkSolver(default_pipe_diameter=0.1)
    def mock_assign_design_flows(self, sections, network, base_mass_flow):
        for s in sections:
            s.mass_flow_rate = network.mass_flow_rate # Set mass_flow_rate
            s.temperature = None # Ensure temperature is None
            s.pressure = None # Ensure pressure is None
            s.calculation_output.pressure_drop.frictional_factor = 0.02
    with patch.object(NetworkSolver, "_assign_design_flows", new=mock_assign_design_flows), \
         patch.object(PipeSection, "current_volumetric_flow_rate", return_value=1.0), \
         patch.object(FittingLossCalculator, "calculate", return_value=None), \
         patch.object(FrictionCalculator, "calculate", return_value=None), \
         patch.object(ControlValveCalculator, "calculate", return_value=None):
        with pytest.raises(ValueError, match="missing required gas-flow inputs: molar_mass"):
            solver.run(network)


#     assert result.sections[0].summary.inlet.pressure is None
#     assert result.sections[0].summary.outlet.pressure is None
#     assert result.summary.inlet.pressure is None
#     assert result.summary.outlet.pressure is None
