"""Unify equipment storage into engineering_objects.

Revision ID: 202603060002
Revises: 202603060001
Create Date: 2026-03-06 10:25:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '202603060002'
down_revision: Union[str, Sequence[str], None] = '202603060001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _drop_fk_for_column(table_name: str, column_name: str) -> None:
    bind = op.get_bind()
    result = bind.execute(
        sa.text(
            """
            SELECT con.conname
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
            JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
            WHERE con.contype = 'f'
              AND nsp.nspname = current_schema()
              AND rel.relname = :table_name
              AND att.attname = :column_name
            """
        ),
        {'table_name': table_name, 'column_name': column_name},
    )
    for (fk_name,) in result.fetchall():
        op.execute(sa.text(f'ALTER TABLE {table_name} DROP CONSTRAINT IF EXISTS "{fk_name}"'))


def upgrade() -> None:
    op.execute('ALTER TABLE engineering_objects ADD COLUMN IF NOT EXISTS area_id UUID')
    op.execute('ALTER TABLE engineering_objects ADD COLUMN IF NOT EXISTS owner_id UUID')
    op.execute('ALTER TABLE engineering_objects ADD COLUMN IF NOT EXISTS name VARCHAR(255)')
    op.execute('ALTER TABLE engineering_objects ADD COLUMN IF NOT EXISTS description TEXT')
    op.execute('ALTER TABLE engineering_objects ADD COLUMN IF NOT EXISTS design_pressure NUMERIC(10,2)')
    op.execute('ALTER TABLE engineering_objects ADD COLUMN IF NOT EXISTS design_pressure_unit VARCHAR(20)')
    op.execute('ALTER TABLE engineering_objects ADD COLUMN IF NOT EXISTS mawp NUMERIC(10,2)')
    op.execute('ALTER TABLE engineering_objects ADD COLUMN IF NOT EXISTS mawp_unit VARCHAR(20)')
    op.execute('ALTER TABLE engineering_objects ADD COLUMN IF NOT EXISTS design_temp NUMERIC(10,2)')
    op.execute('ALTER TABLE engineering_objects ADD COLUMN IF NOT EXISTS design_temp_unit VARCHAR(20)')
    op.execute('ALTER TABLE engineering_objects ADD COLUMN IF NOT EXISTS location_ref VARCHAR(255)')
    op.execute('ALTER TABLE engineering_objects ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true')
    op.execute('ALTER TABLE engineering_objects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ')

    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'fk_engineering_objects_area_id'
            ) THEN
                ALTER TABLE engineering_objects
                ADD CONSTRAINT fk_engineering_objects_area_id
                FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL;
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'fk_engineering_objects_owner_id'
            ) THEN
                ALTER TABLE engineering_objects
                ADD CONSTRAINT fk_engineering_objects_owner_id
                FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;
            END IF;
        END $$;
        """
    )

    op.execute(
        'CREATE INDEX IF NOT EXISTS ix_engineering_objects_area_id ON engineering_objects (area_id)'
    )
    op.execute(
        'CREATE INDEX IF NOT EXISTS ix_engineering_objects_owner_id ON engineering_objects (owner_id)'
    )

    op.execute(
        """
        INSERT INTO engineering_objects (
            uuid,
            tag,
            object_type,
            area_id,
            owner_id,
            name,
            description,
            design_pressure,
            design_pressure_unit,
            mawp,
            mawp_unit,
            design_temp,
            design_temp_unit,
            location_ref,
            status,
            is_active,
            properties
        )
        SELECT
            e.id::uuid,
            UPPER(e.tag),
            UPPER(e.type::text),
            e.area_id,
            e.owner_id,
            e.name,
            e.description,
            e.design_pressure,
            COALESCE(e.design_pressure_unit, 'barg'),
            e.mawp,
            COALESCE(e.mawp_unit, 'barg'),
            e.design_temp,
            COALESCE(e.design_temp_unit, 'C'),
            e.location_ref,
            e.status::text,
            e.is_active,
            jsonb_build_object('details', COALESCE(e.details, '{}'::jsonb))
        FROM equipment e
        ON CONFLICT (tag) DO UPDATE
        SET
            object_type = EXCLUDED.object_type,
            area_id = COALESCE(engineering_objects.area_id, EXCLUDED.area_id),
            owner_id = COALESCE(engineering_objects.owner_id, EXCLUDED.owner_id),
            name = COALESCE(engineering_objects.name, EXCLUDED.name),
            description = COALESCE(engineering_objects.description, EXCLUDED.description),
            design_pressure = COALESCE(engineering_objects.design_pressure, EXCLUDED.design_pressure),
            design_pressure_unit = COALESCE(engineering_objects.design_pressure_unit, EXCLUDED.design_pressure_unit),
            mawp = COALESCE(engineering_objects.mawp, EXCLUDED.mawp),
            mawp_unit = COALESCE(engineering_objects.mawp_unit, EXCLUDED.mawp_unit),
            design_temp = COALESCE(engineering_objects.design_temp, EXCLUDED.design_temp),
            design_temp_unit = COALESCE(engineering_objects.design_temp_unit, EXCLUDED.design_temp_unit),
            location_ref = COALESCE(engineering_objects.location_ref, EXCLUDED.location_ref),
            status = COALESCE(engineering_objects.status, EXCLUDED.status),
            is_active = engineering_objects.is_active AND EXCLUDED.is_active,
            properties = CASE
                WHEN engineering_objects.properties ? 'details' THEN engineering_objects.properties
                ELSE jsonb_set(
                    COALESCE(engineering_objects.properties, '{}'::jsonb),
                    '{details}',
                    COALESCE(EXCLUDED.properties->'details', '{}'::jsonb),
                    true
                )
            END
        """
    )

    _drop_fk_for_column('equipment_links', 'equipment_id')
    _drop_fk_for_column('venting_calculations', 'equipment_id')

    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'fk_equipment_links_equipment_id_engineering_objects'
            ) THEN
                ALTER TABLE equipment_links
                ADD CONSTRAINT fk_equipment_links_equipment_id_engineering_objects
                FOREIGN KEY (equipment_id) REFERENCES engineering_objects(uuid) ON DELETE CASCADE;
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'fk_venting_calculations_equipment_id_engineering_objects'
            ) THEN
                ALTER TABLE venting_calculations
                ADD CONSTRAINT fk_venting_calculations_equipment_id_engineering_objects
                FOREIGN KEY (equipment_id) REFERENCES engineering_objects(uuid) ON DELETE SET NULL;
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    _drop_fk_for_column('equipment_links', 'equipment_id')
    _drop_fk_for_column('venting_calculations', 'equipment_id')

    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'fk_equipment_links_equipment_id_equipment'
            ) THEN
                ALTER TABLE equipment_links
                ADD CONSTRAINT fk_equipment_links_equipment_id_equipment
                FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE;
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'fk_venting_calculations_equipment_id_equipment'
            ) THEN
                ALTER TABLE venting_calculations
                ADD CONSTRAINT fk_venting_calculations_equipment_id_equipment
                FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE SET NULL;
            END IF;
        END $$;
        """
    )

    op.execute('DROP INDEX IF EXISTS ix_engineering_objects_owner_id')
    op.execute('DROP INDEX IF EXISTS ix_engineering_objects_area_id')
    op.execute('ALTER TABLE engineering_objects DROP CONSTRAINT IF EXISTS fk_engineering_objects_owner_id')
    op.execute('ALTER TABLE engineering_objects DROP CONSTRAINT IF EXISTS fk_engineering_objects_area_id')
    op.execute('ALTER TABLE engineering_objects DROP COLUMN IF EXISTS deleted_at')
    op.execute('ALTER TABLE engineering_objects DROP COLUMN IF EXISTS is_active')
    op.execute('ALTER TABLE engineering_objects DROP COLUMN IF EXISTS location_ref')
    op.execute('ALTER TABLE engineering_objects DROP COLUMN IF EXISTS design_temp_unit')
    op.execute('ALTER TABLE engineering_objects DROP COLUMN IF EXISTS design_temp')
    op.execute('ALTER TABLE engineering_objects DROP COLUMN IF EXISTS mawp_unit')
    op.execute('ALTER TABLE engineering_objects DROP COLUMN IF EXISTS mawp')
    op.execute('ALTER TABLE engineering_objects DROP COLUMN IF EXISTS design_pressure_unit')
    op.execute('ALTER TABLE engineering_objects DROP COLUMN IF EXISTS design_pressure')
    op.execute('ALTER TABLE engineering_objects DROP COLUMN IF EXISTS description')
    op.execute('ALTER TABLE engineering_objects DROP COLUMN IF EXISTS name')
    op.execute('ALTER TABLE engineering_objects DROP COLUMN IF EXISTS owner_id')
    op.execute('ALTER TABLE engineering_objects DROP COLUMN IF EXISTS area_id')
