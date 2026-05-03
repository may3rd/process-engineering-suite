"""Fix UUID FK type on EngineeringObject and add source_version_id FK.

Revision ID: 202605040001
Revises: 202603130001
Create Date: 2026-05-04 01:30:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '202605040001'
down_revision: Union[str, Sequence[str], None] = '202603130001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Issue 1: EngineeringObject.uuid was UUID(as_uuid=True), all other UUID FKs
    # in the codebase use UUID(as_uuid=False).  PostgreSQL's uuid column type is
    # the same regardless of the as_uuid flag (difference is Python-side only),
    # but making the PK annotation consistent with the FK annotations removes the
    # SQLAlchemy type-check mismatch that prevented the relationship from loading.
    op.alter_column(
        'engineering_objects',
        'uuid',
        type_=postgresql.UUID(as_uuid=False),
        existing_type=postgresql.UUID(as_uuid=True),
    )

    # Issue 2: CalculationVersion.source_version_id is a self-referential FK
    # but had no ForeignKey constraint.  Add it now (column already exists).
    op.create_foreign_key(
        'fk_calculation_versions_source_version_id',
        'calculation_versions',
        'calculation_versions',
        ['source_version_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint(
        'fk_calculation_versions_source_version_id',
        'calculation_versions',
        type_='foreignkey',
    )
    op.alter_column(
        'engineering_objects',
        'uuid',
        type_=postgresql.UUID(as_uuid=True),
        existing_type=postgresql.UUID(as_uuid=False),
    )
