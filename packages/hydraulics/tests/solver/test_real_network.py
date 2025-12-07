"""
The real world pipe network problem.
"""

from __future__ import annotations

from pathlib import Path
import pytest

from network_hydraulic.io.loader import ConfigurationLoader
from network_hydraulic.solver.network_solver import NetworkSolver

FIXTURE_DIR = Path(__file__).resolve().parent

def test_real_network_from_yaml():
    """
    Test the real network from yaml file.
    """
    config_path = FIXTURE_DIR / "real_network.yaml"
    assert config_path.exists(), f"Missing real network config at {config_path}"

    loader = ConfigurationLoader.from_yaml_path(config_path)
    # Explicitly set gas_flow_model for the test to satisfy Network.__post_init__ validation
    # as it's null in the real_network.yaml fixture.
    loader.raw["network"]["gas_flow_model"] = "isothermal"
    network = loader.build_network()
    volumetric_flow = network.current_volumetric_flow_rate()
    solver = NetworkSolver()
    result = solver.run(network)
    assert len(result.sections) == 3
    # Section 1: id '1'
    section = next(
        section for section in result.sections if section.section_id == "1")
    assert section.calculation.pressure_drop.fitting_K == pytest.approx(
        3.0317550099746455, rel=1e-3)
    assert section.calculation.pressure_drop.pipe_length_K == pytest.approx(
        3.3560562811560506, rel=1e-3)
    assert section.calculation.pressure_drop.pipe_and_fittings == pytest.approx(
        117.63267, rel=1e-3)
    assert section.calculation.pressure_drop.total_segment_loss == pytest.approx(
        117.63267, rel=1e-3)

    # Section 2: id '2'
    section = next(
        section for section in result.sections if section.section_id == "2")
    assert section.calculation.pressure_drop.fitting_K == pytest.approx(
        6.520501052839313, rel=1e-3)
    assert section.calculation.pressure_drop.pipe_length_K == pytest.approx(
        0.771110141570444, rel=1e-3)
    assert section.calculation.pressure_drop.pipe_and_fittings == pytest.approx(
        134.359997, rel=1e-3)
    assert section.calculation.pressure_drop.total_segment_loss == pytest.approx(
        134.359997, rel=1e-3)

    assert result.sections, "Expected at least one section result"
    assert result.aggregate.pressure_drop.total_segment_loss is not None

