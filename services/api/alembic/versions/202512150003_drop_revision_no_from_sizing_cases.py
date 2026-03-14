"""drop_revision_no_from_sizing_cases

Revision ID: drop_revision_no_sizing
Revises: add_revision_history
Create Date: 2025-12-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'drop_revision_no_sizing'
down_revision: Union[str, None] = 'add_revision_history'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('ALTER TABLE sizing_cases DROP COLUMN IF EXISTS revision_no')


def downgrade() -> None:
    op.execute(
        "ALTER TABLE sizing_cases "
        "ADD COLUMN IF NOT EXISTS revision_no INTEGER NOT NULL DEFAULT 1"
    )
    op.alter_column('sizing_cases', 'revision_no', server_default=None)
