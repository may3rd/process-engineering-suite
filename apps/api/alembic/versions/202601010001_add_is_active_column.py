"""Add is_active column to projects and protective_systems

Revision ID: 202601010001
Revises: 202512190002
Create Date: 2026-01-01 14:15:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "202601010001"
down_revision: Union[str, None] = "202512190002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add is_active column to projects and protective_systems tables."""
    op.add_column(
        "projects",
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False)
    )
    op.add_column(
        "protective_systems",
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False)
    )


def downgrade() -> None:
    """Remove is_active column from projects and protective_systems tables."""
    op.drop_column("protective_systems", "is_active")
    op.drop_column("projects", "is_active")
