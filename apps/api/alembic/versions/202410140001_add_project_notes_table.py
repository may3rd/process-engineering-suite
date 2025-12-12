"""add project notes table

Revision ID: add_project_notes
Revises: c9328701cffb
Create Date: 2024-10-14 00:01:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_project_notes'
down_revision: Union[str, None] = 'c9328701cffb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'project_notes',
        sa.Column('id', sa.UUID(as_uuid=False), primary_key=True),
        sa.Column('protective_system_id', sa.UUID(as_uuid=False), sa.ForeignKey('protective_systems.id', ondelete='CASCADE'), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('created_by', sa.UUID(as_uuid=False), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('updated_by', sa.UUID(as_uuid=False), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_project_notes_psv', 'project_notes', ['protective_system_id'])
    op.add_column('comments', sa.Column('updated_by', sa.UUID(as_uuid=False), nullable=True))
    op.create_foreign_key(
        'fk_comments_updated_by', 'comments', 'users',
        local_cols=['updated_by'], remote_cols=['id'], ondelete='SET NULL'
    )


def downgrade() -> None:
    op.drop_constraint('fk_comments_updated_by', 'comments', type_='foreignkey')
    op.drop_column('comments', 'updated_by')
    op.drop_index('ix_project_notes_psv', table_name='project_notes')
    op.drop_table('project_notes')
