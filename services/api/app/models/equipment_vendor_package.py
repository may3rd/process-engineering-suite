"""Equipment vendor package subtype details."""

from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class EquipmentVendorPackage(Base):
    """Vendor package equipment details (joined by equipment_id)."""

    __tablename__ = "equipment_vendor_packages"

    equipment_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("equipment.id", ondelete="CASCADE"),
        primary_key=True,
    )

    vendor_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    package_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    package_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    extra: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)

