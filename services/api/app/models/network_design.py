"""NetworkDesign model — stores hydraulic network editor designs."""
from typing import Optional

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class NetworkDesign(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Saved hydraulic network design (nodes + pipes) from the network-editor app."""

    __tablename__ = "network_designs"

    # Optional hierarchy link — nullable for standalone use
    area_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("areas.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    owner_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Full serialized network state: { nodes: NodeProps[], pipes: PipeProps[], fluid: {...}, ... }
    network_data: Mapped[dict] = mapped_column(
        JSONB, nullable=False, default=dict, server_default="{}"
    )

    # Cached counts for list display without deserializing network_data
    node_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    pipe_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    # Relationships
    area = relationship("Area")
    owner = relationship("User")
