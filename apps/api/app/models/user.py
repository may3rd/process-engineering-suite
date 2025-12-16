"""User model."""
from typing import Optional, Any

from sqlalchemy import String, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """User table for application users."""
    
    __tablename__ = "users"
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    initials: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    role: Mapped[str] = mapped_column(
        SQLEnum("engineer", "lead", "approver", "admin", "viewer", name="user_role"),
        nullable=False,
        default="engineer",
    )
    status: Mapped[str] = mapped_column(
        SQLEnum("active", "inactive", name="user_status"),
        nullable=False,
        default="active",
    )
    display_settings: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JSONB, nullable=True
    )
    
    # Relationships
    credential = relationship("Credential", back_populates="user", uselist=False)
    owned_customers = relationship("Customer", back_populates="owner")
    owned_plants = relationship("Plant", back_populates="owner")
    owned_units = relationship("Unit", back_populates="owner")
    owned_equipment = relationship("Equipment", back_populates="owner")
    owned_psvs = relationship("ProtectiveSystem", back_populates="owner")

