"""EngineeringObject model."""
from typing import Any, Dict, Optional
from uuid import UUID as PyUUID, uuid4

from sqlalchemy import ForeignKey, String
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
        default=uuid4
    )
    tag: Mapped[str] = mapped_column(
        String, 
        unique=True, 
        index=True, 
        nullable=False
    ) # e.g., P-101
    object_type: Mapped[str] = mapped_column(
        String, 
        nullable=False
    ) # e.g., "CENTRIFUGAL_PUMP"
    
    # The "Clean Fuel" for AI and I-GEN
    # Stores design data, process data, and vendor info in one place
    properties: Mapped[Dict[str, Any]] = mapped_column(
        JSONB, 
        default=dict, 
        server_default='{}'
    ) 
    
    # Metadata for I-DDC tracking
    project_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), 
        ForeignKey("projects.id"),
        nullable=True
    )
    status: Mapped[Optional[str]] = mapped_column(
        String, 
        nullable=True
    ) # e.g., "In-Design", "Purchased"

    # Relationships
    project = relationship("Project")
