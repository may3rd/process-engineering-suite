"""add user initials

Revision ID: add_user_initials
Revises: drop_revision_no_sizing
Create Date: 2025-12-15 00:04:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "add_user_initials"
down_revision: Union[str, None] = "drop_revision_no_sizing"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("initials", sa.String(length=16), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "initials")

