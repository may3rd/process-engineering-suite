"""Add display_settings to users table

Revision ID: add_user_display_settings
Revises: add_project_unit_system
Create Date: 2025-12-16
"""
from typing import Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers
revision: str = "add_user_display_settings"
down_revision: Union[str, None] = "add_project_unit_system"
branch_labels: Union[str, tuple[str, ...], None] = None
depends_on: Union[str, tuple[str, ...], None] = None


def upgrade() -> None:
    """Add display_settings JSONB column to users table."""
    op.add_column(
        "users",
        sa.Column("display_settings", JSONB, nullable=True)
    )


def downgrade() -> None:
    """Remove display_settings column from users table."""
    op.drop_column("users", "display_settings")
