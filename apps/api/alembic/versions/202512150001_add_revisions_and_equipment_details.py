"""add revisions and equipment details

Revision ID: add_rev_and_equip_details
Revises: add_project_notes, 535cb84cdfbd, add_case_consideration
Create Date: 2025-12-15 00:01:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "add_rev_and_equip_details"
down_revision: Union[str, tuple[str, ...], None] = ("add_project_notes", "535cb84cdfbd", "add_case_consideration")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "protective_systems",
        sa.Column("revision_no", sa.Integer(), server_default=sa.text("1"), nullable=False),
    )
    op.add_column(
        "overpressure_scenarios",
        sa.Column("revision_no", sa.Integer(), server_default=sa.text("1"), nullable=False),
    )
    op.add_column(
        "equipment",
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("equipment", "details")
    op.drop_column("overpressure_scenarios", "revision_no")
    op.drop_column("protective_systems", "revision_no")
