import math

import pytest

from network_hydraulic.calculators.hydraulics import FrictionCalculator
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


def make_section(**overrides) -> PipeSection:
    base = dict(
        id="sec",
        schedule="40",
        roughness=4.6e-5,
        length=50.0,
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
        control_valve=None,
        orifice=None,
        mass_flow_rate=1.0,
        temperature=298.15,
        pressure=101325.0,
    )
    base.update(overrides)
    return PipeSection(**base)


def test_custom_flow_rate_used():
    fluid = make_fluid()
    section = make_section(mass_flow_rate=1.0, temperature=298.15, pressure=101325.0)
    calc = FrictionCalculator(fluid=fluid)
    calc.calculate(section)
    base_drop = section.calculation_output.pressure_drop.pipe_and_fittings
    assert base_drop > 0.0


def test_missing_diameter_raises():
    fluid = make_fluid()
    section = make_section(pipe_diameter=None, mass_flow_rate=1.0, temperature=298.15, pressure=101325.0)
    calc = FrictionCalculator(fluid=fluid)
    with pytest.raises(ValueError):
        calc.calculate(section)


def test_friction_raises_for_non_positive_reynolds_number():
    fluid = make_fluid()
    section = make_section(mass_flow_rate=0.0, temperature=298.15, pressure=101325.0)
    calc = FrictionCalculator(fluid=fluid)
    with pytest.raises(ValueError, match="Unable to compute Reynolds number for friction calculation"):
        calc.calculate(section)


def test_friction_handles_zero_length():
    fluid = make_fluid()
    section = make_section(length=0.0, mass_flow_rate=1.0, temperature=298.15, pressure=101325.0)
    calc = FrictionCalculator(fluid=fluid)
    calc.calculate(section)
    assert section.pipe_length_K == 0.0
    assert section.calculation_output.pressure_drop.pipe_and_fittings == 0.0


def test_friction_handles_zero_roughness():
    fluid = make_fluid()
    section = make_section(roughness=0.0, mass_flow_rate=1.0, temperature=298.15, pressure=101325.0)
    calc = FrictionCalculator(fluid=fluid)
    calc.calculate(section)
    assert section.calculation_output.pressure_drop.pipe_and_fittings > 0.0 # Should still calculate friction


def test_friction_raises_for_non_positive_viscosity():
    with pytest.raises(ValueError, match="fluid.viscosity must be positive"):
        make_fluid(viscosity=0.0)


def test_friction_raises_for_unknown_friction_factor_type():
    fluid = make_fluid()
    section = make_section(mass_flow_rate=1.0, temperature=298.15, pressure=101325.0)
    calc = FrictionCalculator(fluid=fluid, friction_factor_type="unknown")
    with pytest.raises(ValueError, match="Unknown friction_factor_type 'unknown'. Expected 'darcy' or 'fanning'."):
        calc.calculate(section)
