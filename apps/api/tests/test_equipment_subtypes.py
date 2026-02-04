"""Equipment subtype persistence and hydration tests."""

from __future__ import annotations

import pytest

from app.models import Area, Customer, EquipmentVessel, Plant, Unit, User
from app.services.db_service import DatabaseService
from sqlalchemy import select


async def _create_min_hierarchy(session) -> tuple[str, str]:
    user = User(name="Test User", email="equipment-owner@example.com")
    session.add(user)
    await session.commit()
    await session.refresh(user)

    customer = Customer(name="Customer", code="CUST-EQ", owner_id=user.id)
    session.add(customer)
    await session.commit()
    await session.refresh(customer)

    plant = Plant(customer_id=customer.id, name="Plant", code="PL-EQ", owner_id=user.id)
    session.add(plant)
    await session.commit()
    await session.refresh(plant)

    unit = Unit(plant_id=plant.id, name="Unit", code="U-EQ", owner_id=user.id)
    session.add(unit)
    await session.commit()
    await session.refresh(unit)

    area = Area(unit_id=unit.id, name="Area", code="A-EQ")
    session.add(area)
    await session.commit()
    await session.refresh(area)

    return area.id, user.id


@pytest.mark.asyncio
async def test_equipment_vessel_details_round_trip(db_session):
    area_id, owner_id = await _create_min_hierarchy(db_session)
    dal = DatabaseService(db_session)

    details = {
        "orientation": "vertical",
        "innerDiameter": 1200,
        "tangentToTangentLength": 5000,
        "headType": "ellipsoidal",
        "insulated": True,
        "insulationType": "mineral_wool",
        "insulationThickness": 50,
        "normalLiquidLevel": 50,
        "wettedArea": 12.5,
        "extraKey": "extraValue",
    }

    equipment = await dal.create_equipment(
        {
            "areaId": area_id,
            "type": "vessel",
            "tag": "V-100",
            "name": "Test Vessel",
            "ownerId": owner_id,
            "details": details,
        }
    )

    stmt = select(EquipmentVessel).where(EquipmentVessel.equipment_id == equipment.id)
    result = await db_session.execute(stmt)
    row = result.scalar_one_or_none()
    assert row is not None
    assert row.orientation == "vertical"

    hydrated = equipment.details or {}
    assert hydrated.get("orientation") == "vertical"
    assert hydrated.get("innerDiameter") == 1200.0
    assert hydrated.get("tangentToTangentLength") == 5000.0
    assert hydrated.get("insulated") is True
    assert hydrated.get("extraKey") == "extraValue"

