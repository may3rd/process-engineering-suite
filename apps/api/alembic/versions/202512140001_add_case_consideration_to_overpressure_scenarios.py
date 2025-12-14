"""add case consideration to overpressure scenarios

Revision ID: add_case_consideration
Revises: c9328701cffb
Create Date: 2025-12-14 00:01:00.000000
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "add_case_consideration"
down_revision: Union[str, None] = "c9328701cffb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use IF NOT EXISTS so this migration is safe to run on environments
    # where the column may have been added manually or by an earlier patch.
    op.execute(
        "ALTER TABLE overpressure_scenarios "
        "ADD COLUMN IF NOT EXISTS case_consideration TEXT"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE overpressure_scenarios "
        "DROP COLUMN IF EXISTS case_consideration"
    )

