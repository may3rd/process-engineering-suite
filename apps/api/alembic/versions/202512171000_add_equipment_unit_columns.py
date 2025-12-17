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
    # Add unit preference columns to equipment table
    op.add_column('equipment', sa.Column('design_pressure_unit', sa.String(20), nullable=True, server_default='barg'))
    op.add_column('equipment', sa.Column('mawp_unit', sa.String(20), nullable=True, server_default='barg'))
    op.add_column('equipment', sa.Column('design_temp_unit', sa.String(20), nullable=True, server_default='C'))


def downgrade():
    op.drop_column('equipment', 'design_temp_unit')
    op.drop_column('equipment', 'mawp_unit')
    op.drop_column('equipment', 'design_pressure_unit')
