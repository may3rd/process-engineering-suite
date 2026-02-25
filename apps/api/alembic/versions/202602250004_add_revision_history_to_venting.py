"""Add revision_history column to venting_calculations.

Revision ID: 202602250004
Revises: 202602250003
Create Date: 2026-02-25 15:35:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "202602250004"
down_revision: Union[str, Sequence[str], None] = "202602250003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "venting_calculations",
        sa.Column(
            "revision_history",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )


def downgrade() -> None:
    op.drop_column("venting_calculations", "revision_history")
