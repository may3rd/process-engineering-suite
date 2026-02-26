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
    # Create revision_history table
    op.create_table(
        "revision_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("entity_type", sa.String(32), nullable=False),  # 'protective_system', 'scenario', 'sizing_case'
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        
        # Revision info
        sa.Column("revision_code", sa.String(16), nullable=False),  # 'O1', 'A1', 'B1', etc.
        sa.Column("sequence", sa.Integer(), nullable=False),  # For ordering: 1, 2, 3...
        sa.Column("description", sa.Text(), nullable=True),  # Reason for revision
        
        # Lifecycle tracking
        sa.Column("originated_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("originated_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("checked_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("checked_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("approved_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("approved_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("issued_at", sa.TIMESTAMP(timezone=True), nullable=True),
        
        # Snapshot of entity state at this revision
        sa.Column("snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        
        # Timestamps
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        
        # Unique constraint
        sa.UniqueConstraint("entity_type", "entity_id", "revision_code", name="uq_revision_entity_code"),
    )
    
    # Create index for faster lookups
    op.create_index("ix_revision_history_entity", "revision_history", ["entity_type", "entity_id"])
    
    # Drop old revision_no columns (integer)
    op.drop_column("protective_systems", "revision_no")
    op.drop_column("overpressure_scenarios", "revision_no")
    
    # Add current_revision_id FK to entities
    op.add_column(
        "protective_systems",
        sa.Column("current_revision_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("revision_history.id"), nullable=True)
    )
    op.add_column(
        "overpressure_scenarios",
        sa.Column("current_revision_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("revision_history.id"), nullable=True)
    )
    op.add_column(
        "sizing_cases",
        sa.Column("current_revision_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("revision_history.id"), nullable=True)
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
