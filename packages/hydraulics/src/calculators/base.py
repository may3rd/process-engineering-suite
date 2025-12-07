"""Calculator protocols."""
from __future__ import annotations

from typing import Protocol

from network_hydraulic.models.pipe_section import PipeSection


class LossCalculator(Protocol):
    def calculate(self, section: PipeSection) -> None:  # pragma: no cover - placeholder
        """Mutate section outputs with a specific loss contribution."""
        raise NotImplementedError
