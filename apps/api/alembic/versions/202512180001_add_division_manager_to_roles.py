"""add_division_manager_to_roles

Revision ID: 202512180001
Revises: 443cfbcd5d71
Create Date: 2025-12-18 16:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '202512180001'
down_revision = '443cfbcd5d71'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Use op.execute to add the value to the enum type
    # op.execute("COMMIT") # Some Postgres versions require this for ALTER TYPE if run in a transaction
    op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'division_manager'")


def downgrade() -> None:
    # Removing a value from an enum is complex in Postgres and often not recommended.
    # We can leave it as is for downgrade or drop and recreate if necessary.
    pass
