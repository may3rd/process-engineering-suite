"""create revision_history table

Revision ID: add_revision_history
Revises: add_rev_and_equip_details
Create Date: 2025-12-15 16:30:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "add_revision_history"
down_revision: Union[str, None] = "add_rev_and_equip_details"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("revision_history"):
        op.create_table(
            "revision_history",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("entity_type", sa.String(32), nullable=False),
            sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("revision_code", sa.String(16), nullable=False),
            sa.Column("sequence", sa.Integer(), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column(
                "originated_by",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id"),
                nullable=True,
            ),
            sa.Column("originated_at", sa.TIMESTAMP(timezone=True), nullable=True),
            sa.Column(
                "checked_by",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id"),
                nullable=True,
            ),
            sa.Column("checked_at", sa.TIMESTAMP(timezone=True), nullable=True),
            sa.Column(
                "approved_by",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id"),
                nullable=True,
            ),
            sa.Column("approved_at", sa.TIMESTAMP(timezone=True), nullable=True),
            sa.Column("issued_at", sa.TIMESTAMP(timezone=True), nullable=True),
            sa.Column("snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
            sa.Column(
                "is_active",
                sa.Boolean(),
                server_default=sa.text("true"),
                nullable=False,
            ),
            sa.Column(
                "created_at",
                sa.TIMESTAMP(timezone=True),
                server_default=sa.text("NOW()"),
                nullable=False,
            ),
            sa.UniqueConstraint(
                "entity_type",
                "entity_id",
                "revision_code",
                name="uq_revision_entity_code",
            ),
        )

    revision_history_indexes = {
        index["name"] for index in inspector.get_indexes("revision_history")
    }
    if "ix_revision_history_entity" not in revision_history_indexes:
        op.create_index(
            "ix_revision_history_entity",
            "revision_history",
            ["entity_type", "entity_id"],
        )

    protective_system_columns = {
        column["name"] for column in inspector.get_columns("protective_systems")
    }
    if "revision_no" in protective_system_columns:
        op.drop_column("protective_systems", "revision_no")
    if "current_revision_id" not in protective_system_columns:
        op.add_column(
            "protective_systems",
            sa.Column("current_revision_id", postgresql.UUID(as_uuid=True), nullable=True),
        )

    scenario_columns = {
        column["name"] for column in inspector.get_columns("overpressure_scenarios")
    }
    if "revision_no" in scenario_columns:
        op.drop_column("overpressure_scenarios", "revision_no")
    if "current_revision_id" not in scenario_columns:
        op.add_column(
            "overpressure_scenarios",
            sa.Column("current_revision_id", postgresql.UUID(as_uuid=True), nullable=True),
        )

    sizing_case_columns = {
        column["name"] for column in inspector.get_columns("sizing_cases")
    }
    if "current_revision_id" not in sizing_case_columns:
        op.add_column(
            "sizing_cases",
            sa.Column("current_revision_id", postgresql.UUID(as_uuid=True), nullable=True),
        )

    existing_foreign_keys = {
        fk["name"]
        for table_name in ("protective_systems", "overpressure_scenarios", "sizing_cases")
        for fk in inspector.get_foreign_keys(table_name)
        if fk.get("name")
    }
    if "fk_protective_systems_current_revision_id_revision_history" not in existing_foreign_keys:
        op.create_foreign_key(
            "fk_protective_systems_current_revision_id_revision_history",
            "protective_systems",
            "revision_history",
            ["current_revision_id"],
            ["id"],
        )
    if "fk_overpressure_scenarios_current_revision_id_revision_history" not in existing_foreign_keys:
        op.create_foreign_key(
            "fk_overpressure_scenarios_current_revision_id_revision_history",
            "overpressure_scenarios",
            "revision_history",
            ["current_revision_id"],
            ["id"],
        )
    if "fk_sizing_cases_current_revision_id_revision_history" not in existing_foreign_keys:
        op.create_foreign_key(
            "fk_sizing_cases_current_revision_id_revision_history",
            "sizing_cases",
            "revision_history",
            ["current_revision_id"],
            ["id"],
        )


def downgrade() -> None:
    # Drop current_revision_id columns
    op.drop_column("sizing_cases", "current_revision_id")
    op.drop_column("overpressure_scenarios", "current_revision_id")
    op.drop_column("protective_systems", "current_revision_id")
    
    # Re-add old revision_no columns
    op.add_column(
        "overpressure_scenarios",
        sa.Column("revision_no", sa.Integer(), server_default=sa.text("1"), nullable=False),
    )
    op.add_column(
        "protective_systems",
        sa.Column("revision_no", sa.Integer(), server_default=sa.text("1"), nullable=False),
    )
    
    # Drop index and table
    op.drop_index("ix_revision_history_entity", table_name="revision_history")
    op.drop_table("revision_history")
