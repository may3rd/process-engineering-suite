"""ProtectiveSystem soft delete/restore/purge integration tests."""

from __future__ import annotations

import pytest
from sqlalchemy.exc import IntegrityError

from app.models import Area, Customer, Plant, Unit, User
from app.services.db_service import DatabaseService


async def _create_min_hierarchy(session) -> tuple[str, str]:
    user = User(name="Test User", email="test@example.com")
    session.add(user)
    await session.commit()
    await session.refresh(user)

    customer = Customer(name="Customer", code="CUST-1", owner_id=user.id)
    session.add(customer)
    await session.commit()
    await session.refresh(customer)

    plant = Plant(customer_id=customer.id, name="Plant", code="PL-1", owner_id=user.id)
    session.add(plant)
    await session.commit()
    await session.refresh(plant)

    unit = Unit(plant_id=plant.id, name="Unit", code="U-1", owner_id=user.id)
    session.add(unit)
    await session.commit()
    await session.refresh(unit)

    area = Area(unit_id=unit.id, name="Area", code="A-1")
    session.add(area)
    await session.commit()
    await session.refresh(area)

    return area.id, user.id


@pytest.mark.asyncio
async def test_psv_soft_delete_restore_and_purge(db_session):
    area_id, owner_id = await _create_min_hierarchy(db_session)
    dal = DatabaseService(db_session)

    created = await dal.create_protective_system(
        {
            "areaId": area_id,
            "name": "PSV 100",
            "tag": "PSV-100",
            "type": "psv",
            "designCode": "API-520",
            "serviceFluid": "Air",
            "fluidPhase": "gas",
            "setPressure": 10.0,
            "mawp": 12.0,
            "ownerId": owner_id,
            "tags": [],
        }
    )

    visible = await dal.get_protective_systems(area_id)
    assert [p.id for p in visible] == [created.id]

    deleted_ok = await dal.delete_protective_system(created.id)
    assert deleted_ok is True

    visible_after_delete = await dal.get_protective_systems(area_id)
    assert visible_after_delete == []

    visible_including_deleted = await dal.get_protective_systems(area_id, include_deleted=True)
    assert [p.id for p in visible_including_deleted] == [created.id]

    by_id_hidden = await dal.get_protective_system_by_id(created.id)
    assert by_id_hidden is None

    by_id_visible = await dal.get_protective_system_by_id(created.id, include_deleted=True)
    assert by_id_visible is not None

    restored = await dal.restore_protective_system(created.id)
    assert restored.deleted_at is None

    visible_after_restore = await dal.get_protective_systems(area_id)
    assert [p.id for p in visible_after_restore] == [created.id]

    await dal.delete_protective_system(created.id)

    with pytest.raises(IntegrityError):
        await dal.create_protective_system(
            {
                "areaId": area_id,
                "name": "PSV 100 Duplicate",
                "tag": "PSV-100",
                "type": "psv",
                "designCode": "API-520",
                "serviceFluid": "Air",
                "fluidPhase": "gas",
                "setPressure": 10.0,
                "mawp": 12.0,
                "ownerId": owner_id,
                "tags": [],
            }
        )
    await db_session.rollback()

    purged = await dal.purge_protective_system(created.id)
    assert purged is True

    recreated = await dal.create_protective_system(
        {
            "areaId": area_id,
            "name": "PSV 100 Recreated",
            "tag": "PSV-100",
            "type": "psv",
            "designCode": "API-520",
            "serviceFluid": "Air",
            "fluidPhase": "gas",
            "setPressure": 10.0,
            "mawp": 12.0,
            "ownerId": owner_id,
            "tags": [],
        }
    )
    assert recreated.id != created.id
