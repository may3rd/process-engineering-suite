"""Move engineering object design parameters to properties.design_parameters.

Revision ID: 202603060003
Revises: 202603060002
Create Date: 2026-03-06 10:45:00
"""

from typing import Sequence, Union

from alembic import op


revision: str = '202603060003'
down_revision: Union[str, Sequence[str], None] = '202603060002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE engineering_objects eo
        SET properties = jsonb_set(
            COALESCE(eo.properties, '{}'::jsonb),
            '{design_parameters}',
            COALESCE(eo.properties->'design_parameters', '{}'::jsonb) || jsonb_strip_nulls(
                jsonb_build_object(
                    'designPressure', eo.design_pressure,
                    'designPressureUnit', COALESCE(eo.design_pressure_unit, 'barg'),
                    'mawp', eo.mawp,
                    'mawpUnit', COALESCE(eo.mawp_unit, 'barg'),
                    'designTemperature', eo.design_temp,
                    'designTempUnit', COALESCE(eo.design_temp_unit, 'C')
                )
            ),
            true
        )
        WHERE eo.design_pressure IS NOT NULL
           OR eo.design_pressure_unit IS NOT NULL
           OR eo.mawp IS NOT NULL
           OR eo.mawp_unit IS NOT NULL
           OR eo.design_temp IS NOT NULL
           OR eo.design_temp_unit IS NOT NULL
        """
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_engineering_objects_properties_gin
        ON engineering_objects
        USING gin (properties)
        """
    )


def downgrade() -> None:
    op.execute('DROP INDEX IF EXISTS ix_engineering_objects_properties_gin')
