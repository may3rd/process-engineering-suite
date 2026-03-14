from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Calculation(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = 'calculations'

    app: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
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
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default='', server_default='')
    status: Mapped[str] = mapped_column(String(50), nullable=False, default='draft', server_default='draft')
    tag: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default='true')
    linked_equipment_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    linked_equipment_tag: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    latest_version_no: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default='1')
    latest_version_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), nullable=True)
    current_input_snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default='{}')
    current_result_snapshot: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    current_metadata: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default='{}')
    current_revision_history: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default='[]')

    area = relationship('Area')
    owner = relationship('User')
    versions = relationship(
        'CalculationVersion',
        back_populates='calculation',
        cascade='all, delete-orphan',
        order_by='desc(CalculationVersion.version_no)',
    )
