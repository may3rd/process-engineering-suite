"""add_project_unit_system

Revision ID: add_project_unit_system
Revises: add_user_initials
Create Date: 2025-12-16

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "add_project_unit_system"
down_revision: Union[str, None] = "add_user_initials"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column(
            "unit_system",
            sa.String(length=32),
            nullable=False,
            server_default="metric",
        ),
    )


def downgrade() -> None:
    op.drop_column("projects", "unit_system")
