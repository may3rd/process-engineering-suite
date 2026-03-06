"""add_is_active_to_psv_entities

Revision ID: 202412150002
Revises: 202412150001
Create Date: 2026-01-15 07:37:09.781011

"""
from typing import Sequence, Union

from alembic import op


revision: str = '202412150002'
down_revision: Union[str, None] = '202412150001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE IF EXISTS comments ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true")
    op.execute("ALTER TABLE IF EXISTS equipment ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true")
    op.execute("ALTER TABLE IF EXISTS overpressure_scenarios ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true")
    op.execute("ALTER TABLE IF EXISTS project_notes ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true")
    op.execute("ALTER TABLE IF EXISTS sizing_cases ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true")
    op.execute("ALTER TABLE IF EXISTS todos ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true")


def downgrade() -> None:
    op.execute("ALTER TABLE IF EXISTS todos DROP COLUMN IF EXISTS is_active")
    op.execute("ALTER TABLE IF EXISTS sizing_cases DROP COLUMN IF EXISTS is_active")
    op.execute("ALTER TABLE IF EXISTS project_notes DROP COLUMN IF EXISTS is_active")
    op.execute("ALTER TABLE IF EXISTS overpressure_scenarios DROP COLUMN IF EXISTS is_active")
    op.execute("ALTER TABLE IF EXISTS equipment DROP COLUMN IF EXISTS is_active")
    op.execute("ALTER TABLE IF EXISTS comments DROP COLUMN IF EXISTS is_active")
