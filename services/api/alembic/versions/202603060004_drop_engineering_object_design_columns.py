"""Drop transitional design columns from engineering_objects.

Revision ID: 202603060004
Revises: 202603060003
Create Date: 2026-03-06 11:10:00
"""

from typing import Sequence, Union

from alembic import op


revision: str = '202603060004'
down_revision: Union[str, Sequence[str], None] = '202603060003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('ALTER TABLE engineering_objects DROP COLUMN IF EXISTS design_pressure')
    op.execute('ALTER TABLE engineering_objects DROP COLUMN IF EXISTS design_pressure_unit')
    op.execute('ALTER TABLE engineering_objects DROP COLUMN IF EXISTS mawp')
    op.execute('ALTER TABLE engineering_objects DROP COLUMN IF EXISTS mawp_unit')
    op.execute('ALTER TABLE engineering_objects DROP COLUMN IF EXISTS design_temp')
    op.execute('ALTER TABLE engineering_objects DROP COLUMN IF EXISTS design_temp_unit')


def downgrade() -> None:
    op.execute('ALTER TABLE engineering_objects ADD COLUMN IF NOT EXISTS design_pressure NUMERIC(10,2)')
    op.execute('ALTER TABLE engineering_objects ADD COLUMN IF NOT EXISTS design_pressure_unit VARCHAR(20)')
    op.execute('ALTER TABLE engineering_objects ADD COLUMN IF NOT EXISTS mawp NUMERIC(10,2)')
    op.execute('ALTER TABLE engineering_objects ADD COLUMN IF NOT EXISTS mawp_unit VARCHAR(20)')
    op.execute('ALTER TABLE engineering_objects ADD COLUMN IF NOT EXISTS design_temp NUMERIC(10,2)')
    op.execute('ALTER TABLE engineering_objects ADD COLUMN IF NOT EXISTS design_temp_unit VARCHAR(20)')
