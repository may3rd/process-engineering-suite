"""Audit Log model for tracking all entity changes."""
from typing import Optional, List
from datetime import datetime

from sqlalchemy import Text, String, Enum, DateTime, Boolean, func
import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB
import enum

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class AuditAction(str, enum.Enum):
    """Types of auditable actions."""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    STATUS_CHANGE = "status_change"
    CALCULATE = "calculate"


class AuditEntityType(str, enum.Enum):
    """Types of entities that can be audited."""
    PROTECTIVE_SYSTEM = "protective_system"
    SCENARIO = "scenario"
    SIZING_CASE = "sizing_case"
    PROJECT = "project"
    REVISION = "revision"
    COMMENT = "comment"
    ATTACHMENT = "attachment"
    NOTE = "note"
    TODO = "todo"


class AuditLog(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Audit log table - tracks all entity changes in the system."""
    
    __tablename__ = "audit_logs"
    
    # What happened
    # Use values_callable to ensure the enum values (lowercase) are used, not the member names (uppercase)
    action: Mapped[str] = mapped_column(
        Enum(AuditAction, name="audit_action", create_constraint=False, native_enum=True,
             values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        index=True,
    )
    entity_type: Mapped[str] = mapped_column(
        Enum(AuditEntityType, name="audit_entity_type", create_constraint=False, native_enum=True,
             values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        index=True,
    )
    entity_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False, index=True)
    entity_name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Who did it
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False, index=True)
    user_name: Mapped[str] = mapped_column(String(255), nullable=False)
    user_role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # What changed (for updates)
    changes: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Context
    project_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), nullable=True, index=True)
    project_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Specific index for created_at in AuditLog to avoid dropping existing DB index
    # while keeping TimestampMixin general for other models.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=sa.func.now(),
        nullable=False,
        index=True,
    )
