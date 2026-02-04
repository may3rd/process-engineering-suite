"""Equipment compressor subtype details."""

from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import ForeignKey, Numeric, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class EquipmentCompressor(Base):
    """Compressor-specific equipment details (joined by equipment_id)."""

    __tablename__ = "equipment_compressors"

    equipment_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("equipment.id", ondelete="CASCADE"),
        primary_key=True,
    )

    compressor_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rated_capacity_m3h: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    standard_capacity_nm3h: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    suction_pressure_barg: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    discharge_pressure_barg: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    compression_ratio: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    suction_temperature_c: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    discharge_temperature_c: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    efficiency_pct: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    motor_power_kw: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    surge_flow_m3h: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    anti_surge_valve_setpoint_pct: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)

    extra: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)

