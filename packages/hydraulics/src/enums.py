"""Shared enumerations used across the framework."""
from __future__ import annotations

from enum import Enum


class Phase(str, Enum):
    LIQUID = "liquid"
    GAS = "gas"
    VAPOR = "vapor"


class FittingType(str, Enum):
    SCRD = "SCRD"
    LR = "LR"
    SR = "SR"
