import pytest

from network_hydraulic.calculators.orifices import OrificeCalculator
from network_hydraulic.models.components import Orifice
from network_hydraulic.models.fluid import Fluid
from network_hydraulic.models.pipe_section import PipeSection


def make_section(orifice: Orifice, **overrides) -> PipeSection:
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
        control_valve=None,
        orifice=orifice,
        mass_flow_rate=7.70233803573,
        temperature=293.15,
        pressure=200_000.0,
    )
    base.update(overrides)
    return PipeSection(**base)


def reference_fluid() -> Fluid:
    return Fluid(
        name="water",
        phase="liquid",
        density=999.1,
        molecular_weight=18.0,
        z_factor=1.0,
        specific_heat_ratio=1.33,
        viscosity=0.0011,
        standard_flow_rate=None,
        vapor_pressure=None,
        critical_pressure=None,
    )


def test_orifice_drop_computed_from_fluids():
    fluid = reference_fluid()
    orifice = Orifice(
        tag="FE-1",
        d_over_D_ratio=0.05 / 0.07366,
        pressure_drop=None,
        pipe_diameter=0.07366,
        taps="D",
    )
    section = make_section(orifice, mass_flow_rate=7.70233803573, temperature=293.15, pressure=200_000.0)
    section.result_summary.inlet.pressure = 200_000.0
    calc = OrificeCalculator(fluid=fluid)
    calc.calculate(section)
    assert pytest.approx(orifice.pressure_drop, rel=1e-6) == 9069.42725043103
    drop = section.calculation_output.pressure_drop
    assert drop.orifice_pressure_drop == orifice.pressure_drop
    assert drop.total_segment_loss == orifice.pressure_drop
    assert orifice.calculation_note.startswith("Calculated pressure_drop")


def test_orifice_uses_specified_drop():
    fluid = reference_fluid()
    orifice = Orifice(tag="FE-2", d_over_D_ratio=None, pressure_drop=1500.0)
    section = make_section(orifice, mass_flow_rate=7.70233803573, temperature=293.15, pressure=200_000.0)
    calc = OrificeCalculator(fluid=fluid)
    calc.calculate(section)
    drop = section.calculation_output.pressure_drop
    assert drop.orifice_pressure_drop == 1500.0
    assert drop.total_segment_loss == 1500.0
    assert orifice.calculation_note.startswith("Used specified pressure_drop")


def test_missing_diameter_raises():
    fluid = reference_fluid()
    orifice = Orifice(tag="FE-3", d_over_D_ratio=None, pressure_drop=None)
    section = make_section(orifice, pipe_diameter=None, mass_flow_rate=7.70233803573, temperature=293.15, pressure=200_000.0)
    calc = OrificeCalculator(fluid=fluid)
    with pytest.raises(ValueError):
        calc.calculate(section)


def test_orifice_defaults_to_section_pipe_diameter():
    fluid = reference_fluid()
    orifice = Orifice(tag="FE-4", d_over_D_ratio=0.5, pressure_drop=None)
    section = make_section(orifice, pipe_diameter=0.2, mass_flow_rate=7.70233803573, temperature=293.15, pressure=200_000.0)
    section.result_summary.inlet.pressure = 200000.0
    calc = OrificeCalculator(fluid=fluid)
    calc.calculate(section)
    assert section.orifice.pressure_drop is not None
