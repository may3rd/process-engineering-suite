"""Unit conversion helpers placeholder."""
from __future__ import annotations

from typing import Final, List

from .pint_units import u_convert_float as converts

DEGREE_C: Final[str] = "\N{DEGREE SIGN}C"
DEGREE_F: Final[str] = "\N{DEGREE SIGN}F"

UNIT_ALIASES: Final[dict[str, str]] = {
    "degc": DEGREE_C,
    "c": DEGREE_C,
    "degcelsius": DEGREE_C,
    "degf": DEGREE_F,
    "f": DEGREE_F,
    "degfahrenheit": DEGREE_F,
    "um": "µm",
    "micron": "µm",
    "micrometer": "µm",
}


def convert(value: float, from_unit: str, to_unit: str) -> float:
    normalized_from = _normalize_unit(from_unit)
    normalized_to = _normalize_unit(to_unit)

    return _run_converter(value, normalized_from, normalized_to)


def _normalize_unit(unit: str) -> str:
    cleaned = (unit or "").strip()
    if not cleaned:
        raise ValueError("Unit string must be non-empty for conversion")
    cleaned = cleaned.replace("**", "^")
    tokens = _tokenize_units(cleaned)
    if not tokens:
        raise ValueError("Unit string must be non-empty for conversion")
    numerator: List[str] = []
    denominator: List[str] = []
    current = numerator
    for token in tokens:
        if token == "*":
            continue
        if token == "/":
            current = denominator
            continue
        normalized = UNIT_ALIASES.get(token.lower(), token)
        stripped = normalized.strip("() ")
        if stripped and stripped not in {"1", "1.0"}:
            current.append(stripped)
    if not denominator:
        return "*".join(numerator)
    inverted = [_invert_term(term) for term in denominator]
    return "*".join([*numerator, *inverted])


def _tokenize_units(expr: str) -> List[str]:
    tokens: List[str] = []
    current: List[str] = []
    for char in expr:
        if char in "*/":
            if current:
                tokens.append("".join(current).strip())
                current = []
            tokens.append(char)
        else:
            current.append(char)
    if current:
        tokens.append("".join(current).strip())
    return tokens


def _invert_term(term: str) -> str:
    if "^" in term:
        base, power = term.split("^", 1)
        try:
            power_value = float(power)
        except ValueError:
            return f"{term}^-1"
        inverted = -power_value
        if inverted.is_integer():
            power_str = str(int(inverted))
        else:
            power_str = str(inverted)
        return f"{base}^{power_str}"
    return f"{term}^-1"


def _run_converter(value: float, normalized_from: str, normalized_to: str) -> float:
    convert_value = converts(value, normalized_from, normalized_to)
    return float(convert_value)
