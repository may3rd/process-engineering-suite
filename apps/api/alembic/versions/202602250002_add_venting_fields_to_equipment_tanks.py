"""Add venting linkage fields to equipment_tanks.

Revision ID: 202602250002
Revises: 202602250001
Create Date: 2026-02-25 12:45:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "202602250002"
down_revision: Union[str, Sequence[str], None] = "202602250001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("equipment_tanks", sa.Column("latitude_deg", sa.Numeric(), nullable=True))
    op.add_column("equipment_tanks", sa.Column("working_temperature", sa.Numeric(), nullable=True))
    op.add_column("equipment_tanks", sa.Column("working_temperature_unit", sa.Text(), nullable=True))
    op.add_column("equipment_tanks", sa.Column("fluid", sa.Text(), nullable=True))
    op.add_column("equipment_tanks", sa.Column("vapour_pressure", sa.Numeric(), nullable=True))
    op.add_column("equipment_tanks", sa.Column("vapour_pressure_unit", sa.Text(), nullable=True))
    op.add_column("equipment_tanks", sa.Column("flash_point", sa.Numeric(), nullable=True))
    op.add_column("equipment_tanks", sa.Column("flash_point_unit", sa.Text(), nullable=True))
    op.add_column("equipment_tanks", sa.Column("boiling_point", sa.Numeric(), nullable=True))
    op.add_column("equipment_tanks", sa.Column("boiling_point_unit", sa.Text(), nullable=True))
    op.add_column("equipment_tanks", sa.Column("latent_heat", sa.Numeric(), nullable=True))
    op.add_column("equipment_tanks", sa.Column("latent_heat_unit", sa.Text(), nullable=True))
    op.add_column("equipment_tanks", sa.Column("relieving_temp", sa.Numeric(), nullable=True))
    op.add_column("equipment_tanks", sa.Column("relieving_temp_unit", sa.Text(), nullable=True))
    op.add_column("equipment_tanks", sa.Column("molecular_weight_g_mol", sa.Numeric(), nullable=True))
    op.add_column("equipment_tanks", sa.Column("tank_configuration", sa.Text(), nullable=True))
    op.add_column("equipment_tanks", sa.Column("insulation_conductivity_w_mk", sa.Numeric(), nullable=True))
    op.add_column("equipment_tanks", sa.Column("inside_heat_transfer_coeff_w_m2k", sa.Numeric(), nullable=True))
    op.add_column("equipment_tanks", sa.Column("insulated_surface_area_m2", sa.Numeric(), nullable=True))


def downgrade() -> None:
    op.drop_column("equipment_tanks", "insulated_surface_area_m2")
    op.drop_column("equipment_tanks", "inside_heat_transfer_coeff_w_m2k")
    op.drop_column("equipment_tanks", "insulation_conductivity_w_mk")
    op.drop_column("equipment_tanks", "tank_configuration")
    op.drop_column("equipment_tanks", "molecular_weight_g_mol")
    op.drop_column("equipment_tanks", "relieving_temp_unit")
    op.drop_column("equipment_tanks", "relieving_temp")
    op.drop_column("equipment_tanks", "latent_heat_unit")
    op.drop_column("equipment_tanks", "latent_heat")
    op.drop_column("equipment_tanks", "boiling_point_unit")
    op.drop_column("equipment_tanks", "boiling_point")
    op.drop_column("equipment_tanks", "flash_point_unit")
    op.drop_column("equipment_tanks", "flash_point")
    op.drop_column("equipment_tanks", "vapour_pressure_unit")
    op.drop_column("equipment_tanks", "vapour_pressure")
    op.drop_column("equipment_tanks", "fluid")
    op.drop_column("equipment_tanks", "working_temperature_unit")
    op.drop_column("equipment_tanks", "working_temperature")
    op.drop_column("equipment_tanks", "latitude_deg")
