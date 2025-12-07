import pytest

from network_hydraulic.utils.units import convert


@pytest.mark.parametrize(
    ("value", "from_unit", "to_unit", "expected"),
    [
        (2.5, "kg/h", "kg/s", 2.5 / 3600.0),
        (150.0, "µm", "m", 150e-6),
        (68.0, "degF", "K", 293.15),
        (68.0, "degF", "degC", 20.0),
        (500.0, "ft/s", "m/s", 500.0 * 0.3048),
        (1.0, "m^3/h", "m^3/s", 1.0 / 3600.0),
        (-5000.0, "Pa", "kPa", -5.0),
        (-100.0, "degC", "K", 173.15),
        (-40.0, "degF", "degC", -40.0),
        (-0.5, "kPag", "Pa", 101325.0 - 0.5 * 1000.0),
        (101325.0, "Pa", "kPag", 0.0),
    ],
)
def test_convert_handles_aliases_and_fractions(value, from_unit, to_unit, expected):
    assert convert(value, from_unit, to_unit) == pytest.approx(expected, rel=1e-9)
