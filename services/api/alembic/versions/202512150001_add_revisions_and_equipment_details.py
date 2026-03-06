"""add revisions and equipment details

Revision ID: add_rev_and_equip_details
Revises: add_project_notes, 202412150001, add_case_consideration
Create Date: 2025-12-15 00:01:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "add_rev_and_equip_details"
down_revision: Union[str, tuple[str, ...], None] = (
    "add_project_notes",
    "202412150001",
    "add_case_consideration",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE protective_systems "
        "ADD COLUMN IF NOT EXISTS revision_no INTEGER NOT NULL DEFAULT 1"
    )
    op.execute(
        "ALTER TABLE overpressure_scenarios "
        "ADD COLUMN IF NOT EXISTS revision_no INTEGER NOT NULL DEFAULT 1"
    )
    op.execute("ALTER TABLE equipment ADD COLUMN IF NOT EXISTS details JSONB")


def downgrade() -> None:
    op.execute("ALTER TABLE equipment DROP COLUMN IF EXISTS details")
    op.execute("ALTER TABLE overpressure_scenarios DROP COLUMN IF EXISTS revision_no")
    op.execute("ALTER TABLE protective_systems DROP COLUMN IF EXISTS revision_no")
