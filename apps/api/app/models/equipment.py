"""Equipment model."""
from typing import Optional

from sqlalchemy import String, Text, Numeric, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Equipment(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Equipment table - protected equipment."""
    
    __tablename__ = "equipment"
    
    area_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("areas.id", ondelete="CASCADE"),
        nullable=False,
    )
    type: Mapped[str] = mapped_column(
        SQLEnum(
            "vessel", "tank", "heat_exchanger", "column", "reactor",
            "pump", "compressor", "piping", "other",
            name="equipment_type"
        ),
        nullable=False,
    )
    tag: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    design_pressure: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    mawp: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    design_temp: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    owner_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        SQLEnum("active", "inactive", name="equipment_status"),
        nullable=False,
        default="active",
    )
    location_ref: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    details: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    # Relationships
    area = relationship("Area", back_populates="equipment")
    owner = relationship("User", back_populates="owned_equipment")
    equipment_links = relationship("EquipmentLink", back_populates="equipment", cascade="all, delete-orphan")
