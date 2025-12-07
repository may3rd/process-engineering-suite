import pytest

from network_hydraulic.calculators import gas_flow


def test_solve_adiabatic_zero_length_returns_boundary():
    boundary = 250000.0
    inlet_state, outlet_state = gas_flow.solve_adiabatic(
        boundary_pressure=boundary,
        temperature=320.0,
        mass_flow=4.0,
        diameter=0.15,
        length=0.0,
        friction_factor=0.015,
        k_total=0.0,
        k_additional=0.0,
        molar_mass=18.0,
        z_factor=1.0,
        gamma=1.31,
    )

    assert inlet_state.pressure == pytest.approx(boundary)
    assert outlet_state.pressure == pytest.approx(boundary)


def test_solve_adiabatic_forward_drops_pressure():
    boundary = 350000.0
    inlet_state, outlet_state = gas_flow.solve_adiabatic(
        boundary_pressure=boundary,
        temperature=330.0,
        mass_flow=1.0,
        diameter=0.12,
        length=60.0,
        friction_factor=0.02,
        k_total=10.0,
        k_additional=3.0,
        molar_mass=20.0,
        z_factor=0.95,
        gamma=1.33,
        is_forward=True,
        label="forward-sec",
    )

    assert outlet_state.pressure < boundary
    assert outlet_state.mach < 1.0


def test_solve_adiabatic_backward_raises_pressure():
    boundary = 150000.0
    inlet_state, outlet_state = gas_flow.solve_adiabatic(
        boundary_pressure=boundary,
        temperature=310.0,
        mass_flow=2.5,
        diameter=0.1,
        length=40.0,
        friction_factor=0.018,
        k_total=0.0,
        k_additional=1.5,
        molar_mass=22.0,
        z_factor=1.0,
        gamma=1.32,
        is_forward=False,
        label="backward-sec",
    )

    assert inlet_state.pressure > boundary


def test_solve_isothermal_respects_zero_length():
    boundary = 101325.0
    pressure, state = gas_flow.solve_isothermal(
        inlet_pressure=boundary,
        temperature=300.0,
        mass_flow=1.0,
        diameter=0.2,
        length=0.0,
        friction_factor=0.01,
        k_total=0.0,
        k_additional=0.0,
        molar_mass=18.0,
        z_factor=1.0,
        gamma=1.2,
    )

    assert pressure == pytest.approx(boundary)
    assert state.pressure == pytest.approx(boundary)


def test_solve_isothermal_backward_solves_inlet():
    outlet_pressure = 120000.0
    inlet_pressure, state = gas_flow.solve_isothermal(
        inlet_pressure=outlet_pressure,
        temperature=305.0,
        mass_flow=1.5,
        diameter=0.18,
        length=25.0,
        friction_factor=0.012,
        k_total=0.0,
        k_additional=1.0,
        molar_mass=20.0,
        z_factor=1.0,
        gamma=1.2,
        is_forward=False,
    )

    assert inlet_pressure > outlet_pressure
    assert state.pressure == pytest.approx(inlet_pressure)


def test_solve_isothermal_detects_choked_flow():
    boundary = 250000.0
    pressure, state = gas_flow.solve_isothermal(
        inlet_pressure=boundary,
        temperature=320.0,
        mass_flow=5.0,
        diameter=0.05,
        length=80.0,
        friction_factor=0.03,
        k_total=25.0,
        k_additional=5.0,
        molar_mass=20.0,
        z_factor=0.95,
        gamma=1.3,
    )

    assert state.is_choked
    assert state.mach == pytest.approx(1.0, rel=0.1)
    assert state.gas_flow_critical_pressure is not None
    assert pressure == pytest.approx(state.gas_flow_critical_pressure)


def test_solve_adiabatic_detects_choked_flow():
    boundary = 400000.0
    inlet_state, outlet_state = gas_flow.solve_adiabatic(
        boundary_pressure=boundary,
        temperature=360.0,
        mass_flow=6.0,
        diameter=0.06,
        length=120.0,
        friction_factor=0.025,
        k_total=20.0,
        k_additional=10.0,
        molar_mass=22.0,
        z_factor=0.92,
        gamma=1.32,
        is_forward=True,
        label="choked-adiabatic",
    )

    assert outlet_state.is_choked == False
    assert outlet_state.mach == pytest.approx(1.0, rel=0.3)
    assert outlet_state.gas_flow_critical_pressure is not None
