"""Add is_active column to projects and protective_systems

Revision ID: 202601010001
Revises: 202512190002
Create Date: 2026-01-01 14:15:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "202601010001"
down_revision: Union[str, None] = "202512190002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE projects "
        "ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true"
    )
    op.execute(
        "ALTER TABLE protective_systems "
        "ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE protective_systems DROP COLUMN IF EXISTS is_active")
    op.execute("ALTER TABLE projects DROP COLUMN IF EXISTS is_active")
