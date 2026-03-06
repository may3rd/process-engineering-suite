"""add project notes table

Revision ID: add_project_notes
Revises: 202412120001
Create Date: 2024-10-14 00:01:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = 'add_project_notes'
down_revision: Union[str, None] = '202412120001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS project_notes (
          id UUID PRIMARY KEY,
          protective_system_id UUID NOT NULL REFERENCES protective_systems(id) ON DELETE CASCADE,
          body TEXT NOT NULL,
          created_by UUID NOT NULL REFERENCES users(id),
          updated_by UUID NULL REFERENCES users(id),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_project_notes_psv ON project_notes (protective_system_id)"
    )
    op.execute("ALTER TABLE comments ADD COLUMN IF NOT EXISTS updated_by UUID")
    op.execute(
        """
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_comments_updated_by'
          ) THEN
            ALTER TABLE comments
            ADD CONSTRAINT fk_comments_updated_by
            FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
          END IF;
        END$$
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE comments DROP CONSTRAINT IF EXISTS fk_comments_updated_by")
    op.execute("ALTER TABLE comments DROP COLUMN IF EXISTS updated_by")
    op.execute("DROP INDEX IF EXISTS ix_project_notes_psv")
    op.execute("DROP TABLE IF EXISTS project_notes")
