"""Unit model."""
from sqlalchemy import String, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Unit(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Unit table - process unit within a plant."""
    
    __tablename__ = "units"
    
    plant_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("plants.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    service: Mapped[str] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(
        SQLEnum("active", "inactive", name="unit_status"),
        nullable=False,
        default="active",
    )
    owner_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id"),
        nullable=False,
    )
    
    # Relationships
    plant = relationship("Plant", back_populates="units")
    owner = relationship("User", back_populates="owned_units")
    areas = relationship("Area", back_populates="unit", cascade="all, delete-orphan")
