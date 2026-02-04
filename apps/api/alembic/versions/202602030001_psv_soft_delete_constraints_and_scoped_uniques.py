"""PSV soft delete constraints and scoped uniqueness.

Revision ID: 202602030001
Revises: 07815bc9e262
Create Date: 2026-02-03

Adds:
- CHECK constraint to keep protective_systems.deleted_at and protective_systems.is_active consistent.
- Indexes for protective_systems (area_id, deleted_at) and equipment_links (FK columns).
- Scoped uniqueness constraints for hierarchy codes and tags.

This migration intentionally fails if duplicate scoped codes/tags exist; resolve duplicates before re-running.
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "202602030001"
down_revision: Union[str, None] = "07815bc9e262"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _assert_no_duplicates(connection: sa.Connection, sql: str, label: str) -> None:
    rows = list(connection.execute(sa.text(sql)).fetchall())
    if not rows:
        return
    sample = ", ".join(str(tuple(r)) for r in rows[:5])
    raise RuntimeError(f"Duplicate values found for {label}. Sample: {sample}")


def upgrade() -> None:
    connection = op.get_bind()

    connection.execute(
        sa.text(
            """
            UPDATE protective_systems
            SET is_active = (deleted_at IS NULL)
            WHERE is_active IS DISTINCT FROM (deleted_at IS NULL)
            """
        )
    )

    op.create_check_constraint(
        "ck_protective_systems_deleted_at_matches_is_active",
        "protective_systems",
        "(deleted_at IS NULL) = is_active",
    )

    op.create_index(
        "ix_protective_systems_area_id",
        "protective_systems",
        ["area_id"],
        unique=False,
    )
    op.create_index(
        "ix_protective_systems_deleted_at",
        "protective_systems",
        ["deleted_at"],
        unique=False,
    )

    _assert_no_duplicates(
        connection,
        "SELECT code FROM customers GROUP BY code HAVING COUNT(*) > 1",
        "customers.code",
    )
    _assert_no_duplicates(
        connection,
        """
        SELECT customer_id, code
        FROM plants
        GROUP BY customer_id, code
        HAVING COUNT(*) > 1
        """,
        "plants(customer_id, code)",
    )
    _assert_no_duplicates(
        connection,
        """
        SELECT plant_id, code
        FROM units
        GROUP BY plant_id, code
        HAVING COUNT(*) > 1
        """,
        "units(plant_id, code)",
    )
    _assert_no_duplicates(
        connection,
        """
        SELECT unit_id, code
        FROM areas
        GROUP BY unit_id, code
        HAVING COUNT(*) > 1
        """,
        "areas(unit_id, code)",
    )
    _assert_no_duplicates(
        connection,
        """
        SELECT area_id, code
        FROM projects
        GROUP BY area_id, code
        HAVING COUNT(*) > 1
        """,
        "projects(area_id, code)",
    )
    _assert_no_duplicates(
        connection,
        """
        SELECT area_id, tag
        FROM protective_systems
        GROUP BY area_id, tag
        HAVING COUNT(*) > 1
        """,
        "protective_systems(area_id, tag)",
    )
    _assert_no_duplicates(
        connection,
        """
        SELECT area_id, tag
        FROM equipment
        GROUP BY area_id, tag
        HAVING COUNT(*) > 1
        """,
        "equipment(area_id, tag)",
    )

    op.create_unique_constraint("uq_customers_code", "customers", ["code"])
    op.create_unique_constraint(
        "uq_plants_customer_id_code", "plants", ["customer_id", "code"]
    )
    op.create_unique_constraint("uq_units_plant_id_code", "units", ["plant_id", "code"])
    op.create_unique_constraint("uq_areas_unit_id_code", "areas", ["unit_id", "code"])
    op.create_unique_constraint("uq_projects_area_id_code", "projects", ["area_id", "code"])
    op.create_unique_constraint(
        "uq_protective_systems_area_id_tag", "protective_systems", ["area_id", "tag"]
    )
    op.create_unique_constraint(
        "uq_equipment_area_id_tag", "equipment", ["area_id", "tag"]
    )

    op.create_index(
        "ix_equipment_links_protective_system_id",
        "equipment_links",
        ["protective_system_id"],
        unique=False,
    )
    op.create_index(
        "ix_equipment_links_equipment_id",
        "equipment_links",
        ["equipment_id"],
        unique=False,
    )
    op.create_index(
        "ix_equipment_links_scenario_id",
        "equipment_links",
        ["scenario_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_equipment_links_scenario_id", table_name="equipment_links")
    op.drop_index("ix_equipment_links_equipment_id", table_name="equipment_links")
    op.drop_index("ix_equipment_links_protective_system_id", table_name="equipment_links")

    op.drop_constraint("uq_equipment_area_id_tag", "equipment", type_="unique")
    op.drop_constraint(
        "uq_protective_systems_area_id_tag", "protective_systems", type_="unique"
    )
    op.drop_constraint("uq_projects_area_id_code", "projects", type_="unique")
    op.drop_constraint("uq_areas_unit_id_code", "areas", type_="unique")
    op.drop_constraint("uq_units_plant_id_code", "units", type_="unique")
    op.drop_constraint("uq_plants_customer_id_code", "plants", type_="unique")
    op.drop_constraint("uq_customers_code", "customers", type_="unique")

    op.drop_index("ix_protective_systems_deleted_at", table_name="protective_systems")
    op.drop_index("ix_protective_systems_area_id", table_name="protective_systems")

    op.drop_constraint(
        "ck_protective_systems_deleted_at_matches_is_active",
        "protective_systems",
        type_="check",
    )
