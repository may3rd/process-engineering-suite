import math

import pytest

from network_hydraulic.calculators.fittings import INCHES_PER_METER, FittingLossCalculator
from network_hydraulic.models.fluid import Fluid
from network_hydraulic.models.pipe_section import Fitting, PipeSection


def make_fluid(temperature: float = 298.0, pressure: float = 101325.0, **overrides) -> Fluid:
    base = dict(
        name="water",
        phase="liquid",
        density=998.2,
        molecular_weight=18.0,
        z_factor=1.0,
        specific_heat_ratio=1.0,
        viscosity=8.9e-4,
        standard_flow_rate=None,
        vapor_pressure=None,
        critical_pressure=None,
    )
    base.update(overrides)
    return Fluid(**base)


def make_section(
    fittings,
    fitting_type="LR",
    mass_flow_rate: float = 1.0,
    temperature: float = 298.0,
    pressure: float = 101325.0,
    **overrides,
) -> PipeSection:
    base = dict(
        id="sec",
        schedule="40",
        roughness=4.6e-5,
        length=10.0,
        elevation_change=0.0,
        fitting_type=fitting_type,
        fittings=fittings,
        fitting_K=None,
        pipe_length_K=None,
        user_K=None,
        piping_and_fitting_safety_factor=None,
        total_K=None,
        user_specified_fixed_loss=None,
        pipe_NPD=None,
        pipe_diameter=0.15,
        inlet_diameter=0.18,
        outlet_diameter=0.2,
        erosional_constant=None,
        mach_number=None,
        boundary_pressure=None,
        control_valve=None,
        orifice=None,
        mass_flow_rate=mass_flow_rate,
        temperature=temperature,
        pressure=pressure,
    )
    base.update(overrides)
    return PipeSection(**base)


def reynolds(fluid: Fluid, diameter: float, mass_flow_rate: float, temperature: float, pressure: float) -> float:
    density = fluid.current_density(temperature, pressure)
    volumetric_flow_rate = mass_flow_rate / density
    area = 0.25 * math.pi * diameter * diameter
    velocity = volumetric_flow_rate / area
    return density * velocity * diameter / fluid.viscosity


def two_k(k1: float, kinf: float, re: float, diameter: float) -> float:
    d_in = diameter * INCHES_PER_METER
    return k1 / re + kinf * (1.0 + 1.0 / d_in)


def test_standard_fitting_k_sum():
    fluid = make_fluid()
    fittings = [Fitting("elbow_90", 2), Fitting("tee_through", 1)]
    mass_flow_rate = 1.0
    temperature = 298.0
    pressure = 101325.0
    section = make_section(fittings, mass_flow_rate=mass_flow_rate, temperature=temperature, pressure=pressure)
    calculator = FittingLossCalculator(fluid=fluid)
    calculator.calculate(section)

    re = reynolds(fluid, section.pipe_diameter, mass_flow_rate, temperature, pressure)
    expected = 2 * two_k(800.0, 0.2, re, section.pipe_diameter)
    expected += two_k(150.0, 0.05, re, section.pipe_diameter)
    assert section.fitting_K == pytest.approx(expected, rel=1e-6)


def test_swage_contributions_positive():
    fluid = make_fluid()
    fittings = [Fitting("inlet_swage", 1), Fitting("outlet_swage", 1)]
    mass_flow_rate = 0.5 # Example mass flow rate
    temperature = 298.0
    pressure = 101325.0
    section = make_section(fittings, mass_flow_rate=mass_flow_rate, temperature=temperature, pressure=pressure)
    calculator = FittingLossCalculator(fluid=fluid)
    calculator.calculate(section)
    assert section.fitting_K > 0.0


def test_missing_pipe_diameter_raises():
    fluid = make_fluid()
    fittings = [Fitting("elbow_90", 1)]
    mass_flow_rate = 1.0
    temperature = 298.0
    pressure = 101325.0
    section = make_section(fittings, pipe_diameter=None, mass_flow_rate=mass_flow_rate, temperature=temperature, pressure=pressure)
    calculator = FittingLossCalculator(fluid=fluid)
    with pytest.raises(ValueError):
        calculator.calculate(section)


def test_fitting_breakdown_captures_each_component():
    fluid = make_fluid()
    fittings = [Fitting("elbow_90", 2), Fitting("tee_elbow", 1)]
    mass_flow_rate = 1.0
    temperature = 298.0
    pressure = 101325.0
    section = make_section(fittings, mass_flow_rate=mass_flow_rate, temperature=temperature, pressure=pressure)
    calculator = FittingLossCalculator(fluid=fluid)
    calculator.calculate(section)

    breakdown = section.calculation_output.pressure_drop.fitting_breakdown
    assert len(breakdown) == 2
    elbow = next(item for item in breakdown if item.type == "elbow_90")
    tee = next(item for item in breakdown if item.type == "tee_elbow")
    assert elbow.count == 2
    assert elbow.k_each == pytest.approx(elbow.k_total / elbow.count, rel=1e-6)
    assert tee.k_each == pytest.approx(tee.k_total / max(tee.count, 1), rel=1e-6)
    assert section.fitting_K == pytest.approx(elbow.k_total + tee.k_total, rel=1e-6)
