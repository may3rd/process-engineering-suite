"""Area model."""
from sqlalchemy import String, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Area(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Area table - logical area within a unit."""
    
    __tablename__ = "areas"
    
    unit_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("units.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(
        SQLEnum("active", "inactive", name="area_status"),
        nullable=False,
        default="active",
    )
    
    # Relationships
    unit = relationship("Unit", back_populates="areas")
    projects = relationship("Project", back_populates="area", cascade="all, delete-orphan")
    protective_systems = relationship("ProtectiveSystem", back_populates="area", cascade="all, delete-orphan")
    equipment = relationship("Equipment", back_populates="area", cascade="all, delete-orphan")
