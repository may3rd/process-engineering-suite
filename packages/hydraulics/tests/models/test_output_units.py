import pytest

from network_hydraulic.models.output_units import OutputUnits


def test_output_units_post_init_valid_inputs():
    units = OutputUnits(
        pressure="kPa",
        pressure_drop="psi",
        temperature="degC",
        density="g/cm^3",
        velocity="ft/s",
        volumetric_flow_rate="m^3/h",
        mass_flow_rate="kg/s", # Changed from lb/min
        flow_momentum="bar",
    )
    assert units.pressure == "kPa"
    assert units.pressure_drop == "psi"
    assert units.temperature == "degC"
    assert units.density == "g/cm^3"
    assert units.velocity == "ft/s"
    assert units.volumetric_flow_rate == "m^3/h"
    assert units.mass_flow_rate == "kg/s"
    assert units.flow_momentum == "bar"


def test_output_units_post_init_normalizes_values():
    units = OutputUnits(
        pressure=" kPa ",
        pressure_drop=" psi", # Changed from PSI
        temperature="degC ", # Changed from DEGC
    )
    assert units.pressure == "kPa"
    assert units.pressure_drop == "psi"
    assert units.temperature == "degC"


def test_output_units_post_init_uses_pressure_for_pressure_drop_if_none():
    units = OutputUnits(pressure="bar", pressure_drop=None)
    assert units.pressure_drop == "kPa"


def test_output_units_post_init_uses_pressure_drop_for_flow_momentum_if_none():
    units = OutputUnits(pressure_drop="kPa", flow_momentum=None)
    assert units.flow_momentum == "kPa"
