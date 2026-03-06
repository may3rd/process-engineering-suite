"""HTTP endpoint integration tests for engineering_objects."""

from __future__ import annotations

from uuid import UUID

import pytest
import sys
import types
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

pes_calc_module = types.ModuleType('pes_calc')
pes_calc_vessels_module = types.ModuleType('pes_calc.vessels')


class _DummyVessel:
    def __init__(self, *args, **kwargs):
        self.total_volume = 0.0
        self.total_height = 0.0

    def wetted_area(self, *_args, **_kwargs):
        return 0.0

    def liquid_volume(self, *_args, **_kwargs):
        return 0.0


for _name in [
    'HorizontalConicalVessel',
    'HorizontalEllipticalVessel',
    'HorizontalFlatVessel',
    'HorizontalHemisphericalVessel',
    'HorizontalTorisphericalVessel',
    'SphericalTank',
    'VerticalConicalVessel',
    'VerticalEllipticalVessel',
    'VerticalFlatVessel',
    'VerticalHemisphericalVessel',
    'VerticalTorisphericalVessel',
    'Vessel',
]:
    setattr(pes_calc_vessels_module, _name, _DummyVessel)

sys.modules.setdefault('pes_calc', pes_calc_module)
sys.modules.setdefault('pes_calc.vessels', pes_calc_vessels_module)

from app.models import Area, Customer, EngineeringObject, Plant, Unit, User  # noqa: E402
from app.routers.engineering_objects import router as engineering_objects_router  # noqa: E402


async def _create_min_hierarchy(session) -> tuple[str, str]:
    user = User(name='Engineering Object User', email='engineering-object-user@example.com')
    session.add(user)
    await session.commit()
    await session.refresh(user)

    customer = Customer(name='Customer', code='CUST-EO', owner_id=user.id)
    session.add(customer)
    await session.commit()
    await session.refresh(customer)

    plant = Plant(customer_id=customer.id, name='Plant', code='PL-EO', owner_id=user.id)
    session.add(plant)
    await session.commit()
    await session.refresh(plant)

    unit = Unit(plant_id=plant.id, name='Unit', code='U-EO', owner_id=user.id)
    session.add(unit)
    await session.commit()
    await session.refresh(unit)

    area = Area(unit_id=unit.id, name='Area', code='A-EO')
    session.add(area)
    await session.commit()
    await session.refresh(area)

    return area.id, user.id


@pytest.mark.asyncio
async def test_engineering_object_endpoint_persists_metadata_fields(db_session):
    area_id, owner_id = await _create_min_hierarchy(db_session)

    app = FastAPI()
    app.include_router(engineering_objects_router)

    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
        response = await client.put(
            '/engineering-objects/T-EO-001',
            json={
                'object_type': 'TANK',
                'area_id': area_id,
                'owner_id': owner_id,
                'name': 'Engineering Object Tank',
                'description': 'Metadata round-trip test',
                'location_ref': 'PLOT-01',
                'is_active': True,
                'status': 'active',
                'properties': {
                    'design_parameters': {'designPressure': 1.5, 'designPressureUnit': 'barg'},
                },
            },
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload['tag'] == 'T-EO-001'
        assert payload['area_id'] == area_id
        assert payload['owner_id'] == owner_id
        assert payload['name'] == 'Engineering Object Tank'
        assert payload['description'] == 'Metadata round-trip test'
        assert payload['location_ref'] == 'PLOT-01'
        assert payload['is_active'] is True

        stmt = select(EngineeringObject).where(EngineeringObject.uuid == UUID(payload['id']))
        result = await db_session.execute(stmt)
        row = result.scalar_one()

        assert row.area_id == area_id
        assert row.owner_id == owner_id
        assert row.name == 'Engineering Object Tank'
        assert row.description == 'Metadata round-trip test'
        assert row.location_ref == 'PLOT-01'
        assert row.is_active is True


@pytest.mark.asyncio
async def test_engineering_object_endpoint_excludes_inactive_rows_by_default(db_session):
    area_id, owner_id = await _create_min_hierarchy(db_session)

    app = FastAPI()
    app.include_router(engineering_objects_router)

    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
        active_response = await client.put(
            '/engineering-objects/V-EO-001',
            json={
                'object_type': 'VESSEL',
                'area_id': area_id,
                'owner_id': owner_id,
                'name': 'Active Vessel',
                'is_active': True,
                'status': 'active',
                'properties': {},
            },
        )
        assert active_response.status_code == 200

        inactive_response = await client.put(
            '/engineering-objects/V-EO-002',
            json={
                'object_type': 'VESSEL',
                'area_id': area_id,
                'owner_id': owner_id,
                'name': 'Inactive Vessel',
                'is_active': False,
                'status': 'inactive',
                'properties': {},
            },
        )
        assert inactive_response.status_code == 200

        default_list = await client.get('/engineering-objects?object_type=VESSEL')
        assert default_list.status_code == 200
        default_tags = {item['tag'] for item in default_list.json()}
        assert 'V-EO-001' in default_tags
        assert 'V-EO-002' not in default_tags

        full_list = await client.get('/engineering-objects?object_type=VESSEL&include_inactive=true')
        assert full_list.status_code == 200
        full_tags = {item['tag'] for item in full_list.json()}
        assert 'V-EO-001' in full_tags
        assert 'V-EO-002' in full_tags
