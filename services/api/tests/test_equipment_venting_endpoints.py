"""HTTP endpoint integration tests for equipment and venting flows."""

from __future__ import annotations

from uuid import UUID

import sys
import types

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

import pytest  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy import select  # noqa: E402

from app.dependencies import get_dal  # noqa: E402
from app.models import Area, Customer, EngineeringObject, Plant, Unit, User  # noqa: E402
from app.routers.supporting import router as supporting_router  # noqa: E402
from app.routers.venting import router as venting_router  # noqa: E402
from app.services.db_service import DatabaseService  # noqa: E402


async def _create_min_hierarchy(session) -> tuple[str, str]:
    user = User(name='Endpoint User', email='endpoint-user@example.com')
    session.add(user)
    await session.commit()
    await session.refresh(user)

    customer = Customer(name='Customer', code='CUST-EP', owner_id=user.id)
    session.add(customer)
    await session.commit()
    await session.refresh(customer)

    plant = Plant(customer_id=customer.id, name='Plant', code='PL-EP', owner_id=user.id)
    session.add(plant)
    await session.commit()
    await session.refresh(plant)

    unit = Unit(plant_id=plant.id, name='Unit', code='U-EP', owner_id=user.id)
    session.add(unit)
    await session.commit()
    await session.refresh(unit)

    area = Area(unit_id=unit.id, name='Area', code='A-EP')
    session.add(area)
    await session.commit()
    await session.refresh(area)

    return area.id, user.id


@pytest.mark.asyncio
async def test_equipment_endpoint_persists_design_parameters_in_json(db_session):
    area_id, owner_id = await _create_min_hierarchy(db_session)

    app = FastAPI()
    app.include_router(supporting_router)

    async def override_dal():
        return DatabaseService(db_session)

    app.dependency_overrides[get_dal] = override_dal

    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
        response = await client.post(
            '/legacy/equipment',
            json={
                'areaId': area_id,
                'ownerId': owner_id,
                'type': 'tank',
                'tag': 'T-EP-001',
                'name': 'Endpoint Tank',
                'designPressure': 2.4,
                'designPressureUnit': 'barg',
                'mawp': 2.8,
                'mawpUnit': 'barg',
                'designTemperature': 95,
                'designTempUnit': 'C',
                'details': {'tankType': 'vertical_cylindrical'},
            },
        )

        assert response.status_code == 200
        assert (
            response.headers.get('x-pes-deprecated')
            == '/equipment root is deprecated; use /engineering-objects or /legacy/equipment during transition'
        )
        payload = response.json()
        assert payload['designPressure'] == pytest.approx(2.4)
        assert payload['designPressureUnit'] == 'barg'
        assert payload['mawp'] == pytest.approx(2.8)
        assert payload['designTemperature'] == pytest.approx(95)

        row_stmt = select(EngineeringObject).where(EngineeringObject.uuid == UUID(payload['id']))
        row_result = await db_session.execute(row_stmt)
        row = row_result.scalar_one()

        design_parameters = (row.properties or {}).get('design_parameters', {})
        assert design_parameters.get('designPressure') == pytest.approx(2.4)
        assert design_parameters.get('designPressureUnit') == 'barg'
        assert design_parameters.get('mawp') == pytest.approx(2.8)
        assert design_parameters.get('mawpUnit') == 'barg'
        assert design_parameters.get('designTemperature') == pytest.approx(95)
        assert design_parameters.get('designTempUnit') == 'C'


@pytest.mark.asyncio
async def test_venting_endpoint_filters_by_equipment_engineering_object_id(db_session):
    area_id, owner_id = await _create_min_hierarchy(db_session)

    app = FastAPI()
    app.include_router(supporting_router)
    app.include_router(venting_router)

    async def override_dal():
        return DatabaseService(db_session)

    app.dependency_overrides[get_dal] = override_dal

    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
        equipment_resp = await client.post(
            '/legacy/equipment',
            json={
                'areaId': area_id,
                'ownerId': owner_id,
                'type': 'vessel',
                'tag': 'V-EP-001',
                'name': 'Endpoint Vessel',
                'designPressure': 9.1,
                'designTemperature': 210,
                'details': {'orientation': 'vertical'},
            },
        )
        assert equipment_resp.status_code == 200
        assert (
            equipment_resp.headers.get('x-pes-deprecated')
            == '/equipment root is deprecated; use /engineering-objects or /legacy/equipment during transition'
        )
        equipment_id = equipment_resp.json()['id']

        read_equipment = await client.get(f'/legacy/equipment/{equipment_id}')
        assert read_equipment.status_code == 200
        assert (
            read_equipment.headers.get('x-pes-deprecated')
            == '/equipment root is deprecated; use /engineering-objects or /legacy/equipment during transition'
        )

        root_alias = await client.get(f'/equipment/{equipment_id}')
        assert root_alias.status_code == 200
        assert root_alias.json()['id'] == equipment_id

        create_venting = await client.post(
            '/venting',
            json={
                'name': 'Endpoint venting calc',
                'areaId': area_id,
                'ownerId': owner_id,
                'equipmentId': equipment_id,
                'inputs': {'foo': 'bar'},
            },
        )
        assert create_venting.status_code == 201
        assert create_venting.json()['equipmentId'] == equipment_id

        list_resp = await client.get(f'/venting?equipmentId={equipment_id}')
        assert list_resp.status_code == 200
        items = list_resp.json()
        assert len(items) == 1
        assert items[0]['equipmentId'] == equipment_id
        assert items[0]['name'] == 'Endpoint venting calc'
