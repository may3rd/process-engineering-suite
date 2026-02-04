"""Equipment pump subtype details."""

from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import ForeignKey, Numeric, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class EquipmentPump(Base):
    """Pump-specific equipment details (joined by equipment_id)."""

    __tablename__ = "equipment_pumps"

    equipment_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("equipment.id", ondelete="CASCADE"),
        primary_key=True,
    )

    pump_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rated_flow_m3h: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    rated_head_m: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    max_discharge_pressure_barg: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    shutoff_head_m: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    npsh_required_m: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    efficiency_pct: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    motor_power_kw: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    relief_valve_set_pressure_barg: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    max_viscosity_cp: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    suction_pressure_barg: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    discharge_pressure_barg: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    fluid_temperature_c: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    fluid_density_kgm3: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)

    extra: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)

