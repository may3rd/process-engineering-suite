from __future__ import annotations

from pathlib import Path
from numpy import outer
import pytest

from network_hydraulic.io.loader import ConfigurationLoader
from network_hydraulic.solver.network_solver import NetworkSolver
from network_hydraulic.utils.units import convert

FIXTURE_DIR = Path(__file__).resolve().parent


def test_gas_network_adiabatic():
    """
    Test the gas flow network with existing excel spreadsheet data from yaml file.
    """
    config_path = FIXTURE_DIR / "gas_flow_adiabatic.yaml"
    assert config_path.exists(), f"Missing real network config at {config_path}"
    
    loader = ConfigurationLoader.from_yaml_path(config_path)
    network = loader.build_network()
    volumetric_flow = network.current_volumetric_flow_rate()
    solver = NetworkSolver()
    result = solver.run(network)
    assert len(result.sections) == 1
    
    # section "1"
    # Check the pipe dimension
    id = "1"
    section = next(
        section for section in network.sections if section.id == id)
    assert section.pipe_diameter == pytest.approx(
        77.92/1000.0, rel=1e-3)
    
    section = next(
        section for section in result.sections if section.section_id == id)
    assert section.calculation.pressure_drop.reynolds_number == pytest.approx(
        567373.107, 1e-3)
    assert section.calculation.pressure_drop.frictional_factor == pytest.approx(
        0.01808, rel=1e-3)
    assert section.calculation.pressure_drop.fitting_K == pytest.approx(
        0.00, rel=1e-3)
    assert section.calculation.pressure_drop.pipe_length_K == pytest.approx(
        23.2136514, rel=1e-3)
    assert section.calculation.pressure_drop.pipe_and_fittings == pytest.approx(
        122170.9, rel=1e-1)
    inlet = section.summary.inlet
    outlet = section.summary.outlet
    assert convert(inlet.pressure, "Pa", "kPag") == pytest.approx(700.0, rel=1e-5)
    assert convert(outlet.pressure, "Pa", "kPag") == pytest.approx(
        577.9, rel=1e-1)
    assert convert(outlet.pressure, "Pa", "kPag") == pytest.approx(
        convert(inlet.pressure, "Pa", "kPag") - section.calculation.pressure_drop.total_segment_loss / 1000.0, rel=1e-3)
    assert convert(inlet.temperature, "K", "degC") == pytest.approx(
        34.5, rel=1e-1)
    assert convert(outlet.temperature, "K", "degC") == pytest.approx(
        34.3, rel=1e-1)
    assert inlet.density == pytest.approx(8.86083251156075, rel=1e-1)
    assert outlet.density == pytest.approx(7.4621024570078545, rel=1e-1)
    assert section.calculation.pressure_drop.gas_flow_critical_pressure == pytest.approx(
        67916.38766871655, rel=1e-1)
    
    # Check the inlet conditions
    assert inlet.mach_number == pytest.approx(0.09237918081017864, rel=1e-2)
    assert inlet.flow_momentum == pytest.approx(9573.813021521317, rel=1e-2)

    # Check the outlet conditions
    assert outlet.mach_number == pytest.approx(0.10973348842163164, rel=1e-2)
    assert outlet.flow_momentum == pytest.approx(11368.371604309978, rel=1e-2)
    
    assert inlet.pressure - outlet.pressure == pytest.approx(
        section.calculation.pressure_drop.total_segment_loss, rel=1e-2)
    

def test_gas_network_isothermal():
    """
    Test the gas flow network with existing excel spreadsheet data from yaml file.
    """
    config_path = FIXTURE_DIR / "gas_flow_isothermal.yaml"
    assert config_path.exists(
    ), f"Missing real network config at {config_path}"

    loader = ConfigurationLoader.from_yaml_path(config_path)
    network = loader.build_network()
    volumetric_flow = network.current_volumetric_flow_rate()
    solver = NetworkSolver()
    result = solver.run(network)
    assert len(result.sections) == 1

    # section "1"
    # Check the pipe dimension
    id = "1"
    section = next(
        section for section in network.sections if section.id == id)
    assert section.pipe_diameter == pytest.approx(
        77.92/1000.0, rel=1e-3)

    section = next(
        section for section in result.sections if section.section_id == id)
    assert section.calculation.pressure_drop.reynolds_number == pytest.approx(
        567373.107, 1e-3)
    assert section.calculation.pressure_drop.frictional_factor == pytest.approx(
        0.01808, rel=1e-3)
    assert section.calculation.pressure_drop.fitting_K == pytest.approx(
        0.00, rel=1e-3)
    assert section.calculation.pressure_drop.pipe_length_K == pytest.approx(
        23.2136514, rel=1e-3)
    assert section.calculation.pressure_drop.pipe_and_fittings >= 122145.9708
    inlet = section.summary.inlet
    outlet = section.summary.outlet
    assert convert(outlet.pressure, "Pa", "kPag") == pytest.approx(
        convert(inlet.pressure, "Pa", "kPag") - section.calculation.pressure_drop.total_segment_loss / 1000.0, rel=1e-3)
    assert convert(inlet.temperature, "K",
                   "degC") == pytest.approx(35.0, rel=1e-6)
    assert convert(outlet.temperature, "K", "degC") == pytest.approx(
        35.0, rel=1e-6)
    assert inlet.density == pytest.approx(8.8457604, rel=1e-6)
    assert outlet.density == pytest.approx(7.496602001148042, rel=1e-6)
    # assert section.calculation.pressure_drop.gas_flow_critical_pressure == pytest.approx(
    #     67691.29013144, rel=1e-6)

    # Check the inlet conditions
    assert inlet.mach_number == pytest.approx(0.0924578488, rel=1e-6)
    assert inlet.flow_momentum == pytest.approx(9590.125644, rel=1e-6)

    assert inlet.velocity < outlet.velocity
    
    # Check the outlet conditions
    assert outlet.density < inlet.density
    assert outlet.mach_number > inlet.mach_number
    
