"""Base vessel geometry model."""

from __future__ import annotations

from abc import ABC, abstractmethod
import math


class Vessel(ABC):
    """Base class for vessel geometry calculations."""

    vessel_type: str

    def __init__(self) -> None:
        self._diameter = 0.0
        self._length = 0.0
        self._head_distance = 0.0
        self._high_liquid_level = 0.0
        self._low_liquid_level = 0.0
        self._liquid_level = 0.0
        self._overflow_flag = False

    @property
    def diameter(self) -> float:
        return self._diameter

    @diameter.setter
    def diameter(self, value: float) -> None:
        if value <= 0:
            raise ValueError("Diameter must be positive")
        self._diameter = value

    @property
    def length(self) -> float:
        return self._length

    @length.setter
    def length(self, value: float) -> None:
        if value <= 0:
            raise ValueError("Length must be positive")
        self._length = value

    @property
    def head_distance(self) -> float:
        return self._head_distance

    @head_distance.setter
    def head_distance(self, value: float) -> None:
        if value < 0:
            raise ValueError("Head distance must be non-negative")
        self._head_distance = value

    @property
    def high_liquid_level(self) -> float:
        return self._high_liquid_level

    @high_liquid_level.setter
    def high_liquid_level(self, value: float) -> None:
        if value < 0:
            raise ValueError("High liquid level must be non-negative")
        self._high_liquid_level = value

    @property
    def low_liquid_level(self) -> float:
        return self._low_liquid_level

    @low_liquid_level.setter
    def low_liquid_level(self, value: float) -> None:
        if value < 0:
            raise ValueError("Low liquid level must be non-negative")
        self._low_liquid_level = value

    @property
    def liquid_level(self) -> float:
        return self._liquid_level

    @liquid_level.setter
    def liquid_level(self, value: float) -> None:
        if value < 0:
            raise ValueError("Liquid level must be non-negative")
        self._liquid_level = value

    @property
    def overflow_flag(self) -> bool:
        return self._overflow_flag

    @overflow_flag.setter
    def overflow_flag(self, value: bool) -> None:
        self._overflow_flag = value

    @property
    def overflow_volume(self) -> float:
        return self.total_volume * 0.02 if self._overflow_flag else 0.0

    @property
    @abstractmethod
    def total_height(self) -> float:
        """Overall vessel height."""

    @property
    @abstractmethod
    def tangent_height(self) -> float:
        """Height to tangent line."""

    @property
    @abstractmethod
    def head_volume(self) -> float:
        """Volume of vessel heads."""

    @property
    @abstractmethod
    def shell_volume(self) -> float:
        """Volume of vessel shell."""

    @property
    def total_volume(self) -> float:
        return self.shell_volume + self.head_volume

    @property
    def effective_volume(self) -> float:
        return self.liquid_volume(self.high_liquid_level)

    @property
    def efficiency_volume(self) -> float:
        return (self.effective_volume / self.total_volume) * 100.0 if self.total_volume > 0 else 0.0

    @property
    @abstractmethod
    def working_volume(self) -> float:
        """Working volume between specified liquid levels."""

    @property
    @abstractmethod
    def tangent_volume(self) -> float:
        """Volume to tangent height."""

    @property
    @abstractmethod
    def head_surface_area(self) -> float:
        """Surface area of vessel heads."""

    @property
    @abstractmethod
    def shell_surface_area(self) -> float:
        """Surface area of vessel shell."""

    @property
    def total_surface_area(self) -> float:
        return self.shell_surface_area + self.head_surface_area

    @abstractmethod
    def head_liquid_volume(self, value: float) -> float:
        """Liquid volume in heads at a given level."""

    @abstractmethod
    def shell_liquid_volume(self, value: float) -> float:
        """Liquid volume in shell at a given level."""

    def liquid_volume(self, value: float) -> float:
        return self.shell_liquid_volume(value) + self.head_liquid_volume(value)

    @abstractmethod
    def head_wetted_area(self, value: float) -> float:
        """Wetted area in heads at a given level."""

    @abstractmethod
    def shell_wetted_area(self, value: float) -> float:
        """Wetted area in shell at a given level."""

    def wetted_area(self, value: float) -> float:
        return self.shell_wetted_area(value) + self.head_wetted_area(value)

    def vertical_cone_surface_area(self, value: float) -> float:
        if value <= 0.0 or self.head_distance <= 0.0:
            return 0.0
        v = min(value, self._head_distance)
        if self.head_distance == 0:
            return 0.0
        r = (v / self.head_distance) * self.diameter / 2
        return math.pi * r * math.sqrt(v**2 + r**2)
