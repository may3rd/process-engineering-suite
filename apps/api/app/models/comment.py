"""Comment model."""
from sqlalchemy import Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Comment(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Comment table - comments on protective systems."""
    
    __tablename__ = "comments"
    
    protective_system_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("protective_systems.id", ondelete="CASCADE"),
        nullable=False,
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_by: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id"),
        nullable=False,
    )
    
    # Relationships
    protective_system = relationship("ProtectiveSystem", back_populates="comments")
