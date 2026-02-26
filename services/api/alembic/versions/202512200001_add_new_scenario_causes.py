"""Add reflux and abnormal heat input scenario causes.

Revision ID: 202512200001
Revises: 202512180001
Create Date: 2025-12-20 10:00:00.000000
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "202512200001"
down_revision: Union[str, None] = "202512180001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NEW_VALUES = ("reflux_failure", "abnormal_heat_input")
OLD_VALUES = (
    "blocked_outlet",
    "fire_case",
    "external_fire",
    "tube_rupture",
    "thermal_expansion",
    "utility_failure",
    "control_valve_failure",
    "power_failure",
    "cooling_water_failure",
    "check_valve_failure",
    "other",
)


def upgrade() -> None:
    """Add new enum values for scenario_cause."""
    for value in NEW_VALUES:
        op.execute(f"ALTER TYPE scenario_cause ADD VALUE IF NOT EXISTS '{value}'")


def downgrade() -> None:
    """Revert scenario_cause enum to original values."""
    # Map any rows using the new enum values back to 'other' before shrinking the enum.
    op.execute(
        "UPDATE overpressure_scenarios SET cause = 'other' "
        "WHERE cause IN ('reflux_failure', 'abnormal_heat_input')"
    )

    # Recreate the enum with the original values.
    op.execute("ALTER TYPE scenario_cause RENAME TO scenario_cause_old")
    op.execute(
        "CREATE TYPE scenario_cause AS ENUM ('"
        + "', '".join(OLD_VALUES)
        + "')"
    )
    op.execute(
        "ALTER TABLE overpressure_scenarios ALTER COLUMN cause "
        "TYPE scenario_cause USING cause::text::scenario_cause"
    )
    op.execute("DROP TYPE scenario_cause_old")
