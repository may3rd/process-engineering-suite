"""Create engineering_objects table.

Revision ID: 202603060001
Revises: 202602250005
Create Date: 2026-03-06 08:45:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '202603060001'
down_revision: Union[str, Sequence[str], None] = '202602250005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'engineering_objects',
        sa.Column('uuid', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('tag', sa.String(), nullable=False),
        sa.Column('object_type', sa.String(), nullable=False),
        sa.Column('properties', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('project_id', postgresql.UUID(as_uuid=False), sa.ForeignKey('projects.id'), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('tag', name='uq_engineering_objects_tag'),
    )

def downgrade() -> None:
    op.drop_table('engineering_objects')
