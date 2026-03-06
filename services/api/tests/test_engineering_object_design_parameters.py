"""Design parameter persistence in engineering_objects JSONB."""

from __future__ import annotations

from uuid import UUID

import pytest
from sqlalchemy import select

from app.models import Area, Customer, EngineeringObject, Plant, Unit, User
from app.services.db_service import DatabaseService


async def _create_min_hierarchy(session) -> tuple[str, str]:
    user = User(name='Design Param User', email='design-params@example.com')
    session.add(user)
    await session.commit()
    await session.refresh(user)

    customer = Customer(name='Customer', code='CUST-DP', owner_id=user.id)
    session.add(customer)
    await session.commit()
    await session.refresh(customer)

    plant = Plant(customer_id=customer.id, name='Plant', code='PL-DP', owner_id=user.id)
    session.add(plant)
    await session.commit()
    await session.refresh(plant)

    unit = Unit(plant_id=plant.id, name='Unit', code='U-DP', owner_id=user.id)
    session.add(unit)
    await session.commit()
    await session.refresh(unit)

    area = Area(unit_id=unit.id, name='Area', code='A-DP')
    session.add(area)
    await session.commit()
    await session.refresh(area)

    return area.id, user.id


@pytest.mark.asyncio
async def test_equipment_design_parameters_stored_in_properties(db_session):
    area_id, owner_id = await _create_min_hierarchy(db_session)
    dal = DatabaseService(db_session)

    created = await dal.create_equipment(
        {
            'areaId': area_id,
            'ownerId': owner_id,
            'type': 'tank',
            'tag': 'T-DP-001',
            'name': 'Design Param Tank',
            'designPressure': 1.2,
            'designPressureUnit': 'barg',
            'mawp': 1.6,
            'mawpUnit': 'barg',
            'designTemperature': 80,
            'designTempUnit': 'C',
            'details': {'tankType': 'vertical_cylindrical'},
        }
    )

    assert created['design_pressure'] == pytest.approx(1.2)
    assert created['design_pressure_unit'] == 'barg'
    assert created['mawp'] == pytest.approx(1.6)
    assert created['mawp_unit'] == 'barg'
    assert created['design_temp'] == pytest.approx(80)
    assert created['design_temp_unit'] == 'C'

    stmt = select(EngineeringObject).where(EngineeringObject.uuid == UUID(created['id']))
    result = await db_session.execute(stmt)
    row = result.scalar_one()

    design_parameters = (row.properties or {}).get('design_parameters', {})
    assert design_parameters.get('designPressure') == pytest.approx(1.2)
    assert design_parameters.get('designPressureUnit') == 'barg'
    assert design_parameters.get('mawp') == pytest.approx(1.6)
    assert design_parameters.get('mawpUnit') == 'barg'
    assert design_parameters.get('designTemperature') == pytest.approx(80)
    assert design_parameters.get('designTempUnit') == 'C'


@pytest.mark.asyncio
async def test_equipment_design_parameter_updates_round_trip(db_session):
    area_id, owner_id = await _create_min_hierarchy(db_session)
    dal = DatabaseService(db_session)

    created = await dal.create_equipment(
        {
            'areaId': area_id,
            'ownerId': owner_id,
            'type': 'vessel',
            'tag': 'V-DP-001',
            'name': 'Design Param Vessel',
            'designPressure': 5.0,
            'designTemperature': 120,
            'details': {'orientation': 'vertical'},
        }
    )

    updated = await dal.update_equipment(
        created['id'],
        {
            'designPressure': 6.5,
            'designTemperature': 140,
            'mawp': 7.0,
            'designTempUnit': 'C',
        },
    )

    assert updated['design_pressure'] == pytest.approx(6.5)
    assert updated['design_temp'] == pytest.approx(140)
    assert updated['mawp'] == pytest.approx(7.0)
    assert updated['design_temp_unit'] == 'C'

    fetched = await dal.get_equipment_by_id(created['id'])
    assert fetched is not None
    assert fetched['design_pressure'] == pytest.approx(6.5)
    assert fetched['design_temp'] == pytest.approx(140)
    assert fetched['mawp'] == pytest.approx(7.0)

    stmt = select(EngineeringObject).where(EngineeringObject.uuid == UUID(created['id']))
    result = await db_session.execute(stmt)
    row = result.scalar_one()
    design_parameters = (row.properties or {}).get('design_parameters', {})

    assert design_parameters.get('designPressure') == pytest.approx(6.5)
    assert design_parameters.get('designTemperature') == pytest.approx(140)
    assert design_parameters.get('mawp') == pytest.approx(7.0)
