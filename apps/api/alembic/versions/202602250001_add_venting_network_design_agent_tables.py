"""Add venting_calculations, network_designs, design_agent_sessions tables.

Revision ID: 202602250001
Revises: 202602030002
Create Date: 2026-02-25
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY

# revision identifiers, used by Alembic.
revision: str = "202602250001"
down_revision: Union[str, None] = "202602030002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. venting_calculations
    op.create_table(
        "venting_calculations",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "area_id",
            UUID(as_uuid=False),
            sa.ForeignKey("areas.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "equipment_id",
            UUID(as_uuid=False),
            sa.ForeignKey("equipment.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "owner_id",
            UUID(as_uuid=False),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column(
            "status",
            sa.Enum("draft", "in_review", "approved", name="vent_calc_status"),
            nullable=False,
            server_default="draft",
        ),
        sa.Column("inputs", JSONB, nullable=False, server_default="{}"),
        sa.Column("results", JSONB, nullable=True),
        sa.Column("api_edition", sa.String(10), nullable=False, server_default="7TH"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_venting_calculations_area_id", "venting_calculations", ["area_id"]
    )
    op.create_index(
        "ix_venting_calculations_owner_id", "venting_calculations", ["owner_id"]
    )

    # 2. network_designs
    op.create_table(
        "network_designs",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "area_id",
            UUID(as_uuid=False),
            sa.ForeignKey("areas.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "owner_id",
            UUID(as_uuid=False),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("network_data", JSONB, nullable=False, server_default="{}"),
        sa.Column("node_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("pipe_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_network_designs_area_id", "network_designs", ["area_id"])
    op.create_index("ix_network_designs_owner_id", "network_designs", ["owner_id"])

    # 3. design_agent_sessions
    op.create_table(
        "design_agent_sessions",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "owner_id",
            UUID(as_uuid=False),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("state_data", JSONB, nullable=False, server_default="{}"),
        sa.Column("active_step_id", sa.String(100), nullable=True),
        sa.Column(
            "completed_steps", ARRAY(sa.String), nullable=False, server_default="{}"
        ),
        sa.Column(
            "status",
            sa.Enum("active", "completed", "archived", name="design_session_status"),
            nullable=False,
            server_default="active",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_design_agent_sessions_owner_id", "design_agent_sessions", ["owner_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_design_agent_sessions_owner_id", table_name="design_agent_sessions")
    op.drop_table("design_agent_sessions")

    op.drop_index("ix_network_designs_owner_id", table_name="network_designs")
    op.drop_index("ix_network_designs_area_id", table_name="network_designs")
    op.drop_table("network_designs")

    op.drop_index("ix_venting_calculations_owner_id", table_name="venting_calculations")
    op.drop_index("ix_venting_calculations_area_id", table_name="venting_calculations")
    op.drop_table("venting_calculations")

    op.execute("DROP TYPE IF EXISTS design_session_status")
    op.execute("DROP TYPE IF EXISTS vent_calc_status")
