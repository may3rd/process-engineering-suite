"""Add calculation metadata column to venting_calculations.

Revision ID: 202602250003
Revises: 202602250002
Create Date: 2026-02-25 14:35:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "202602250003"
down_revision: Union[str, Sequence[str], None] = "202602250002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "venting_calculations",
        sa.Column(
            "calculation_metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )


def downgrade() -> None:
    op.drop_column("venting_calculations", "calculation_metadata")
