"""Equipment tank subtype details."""

from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import Boolean, ForeignKey, Numeric, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class EquipmentTank(Base):
    """Tank-specific equipment details (joined by equipment_id)."""

    __tablename__ = "equipment_tanks"

    equipment_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("equipment.id", ondelete="CASCADE"),
        primary_key=True,
    )

    tank_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    orientation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    inner_diameter_mm: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    height_mm: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    roof_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    wall_thickness_mm: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    insulated: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    insulation_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    insulation_thickness_mm: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)

    normal_liquid_level_pct: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    low_liquid_level_pct: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    high_liquid_level_pct: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)

    wetted_area_m2: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    volume_m3: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    heel_volume_m3: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)

    extra: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)

