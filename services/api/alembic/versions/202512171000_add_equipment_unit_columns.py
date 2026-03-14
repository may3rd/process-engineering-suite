"""Add equipment unit preference columns.

Revision ID: 202512171000
Revises: 202512150001
Create Date: 2025-12-17

Adds unit preference columns to equipment table:
- design_pressure_unit (default: barg)
- mawp_unit (default: barg)
- design_temp_unit (default: C)
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = '202512171000'
down_revision = 'add_user_display_settings'
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "ALTER TABLE equipment "
        "ADD COLUMN IF NOT EXISTS design_pressure_unit VARCHAR(20) DEFAULT 'barg'"
    )
    op.execute(
        "ALTER TABLE equipment "
        "ADD COLUMN IF NOT EXISTS mawp_unit VARCHAR(20) DEFAULT 'barg'"
    )
    op.execute(
        "ALTER TABLE equipment "
        "ADD COLUMN IF NOT EXISTS design_temp_unit VARCHAR(20) DEFAULT 'C'"
    )


def downgrade():
    op.execute('ALTER TABLE equipment DROP COLUMN IF EXISTS design_temp_unit')
    op.execute('ALTER TABLE equipment DROP COLUMN IF EXISTS mawp_unit')
    op.execute('ALTER TABLE equipment DROP COLUMN IF EXISTS design_pressure_unit')
