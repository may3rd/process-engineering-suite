"""Seed one minimum equipment_tank record when table is empty.

Revision ID: 202602250005
Revises: 202602250004
Create Date: 2026-02-25 16:20:00
"""

from typing import Sequence, Union

from alembic import op


revision: str = "202602250005"
down_revision: Union[str, Sequence[str], None] = "202602250004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


SEED_USER_ID = "9e9a6a26-2a29-4a11-8d63-5c12c2eab101"
SEED_CUSTOMER_ID = "6c5b33f8-6aa6-4fd3-8d35-4b18f4b77a11"
SEED_PLANT_ID = "d148d6f9-f79f-4467-9401-8c8a7f50ec11"
SEED_UNIT_ID = "5f5f8f37-1f1e-4f2c-bc4d-c53a3040a011"
SEED_AREA_ID = "8ad82626-6a64-4c03-8cb1-4e1f98ad7111"
SEED_EQUIPMENT_ID = "bb40cb96-1f9d-4f41-9b20-1290f8d48011"


def upgrade() -> None:
    op.execute(
        f"""
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'initials'
          ) THEN
            INSERT INTO users (id, name, initials, email, role, status, created_at, updated_at)
            SELECT '{SEED_USER_ID}', 'Seed User', 'SU', 'seed.user@engsuite.local', 'engineer', 'active', NOW(), NOW()
            WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = '{SEED_USER_ID}');
          ELSE
            INSERT INTO users (id, name, email, role, status, created_at, updated_at)
            SELECT '{SEED_USER_ID}', 'Seed User', 'seed.user@engsuite.local', 'engineer', 'active', NOW(), NOW()
            WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = '{SEED_USER_ID}');
          END IF;
        END$$;
        """
    )

    op.execute(
        f"""
        INSERT INTO customers (id, name, code, status, owner_id, created_at, updated_at)
        SELECT '{SEED_CUSTOMER_ID}', 'Seed Customer', 'SEED-CUST', 'active', '{SEED_USER_ID}', NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM customers WHERE id = '{SEED_CUSTOMER_ID}');
        """
    )

    op.execute(
        f"""
        INSERT INTO plants (id, customer_id, name, code, location, status, owner_id, created_at, updated_at)
        SELECT '{SEED_PLANT_ID}', '{SEED_CUSTOMER_ID}', 'Seed Plant', 'SEED-PLANT', 'Seed Location', 'active', '{SEED_USER_ID}', NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM plants WHERE id = '{SEED_PLANT_ID}');
        """
    )

    op.execute(
        f"""
        INSERT INTO units (id, plant_id, name, code, service, status, owner_id, created_at, updated_at)
        SELECT '{SEED_UNIT_ID}', '{SEED_PLANT_ID}', 'Seed Unit', 'SEED-UNIT', 'Storage', 'active', '{SEED_USER_ID}', NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM units WHERE id = '{SEED_UNIT_ID}');
        """
    )

    op.execute(
        f"""
        INSERT INTO areas (id, unit_id, name, code, status, created_at, updated_at)
        SELECT '{SEED_AREA_ID}', '{SEED_UNIT_ID}', 'Seed Area', 'SEED-AREA', 'active', NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM areas WHERE id = '{SEED_AREA_ID}');
        """
    )

    op.execute(
        f"""
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'equipment' AND column_name = 'design_pressure_unit'
          ) THEN
            INSERT INTO equipment (
              id, area_id, type, tag, name, description,
              design_pressure, design_pressure_unit, owner_id, is_active, status, details,
              created_at, updated_at
            )
            SELECT
              '{SEED_EQUIPMENT_ID}', '{SEED_AREA_ID}', 'tank', 'T-SEED-100', 'Seed Tank', 'Seeded tank for venting linkage test',
              0.10, 'barg', '{SEED_USER_ID}', true, 'active',
              jsonb_build_object(
                'tankType', 'vertical_cylindrical',
                'orientation', 'vertical',
                'innerDiameter', 3200,
                'height', 12500
              ),
              NOW(), NOW()
            WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE id = '{SEED_EQUIPMENT_ID}');
          ELSE
            INSERT INTO equipment (
              id, area_id, type, tag, name, description,
              design_pressure, owner_id, is_active, status, details,
              created_at, updated_at
            )
            SELECT
              '{SEED_EQUIPMENT_ID}', '{SEED_AREA_ID}', 'tank', 'T-SEED-100', 'Seed Tank', 'Seeded tank for venting linkage test',
              0.10, '{SEED_USER_ID}', true, 'active',
              jsonb_build_object(
                'tankType', 'vertical_cylindrical',
                'orientation', 'vertical',
                'innerDiameter', 3200,
                'height', 12500
              ),
              NOW(), NOW()
            WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE id = '{SEED_EQUIPMENT_ID}');
          END IF;
        END$$;
        """
    )

    op.execute(
        f"""
        INSERT INTO equipment_tanks (
          equipment_id, tank_type, orientation, inner_diameter_mm, height_mm,
          insulated, insulation_thickness_mm, latitude_deg,
          working_temperature, working_temperature_unit,
          vapour_pressure, vapour_pressure_unit
        )
        SELECT
          '{SEED_EQUIPMENT_ID}', 'vertical_cylindrical', 'vertical', 3200, 12500,
          false, NULL, 12.7,
          35.0, 'C',
          18.5, 'kPa'
        WHERE NOT EXISTS (SELECT 1 FROM equipment_tanks);
        """
    )


def downgrade() -> None:
    op.execute(
        f"DELETE FROM equipment_tanks WHERE equipment_id = '{SEED_EQUIPMENT_ID}';"
    )
    op.execute(
        f"DELETE FROM equipment WHERE id = '{SEED_EQUIPMENT_ID}';"
    )
    op.execute(
        f"DELETE FROM areas WHERE id = '{SEED_AREA_ID}';"
    )
    op.execute(
        f"DELETE FROM units WHERE id = '{SEED_UNIT_ID}';"
    )
    op.execute(
        f"DELETE FROM plants WHERE id = '{SEED_PLANT_ID}';"
    )
    op.execute(
        f"DELETE FROM customers WHERE id = '{SEED_CUSTOMER_ID}';"
    )
    op.execute(
        f"DELETE FROM users WHERE id = '{SEED_USER_ID}';"
    )
