"""EngineeringObject model."""
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID as PyUUID, uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from .base import Base, TimestampMixin


class EngineeringObject(Base, TimestampMixin):
    """
    EngineeringObject table - central database model for all engineering objects.
    Supports I-DDC Identity and I-GEN AI capabilities.
    """

    __tablename__ = "engineering_objects"

    # I-DDC Identity
    uuid: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    tag: Mapped[str] = mapped_column(
        String,
        unique=True,
        index=True,
        nullable=False,
    )
    object_type: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    area_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey('areas.id', ondelete='SET NULL'),
        nullable=True,
        index=True,
    )
    owner_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey('users.id', ondelete='SET NULL'),
        nullable=True,
        index=True,
    )
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    design_pressure: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    design_pressure_unit: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True, default='barg'
    )
    mawp: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    mawp_unit: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default='barg')
    design_temp: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    design_temp_unit: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default='C')
    location_ref: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default='true'
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )

    # The "Clean Fuel" for AI and I-GEN
    # Stores design data, process data, and vendor info in one place
    properties: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        server_default='{}',
    )

    # Metadata for I-DDC tracking
    project_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey('projects.id'),
        nullable=True,
    )
    status: Mapped[Optional[str]] = mapped_column(
        String,
        nullable=True,
    )

    # Relationships
    project = relationship('Project')
    area = relationship('Area')
    owner = relationship('User')
