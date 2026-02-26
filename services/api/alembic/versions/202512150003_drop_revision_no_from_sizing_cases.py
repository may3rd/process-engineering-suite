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
    # Drop the revision_no column - model now uses current_revision_id (FK to revision_history)
    op.drop_column('sizing_cases', 'revision_no')


def downgrade() -> None:
    # Re-add the revision_no column
    op.add_column('sizing_cases', sa.Column('revision_no', sa.Integer(), nullable=False, server_default='1'))
    # Remove the server default after adding
    op.alter_column('sizing_cases', 'revision_no', server_default=None)
