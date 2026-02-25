"""Venting calculation metadata and revision hydration tests."""

from __future__ import annotations

import pytest

from app.models import Area, Customer, Plant, Unit, User
from app.services.db_service import DatabaseService


async def _create_min_hierarchy(session) -> tuple[str, str]:
    user = User(name="Venting User", email="venting-owner@example.com")
    session.add(user)
    await session.commit()
    await session.refresh(user)

    customer = Customer(name="Customer", code="CUST-VENT", owner_id=user.id)
    session.add(customer)
    await session.commit()
    await session.refresh(customer)

    plant = Plant(customer_id=customer.id, name="Plant", code="PL-VENT", owner_id=user.id)
    session.add(plant)
    await session.commit()
    await session.refresh(plant)

    unit = Unit(plant_id=plant.id, name="Unit", code="U-VENT", owner_id=user.id)
    session.add(unit)
    await session.commit()
    await session.refresh(unit)

    area = Area(unit_id=unit.id, name="Area", code="A-VENT")
    session.add(area)
    await session.commit()
    await session.refresh(area)

    return area.id, user.id


@pytest.mark.asyncio
async def test_venting_calculation_metadata_and_revisions(db_session):
    area_id, owner_id = await _create_min_hierarchy(db_session)
    dal = DatabaseService(db_session)

    created = await dal.create_venting_calculation(
        {
            "name": "Tank T-100",
            "areaId": area_id,
            "ownerId": owner_id,
            "inputs": {"tankNumber": "T-100"},
            "results": {"summary": {"designOutbreathing": 123.4}},
            "apiEdition": "7TH",
            "calculationMetadata": {
                "projectNumber": "PRJ-001",
                "documentNumber": "DOC-001",
                "title": "Tank Venting Study",
                "projectName": "Expansion Project",
                "client": "ACME",
            },
            "revisionHistory": [
                {"rev": "O1", "by": "Alice", "byDate": "2026-02-01"},
                {"rev": "O2", "by": "Bob", "byDate": "2026-02-02"},
                {"rev": "F1", "by": "Carol", "byDate": "2026-02-03"},
                {"rev": "F2", "by": "Dave", "byDate": "2026-02-04"},
            ],
        }
    )

    assert created.calculation_metadata["projectNumber"] == "PRJ-001"
    assert len(created.revision_history) == 3
    assert created.revision_history[0]["rev"] == "F2"

    await dal.update_venting_calculation(
        created.id,
        {
            "revisionHistory": [
                {"rev": "O3", "by": "Eve", "byDate": "2026-02-05"},
                {"rev": "F3", "by": "Frank", "byDate": "2026-02-06"},
            ]
        },
    )

    hydrated = await dal.get_venting_calculation_by_id(created.id)
    assert hydrated is not None
    assert len(hydrated.revision_history) == 2
    assert hydrated.revision_history[0]["rev"] == "F3"
