"""Add calculation and calculation_versions tables.

Revision ID: 202603130001
Revises: 202603060004
Create Date: 2026-03-13 16:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '202603130001'
down_revision: Union[str, Sequence[str], None] = '202603060004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'calculations',
        sa.Column('id', postgresql.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column('app', sa.String(length=100), nullable=False),
        sa.Column('area_id', postgresql.UUID(as_uuid=False), sa.ForeignKey('areas.id', ondelete='SET NULL'), nullable=True),
        sa.Column('owner_id', postgresql.UUID(as_uuid=False), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False, server_default=''),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='draft'),
        sa.Column('tag', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('linked_equipment_id', sa.String(length=255), nullable=True),
        sa.Column('linked_equipment_tag', sa.String(length=255), nullable=True),
        sa.Column('latest_version_no', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('latest_version_id', postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column('current_input_snapshot', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('current_result_snapshot', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('current_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('current_revision_history', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_calculations_app', 'calculations', ['app'], unique=False)
    op.create_index('ix_calculations_area_id', 'calculations', ['area_id'], unique=False)
    op.create_index('ix_calculations_owner_id', 'calculations', ['owner_id'], unique=False)
    op.create_index('ix_calculations_tag', 'calculations', ['tag'], unique=False)

    op.create_table(
        'calculation_versions',
        sa.Column('id', postgresql.UUID(as_uuid=False), primary_key=True, nullable=False),
        sa.Column('calculation_id', postgresql.UUID(as_uuid=False), sa.ForeignKey('calculations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('version_no', sa.Integer(), nullable=False),
        sa.Column('version_kind', sa.String(length=50), nullable=False),
        sa.Column('inputs', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('results', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('revision_history', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column('linked_equipment_id', sa.String(length=255), nullable=True),
        sa.Column('linked_equipment_tag', sa.String(length=255), nullable=True),
        sa.Column('source_version_id', postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column('change_note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('calculation_id', 'version_no', name='uq_calculation_versions_calc_version'),
    )
    op.create_index('ix_calculation_versions_calculation_id', 'calculation_versions', ['calculation_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_calculation_versions_calculation_id', table_name='calculation_versions')
    op.drop_table('calculation_versions')
    op.drop_index('ix_calculations_tag', table_name='calculations')
    op.drop_index('ix_calculations_owner_id', table_name='calculations')
    op.drop_index('ix_calculations_area_id', table_name='calculations')
    op.drop_index('ix_calculations_app', table_name='calculations')
    op.drop_table('calculations')
