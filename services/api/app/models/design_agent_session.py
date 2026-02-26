"""DesignAgentSession model — persists design agent workflow state and outputs."""
from typing import Optional, List

from sqlalchemy import Enum as SQLEnum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class DesignAgentSession(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Saved design agent workflow session from the design-agents app."""

    __tablename__ = "design_agent_sessions"

    owner_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Full DesignState from services/design-agents/src/types.ts serialized as JSONB
    state_data: Mapped[dict] = mapped_column(
        JSONB, nullable=False, default=dict, server_default="{}"
    )

    # Step tracking
    active_step_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    completed_steps: Mapped[List[str]] = mapped_column(
        ARRAY(String), nullable=False, default=list, server_default="{}"
    )

    # Session lifecycle
    status: Mapped[str] = mapped_column(
        SQLEnum("active", "completed", "archived", name="design_session_status"),
        nullable=False,
        default="active",
        server_default="active",
    )

    # Relationships
    owner = relationship("User")
