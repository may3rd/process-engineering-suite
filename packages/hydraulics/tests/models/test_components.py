import pytest

from network_hydraulic.models.components import ControlValve, Orifice


def make_control_valve(**overrides) -> ControlValve:
    defaults = dict(
        tag="CV-1",
        cv=10.0,
        cg=100.0,
        pressure_drop=1000.0,
        C1=1.0,
        FL=0.9,
        Fd=0.95,
        xT=0.7,
        inlet_diameter=0.1,
        outlet_diameter=0.1,
        valve_diameter=0.1,
        calculation_note=None,
    )
    defaults.update(overrides)
    return ControlValve(**defaults)


def make_orifice(**overrides) -> Orifice:
    defaults = dict(
        tag="OR-1",
        d_over_D_ratio=0.5,
        pressure_drop=500.0,
        pipe_diameter=0.1,
        orifice_diameter=0.05,
        meter_type="concentric",
        taps="flange",
        tap_position="upstream",
        discharge_coefficient=0.6,
        expansibility=0.9,
        calculation_note=None,
    )
    defaults.update(overrides)
    return Orifice(**defaults)


def test_control_valve_post_init_valid_inputs():
    valve = make_control_valve()
    assert valve.cv == 10.0
    assert valve.pressure_drop == 1000.0


@pytest.mark.parametrize(
    "field, value, match_msg",
    [
        ("cv", 0.0, "ControlValve cv must be positive if provided"),
        ("cv", -1.0, "ControlValve cv must be positive if provided"),
        ("cg", 0.0, "ControlValve cg must be positive if provided"),
        ("cg", -1.0, "ControlValve cg must be positive if provided"),
        ("pressure_drop", 0.0, "ControlValve pressure_drop must be positive if provided"),
        ("pressure_drop", -1.0, "ControlValve pressure_drop must be positive if provided"),
        ("C1", 0.0, "ControlValve C1 must be positive if provided"),
        ("C1", -1.0, "ControlValve C1 must be positive if provided"),
        ("FL", 0.0, "ControlValve FL must be positive if provided"),
        ("FL", -1.0, "ControlValve FL must be positive if provided"),
        ("Fd", 0.0, "ControlValve Fd must be positive if provided"),
        ("Fd", -1.0, "ControlValve Fd must be positive if provided"),
        ("xT", 0.0, "ControlValve xT must be positive if provided"),
        ("xT", -1.0, "ControlValve xT must be positive if provided"),
        ("inlet_diameter", 0.0, "ControlValve inlet_diameter must be positive if provided"),
        ("inlet_diameter", -0.1, "ControlValve inlet_diameter must be positive if provided"),
        ("outlet_diameter", 0.0, "ControlValve outlet_diameter must be positive if provided"),
        ("outlet_diameter", -0.1, "ControlValve outlet_diameter must be positive if provided"),
        ("valve_diameter", 0.0, "ControlValve valve_diameter must be positive if provided"),
        ("valve_diameter", -0.1, "ControlValve valve_diameter must be positive if provided"),
    ],
)
def test_control_valve_post_init_raises_for_non_positive_values(field, value, match_msg):
    with pytest.raises(ValueError, match=match_msg):
        make_control_valve(**{field: value})


def test_orifice_post_init_valid_inputs():
    orifice = make_orifice()
    assert orifice.d_over_D_ratio == 0.5
    assert orifice.pressure_drop == 500.0


@pytest.mark.parametrize(
    "field, value, match_msg",
    [
        ("d_over_D_ratio", -0.1, "Orifice d_over_D_ratio must be between 0 and 1"),
        ("d_over_D_ratio", 1.1, "Orifice d_over_D_ratio must be between 0 and 1"),
        ("pressure_drop", 0.0, "Orifice pressure_drop must be positive if provided"),
        ("pressure_drop", -1.0, "Orifice pressure_drop must be positive if provided"),
        ("pipe_diameter", 0.0, "Orifice pipe_diameter must be positive if provided"),
        ("pipe_diameter", -0.1, "Orifice pipe_diameter must be positive if provided"),
        ("orifice_diameter", 0.0, "Orifice orifice_diameter must be positive if provided"),
        ("orifice_diameter", -0.05, "Orifice orifice_diameter must be positive if provided"),
        ("discharge_coefficient", 0.0, "Orifice discharge_coefficient must be positive if provided"),
        ("discharge_coefficient", -0.1, "Orifice discharge_coefficient must be positive if provided"),
        ("expansibility", 0.0, "Orifice expansibility must be positive if provided"),
        ("expansibility", -0.1, "Orifice expansibility must be positive if provided"),
    ],
)
def test_orifice_post_init_raises_for_invalid_values(field, value, match_msg):
    with pytest.raises(ValueError, match=match_msg):
        make_orifice(**{field: value})
