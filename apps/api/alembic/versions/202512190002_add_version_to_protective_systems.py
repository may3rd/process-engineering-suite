"""Add version column to protective_systems for optimistic locking

Revision ID: 202512190002
Revises: 202512190001
Create Date: 2025-12-19 14:55:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "202512190002"
down_revision: Union[str, None] = "202512190001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add version column for optimistic locking."""
    op.add_column(
        "protective_systems",
        sa.Column("version", sa.Integer(), server_default="1", nullable=False)
    )


def downgrade() -> None:
    """Remove version column."""
    op.drop_column("protective_systems", "version")
