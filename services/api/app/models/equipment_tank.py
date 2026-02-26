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

    latitude_deg: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    working_temperature: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    working_temperature_unit: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fluid: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    vapour_pressure: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    vapour_pressure_unit: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    flash_point: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    flash_point_unit: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    boiling_point: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    boiling_point_unit: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    latent_heat: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    latent_heat_unit: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    relieving_temp: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    relieving_temp_unit: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    molecular_weight_g_mol: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    tank_configuration: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    insulation_conductivity_w_mk: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    inside_heat_transfer_coeff_w_m2k: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    insulated_surface_area_m2: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)

    extra: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
