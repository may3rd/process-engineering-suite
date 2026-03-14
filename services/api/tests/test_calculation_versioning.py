from __future__ import annotations

import importlib
import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.models import Area, Customer, Plant, Unit, User
from app.services.db_service import DatabaseService


async def _create_min_hierarchy(session) -> tuple[str, str]:
    user = User(name='Calculation User', email='calculation-owner@example.com')
    session.add(user)
    await session.commit()
    await session.refresh(user)

    customer = Customer(name='Customer', code='CUST-CALC', owner_id=user.id)
    session.add(customer)
    await session.commit()
    await session.refresh(customer)

    plant = Plant(customer_id=customer.id, name='Plant', code='PL-CALC', owner_id=user.id)
    session.add(plant)
    await session.commit()
    await session.refresh(plant)

    unit = Unit(plant_id=plant.id, name='Unit', code='U-CALC', owner_id=user.id)
    session.add(unit)
    await session.commit()
    await session.refresh(unit)

    area = Area(unit_id=unit.id, name='Area', code='A-CALC')
    session.add(area)
    await session.commit()
    await session.refresh(area)

    return area.id, user.id


def _make_app(db_session) -> FastAPI:
    app = FastAPI()
    try:
        calculations_module = importlib.import_module('app.routers.calculations')
        dependencies_module = importlib.import_module('app.dependencies')
    except ModuleNotFoundError:
        return app

    app.include_router(calculations_module.router)
    app.dependency_overrides[dependencies_module.get_dal] = lambda: DatabaseService(db_session)
    return app


def _payload(area_id: str, owner_id: str) -> dict:
    return {
        'app': 'pump-calculation',
        'areaId': area_id,
        'ownerId': owner_id,
        'name': 'P-101 base case',
        'description': 'Normal operating case',
        'status': 'draft',
        'inputs': {
            'tag': 'P-101',
            'flowDesign': 100,
            'showOrifice': True,
            'orificePipeId': 50,
            'orificeBeta': 0.5,
        },
        'results': {'differentialHead': 12.3},
        'metadata': {
            'projectNumber': 'PRJ-001',
            'documentNumber': 'DOC-001',
            'title': 'Pump Study',
            'projectName': 'Expansion',
            'client': 'ACME',
        },
        'revisionHistory': [
            {'rev': '0', 'by': 'EE', 'checkedBy': 'CE', 'approvedBy': 'LEAD', 'byDate': '2026-03-13'},
        ],
        'linkedEquipmentId': 'pump-123',
        'linkedEquipmentTag': 'P-101',
    }


@pytest.mark.asyncio
async def test_create_calculation_starts_version_history(db_session):
    area_id, owner_id = await _create_min_hierarchy(db_session)
    app = _make_app(db_session)

    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
        response = await client.post('/calculations', json=_payload(area_id, owner_id))

        assert response.status_code == 201
        created = response.json()
        assert created['app'] == 'pump-calculation'
        assert created['latestVersionNo'] == 1
        assert created['inputs']['orificePipeId'] == 50

        versions_response = await client.get(f"/calculations/{created['id']}/versions")
        assert versions_response.status_code == 200
        versions = versions_response.json()
        assert len(versions) == 1
        assert versions[0]['versionNo'] == 1
        assert versions[0]['versionKind'] == 'save'
        assert versions[0]['inputs']['orificePipeId'] == 50


@pytest.mark.asyncio
async def test_update_creates_new_version_and_preserves_previous_snapshot(db_session):
    area_id, owner_id = await _create_min_hierarchy(db_session)
    app = _make_app(db_session)

    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
        created_response = await client.post('/calculations', json=_payload(area_id, owner_id))
        assert created_response.status_code == 201
        created = created_response.json()

        update_response = await client.patch(
            f"/calculations/{created['id']}",
            json={
                'name': 'P-101 revised case',
                'inputs': {
                    'tag': 'P-101',
                    'flowDesign': 120,
                    'showOrifice': True,
                    'orificePipeId': 80,
                    'orificeBeta': 0.65,
                },
                'results': {'differentialHead': 18.1},
            },
        )

        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated['latestVersionNo'] == 2
        assert updated['inputs']['orificePipeId'] == 80

        versions_response = await client.get(f"/calculations/{created['id']}/versions")
        assert versions_response.status_code == 200
        versions = versions_response.json()
        assert [version['versionNo'] for version in versions] == [2, 1]
        assert versions[0]['inputs']['orificePipeId'] == 80
        assert versions[1]['inputs']['orificePipeId'] == 50


@pytest.mark.asyncio
async def test_restore_creates_new_latest_version_from_history(db_session):
    area_id, owner_id = await _create_min_hierarchy(db_session)
    app = _make_app(db_session)

    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
        created_response = await client.post('/calculations', json=_payload(area_id, owner_id))
        assert created_response.status_code == 201
        created = created_response.json()

        update_response = await client.patch(
            f"/calculations/{created['id']}",
            json={
                'inputs': {
                    'tag': 'P-101',
                    'flowDesign': 130,
                    'showOrifice': False,
                },
                'results': {'differentialHead': 20.5},
            },
        )
        assert update_response.status_code == 200

        versions_response = await client.get(f"/calculations/{created['id']}/versions")
        assert versions_response.status_code == 200
        versions = versions_response.json()
        original_version = versions[-1]

        restore_response = await client.post(
            f"/calculations/{created['id']}/restore",
            json={'versionId': original_version['id']},
        )

        assert restore_response.status_code == 200
        restored = restore_response.json()
        assert restored['latestVersionNo'] == 3
        assert restored['inputs']['showOrifice'] is True
        assert restored['inputs']['orificePipeId'] == 50

        versions_after_restore = await client.get(f"/calculations/{created['id']}/versions")
        assert versions_after_restore.status_code == 200
        payload = versions_after_restore.json()
        assert [version['versionNo'] for version in payload] == [3, 2, 1]
        assert payload[0]['versionKind'] == 'restore'
        assert payload[0]['sourceVersionId'] == original_version['id']


@pytest.mark.asyncio
async def test_soft_delete_hides_default_listing_but_preserves_history(db_session):
    area_id, owner_id = await _create_min_hierarchy(db_session)
    app = _make_app(db_session)

    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
        created_response = await client.post('/calculations', json=_payload(area_id, owner_id))
        assert created_response.status_code == 201
        created = created_response.json()

        delete_response = await client.delete(f"/calculations/{created['id']}")
        assert delete_response.status_code == 200

        default_list = await client.get('/calculations')
        assert default_list.status_code == 200
        assert [item['id'] for item in default_list.json()] == []

        deleted_list = await client.get('/calculations?includeInactive=true')
        assert deleted_list.status_code == 200
        assert [item['id'] for item in deleted_list.json()] == [created['id']]
        assert deleted_list.json()[0]['isActive'] is False

        versions_response = await client.get(f"/calculations/{created['id']}/versions")
        assert versions_response.status_code == 200
        assert len(versions_response.json()) == 1
