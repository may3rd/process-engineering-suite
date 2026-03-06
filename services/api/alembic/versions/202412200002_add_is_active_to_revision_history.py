"""add_is_active_to_revision_history

Revision ID: 202412200002
Revises: 202412150002
Create Date: 2026-01-15 08:06:53.257014

"""
from typing import Sequence, Union

from alembic import op


revision: str = '202412200002'
down_revision: Union[str, None] = '202412150002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE IF EXISTS revision_history "
        "ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE IF EXISTS revision_history DROP COLUMN IF EXISTS is_active")
