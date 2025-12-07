import pytest
from fluids.control_valve import convert_flow_coefficient, size_control_valve_g, size_control_valve_l

from network_hydraulic.calculators.valves import ControlValveCalculator
from network_hydraulic.calculators.orifices import OrificeCalculator
from network_hydraulic.models.components import ControlValve
from network_hydraulic.models.fluid import Fluid
from network_hydraulic.models.pipe_section import PipeSection
from network_hydraulic.solver.network_solver import NetworkSolver


def make_section(control_valve: ControlValve, **overrides) -> PipeSection:
    base = dict(
        id="sec",
        schedule="40",
        roughness=1e-4,
        length=10.0,
        elevation_change=0.0,
        fitting_type="SCRD",
        fittings=[],
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
        orifice=None,
        mass_flow_rate=1.0,
        temperature=300.0,
        pressure=680e3,
    )
    base.update(overrides)
    return PipeSection(**base)


def liquid_fluid() -> Fluid:
    return Fluid(
        name="water",
        phase="liquid",
        density=965.4,
        molecular_weight=18.0,
        z_factor=1.0,
        specific_heat_ratio=1.0,
        viscosity=3.1472e-4,
        standard_flow_rate=None,
        vapor_pressure=70.1e3,
        critical_pressure=22120e3,
    )


def gas_fluid() -> Fluid:
    return Fluid(
        name="gas",
        phase="gas",
        density=45.0,
        molecular_weight=20.0,
        z_factor=0.92,
        specific_heat_ratio=1.3,
        viscosity=1.4e-5,
        standard_flow_rate=None,
        vapor_pressure=None,
        critical_pressure=None,
    )


def test_liquid_cv_from_pressure_drop():
    fluid = liquid_fluid()
    drop = 460e3
    valve = ControlValve(
        tag="CV-1",
        cv=None,
        cg=None,
        pressure_drop=drop,
        C1=None,
        FL=0.9,
        Fd=0.46,
        inlet_diameter=0.15,
        outlet_diameter=0.15,
        valve_diameter=0.15,
    )
    section = make_section(valve, mass_flow_rate=1.0, temperature=300.0, pressure=680e3)
    calc = ControlValveCalculator(fluid=fluid)
    calc.calculate(section)
    kv_expected = size_control_valve_l(
        rho=fluid.current_density(section.temperature, section.pressure),
        Psat=fluid.vapor_pressure,
        Pc=fluid.critical_pressure,
        mu=fluid.viscosity,
        P1=section.pressure,
        P2=section.pressure - drop,
        Q=section.current_volumetric_flow_rate(fluid),
        D1=valve.inlet_diameter,
        D2=valve.outlet_diameter,
        d=valve.valve_diameter,
        FL=valve.FL,
        Fd=valve.Fd,
    )
    cv_expected = convert_flow_coefficient(kv_expected, "Kv", "Cv")
    assert pytest.approx(valve.cv, rel=1e-4) == cv_expected
    assert valve.cg is None
    assert section.calculation_output.pressure_drop.control_valve_pressure_drop == drop


def test_liquid_drop_sets_cg_when_c1_present():
    fluid = liquid_fluid()
    drop = 100e3
    valve = ControlValve(
        tag="CV-1",
        cv=None,
        cg=None,
        pressure_drop=drop,
        C1=15.0,
        FL=0.9,
        Fd=0.95,
        inlet_diameter=0.15,
        outlet_diameter=0.15,
        valve_diameter=0.15,
    )
    section = make_section(valve, mass_flow_rate=1.0, temperature=300.0, pressure=680e3)
    ControlValveCalculator(fluid=fluid).calculate(section)
    assert valve.cv is not None
    assert valve.cg == pytest.approx(15.0 * valve.cv)


def test_pressure_drop_from_cg_only():
    fluid = liquid_fluid()
    drop = 460e3
    base_valve = ControlValve(
        tag="base",
        cv=None,
        cg=None,
        pressure_drop=drop,
        C1=12.0,
        FL=0.9,
        Fd=0.46,
        inlet_diameter=0.15,
        outlet_diameter=0.15,
        valve_diameter=0.15,
    )
    base_section = make_section(base_valve, mass_flow_rate=1.0, temperature=300.0, pressure=680e3)
    calc = ControlValveCalculator(fluid=fluid)
    calc.calculate(base_section)
    expected_cv = base_valve.cv
    expected_cg = 12.0 * expected_cv

    valve = ControlValve(
        tag="CV-cg",
        cv=None,
        cg=expected_cg,
        pressure_drop=None,
        C1=12.0,
        FL=0.9,
        Fd=0.46,
        inlet_diameter=0.15,
        outlet_diameter=0.15,
        valve_diameter=0.15,
    )
    section = make_section(valve, mass_flow_rate=1.0, temperature=300.0, pressure=680e3)
    calc.calculate(section)
    assert pytest.approx(valve.pressure_drop, rel=1e-4) == drop


def test_liquid_pressure_drop_from_cv():
    fluid = liquid_fluid()
    section = make_section(
        ControlValve(tag="temp", cv=None, cg=None, pressure_drop=None, C1=None),
        mass_flow_rate=1.0,
        temperature=300.0,
        pressure=680e3,
    )
    # Calculate volumetric flow rate for sizing
    density = fluid.current_density(section.temperature, section.pressure)
    volumetric_flow_rate = section.mass_flow_rate / density
    kv = size_control_valve_l(
        rho=density,
        Psat=fluid.vapor_pressure,
        Pc=fluid.critical_pressure,
        mu=fluid.viscosity,
        P1=section.pressure,
        P2=section.pressure - 460e3,
        Q=volumetric_flow_rate,
    )
    cv = convert_flow_coefficient(kv, "Kv", "Cv")
    valve = ControlValve(tag="CV-2", cv=cv, cg=None, pressure_drop=None, C1=None)
    section.control_valve = valve
    calc = ControlValveCalculator(fluid=fluid)
    calc.calculate(section)
    assert pytest.approx(valve.pressure_drop, rel=1e-4) == 460e3
def test_control_valve_adjustable_overrides_fixed_drop():
    fluid = liquid_fluid()
    section = make_section(
        ControlValve(tag="placeholder", cv=None, cg=None, pressure_drop=None, C1=None),
        mass_flow_rate=1.0,
        temperature=300.0,
        pressure=680e3,
    )
    density = fluid.current_density(section.temperature, section.pressure)
    volumetric_flow_rate = section.mass_flow_rate / density
    kv = size_control_valve_l(
        rho=density,
        Psat=fluid.vapor_pressure,
        Pc=fluid.critical_pressure,
        mu=fluid.viscosity,
        P1=section.pressure,
        P2=section.pressure - 460e3,
        Q=volumetric_flow_rate,
    )
    cv = convert_flow_coefficient(kv, "Kv", "Cv")
    valve = ControlValve(
        tag="CV-adjust",
        cv=cv,
        cg=None,
        pressure_drop=100e3,
        C1=None,
        adjustable=True,
    )
    section.control_valve = valve
    solver = NetworkSolver()
    control_calc = ControlValveCalculator(fluid=fluid)
    orifice_calc = OrificeCalculator(
        fluid=fluid,
        default_pipe_diameter=section.pipe_diameter,
        mass_flow_rate=section.mass_flow_rate,
    )
    solver._apply_pressure_dependent_losses(
        section,
        inlet_pressure=section.pressure,
        control_valve_calculator=control_calc,
        orifice_calculator=orifice_calc,
    )
def test_gas_valve_drop_from_cv():
    fluid = gas_fluid()
    section = make_section(
        ControlValve(tag="temp", cv=None, cg=None, pressure_drop=None, C1=None),
        mass_flow_rate=1.0,
        temperature=310.0,
        pressure=600e3,
    )
    # Calculate volumetric flow rate for sizing
    density = fluid.current_density(section.temperature, section.pressure)
    volumetric_flow_rate = section.mass_flow_rate / density

    kv = size_control_valve_g(
        T=section.temperature,
        MW=fluid.molecular_weight,
        mu=fluid.viscosity,
        gamma=fluid.specific_heat_ratio,
        Z=fluid.z_factor,
        P1=section.pressure,
        P2=section.pressure - 120e3,
        Q=volumetric_flow_rate,
    )
    cv = convert_flow_coefficient(kv, "Kv", "Cv")
    valve = ControlValve(tag="CV-3", cv=cv, cg=None, pressure_drop=None, C1=None)
    section.control_valve = valve
    calc = ControlValveCalculator(fluid=fluid)
    calc.calculate(section)
    assert pytest.approx(valve.pressure_drop, rel=1e-4) == 120e3
    assert valve.calculation_note.startswith("Calculated pressure_drop from Cv")


def test_control_valve_note_when_insufficient_data():
    fluid = liquid_fluid()
    valve = ControlValve(tag="CV-missing", cv=None, cg=None, pressure_drop=None, C1=None)
    section = make_section(valve, mass_flow_rate=1.0, temperature=300.0, pressure=680e3)
    calc = ControlValveCalculator(fluid=fluid)
    calc.calculate(section)
    assert valve.calculation_note.startswith("Skipped control valve calculation")
