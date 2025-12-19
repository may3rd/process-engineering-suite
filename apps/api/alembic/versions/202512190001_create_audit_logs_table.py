"""Create audit_logs table

Revision ID: 202512190001
Revises: 202512200001
Create Date: 2025-12-19 13:40:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


# revision identifiers, used by Alembic.
revision: str = "202512190001"
down_revision: Union[str, None] = "202512200001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create audit_logs table and related enum types."""
    
    # Create enum types if they don't exist
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE audit_action AS ENUM (
                'create', 'update', 'delete', 'status_change', 'calculate'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE audit_entity_type AS ENUM (
                'protective_system', 'scenario', 'sizing_case', 'project',
                'revision', 'comment', 'attachment', 'note', 'todo'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Create audit_logs table
    # Use postgresql.ENUM with create_type=False since we already created the types above
    from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
    
    audit_action_enum = PG_ENUM('create', 'update', 'delete', 'status_change', 'calculate',
                                 name='audit_action', create_type=False)
    audit_entity_enum = PG_ENUM('protective_system', 'scenario', 'sizing_case', 'project',
                                 'revision', 'comment', 'attachment', 'note', 'todo',
                                 name='audit_entity_type', create_type=False)
    
    op.create_table(
        'audit_logs',
        sa.Column('id', UUID(as_uuid=False), primary_key=True),
        sa.Column('action', audit_action_enum, nullable=False),
        sa.Column('entity_type', audit_entity_enum, nullable=False),
        sa.Column('entity_id', UUID(as_uuid=False), nullable=False),
        sa.Column('entity_name', sa.String(255), nullable=False),
        sa.Column('user_id', UUID(as_uuid=False), nullable=False),
        sa.Column('user_name', sa.String(255), nullable=False),
        sa.Column('user_role', sa.String(50), nullable=True),
        sa.Column('changes', JSONB, nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('project_id', UUID(as_uuid=False), nullable=True),
        sa.Column('project_name', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    
    # Create indexes for common queries
    op.create_index('ix_audit_logs_entity_type', 'audit_logs', ['entity_type'])
    op.create_index('ix_audit_logs_entity_id', 'audit_logs', ['entity_id'])
    op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id'])
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])
    op.create_index('ix_audit_logs_project_id', 'audit_logs', ['project_id'])


def downgrade() -> None:
    """Drop audit_logs table and enum types."""
    op.drop_index('ix_audit_logs_project_id', table_name='audit_logs')
    op.drop_index('ix_audit_logs_created_at', table_name='audit_logs')
    op.drop_index('ix_audit_logs_user_id', table_name='audit_logs')
    op.drop_index('ix_audit_logs_entity_id', table_name='audit_logs')
    op.drop_index('ix_audit_logs_entity_type', table_name='audit_logs')
    op.drop_table('audit_logs')
    op.execute("DROP TYPE audit_entity_type")
    op.execute("DROP TYPE audit_action")
