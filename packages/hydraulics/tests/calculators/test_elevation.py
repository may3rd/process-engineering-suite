from network_hydraulic.calculators.elevation import ElevationCalculator
from network_hydraulic.models.fluid import Fluid
from network_hydraulic.models.pipe_section import PipeSection


def make_fluid(**overrides) -> Fluid:
    base = dict(
        name="water",
        phase="liquid",
        density=998.2,
        molecular_weight=18.0,
        z_factor=1.0,
        specific_heat_ratio=1.0,
        viscosity=1.0e-3,
        standard_flow_rate=None,
        vapor_pressure=None,
        critical_pressure=None,
    )
    base.update(overrides)
    return Fluid(**base)


def make_section(**overrides):
    base = dict(
        id="sec",
        schedule="40",
        roughness=1e-4,
        length=100.0,
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
        control_valve=None,
        orifice=None,
        temperature=298.0,
        pressure=101325.0,
    )
    base.update(overrides)
    return PipeSection(**base)


def test_elevation_drop_uphill():
    fluid = make_fluid(density=1000.0)
    section = make_section(elevation_change=10.0, temperature=298.0, pressure=101325.0)
    calculator = ElevationCalculator(fluid=fluid)
    calculator.calculate(section)
    assert section.calculation_output.pressure_drop.elevation_change == 98066.5
    assert section.calculation_output.pressure_drop.total_segment_loss == 98066.5


def test_elevation_gain_downhill():
    fluid = make_fluid(density=850.0)
    section = make_section(elevation_change=-5.0, temperature=298.0, pressure=101325.0)
    calculator = ElevationCalculator(fluid=fluid)
    calculator.calculate(section)
    expected = -850.0 * 9.80665 * 5.0
    assert section.calculation_output.pressure_drop.elevation_change == expected
    assert section.calculation_output.pressure_drop.total_segment_loss == expected


def test_elevation_ignored_for_gas():
    fluid = make_fluid(density=600.0, phase="gas")
    section = make_section(elevation_change=50.0, temperature=298.0, pressure=101325.0)
    calculator = ElevationCalculator(fluid=fluid)
    calculator.calculate(section)
    assert section.calculation_output.pressure_drop.elevation_change == 0.0
    assert section.calculation_output.pressure_drop.total_segment_loss is None
