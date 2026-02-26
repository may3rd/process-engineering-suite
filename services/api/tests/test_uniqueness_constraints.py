"""Scoped uniqueness constraint integration tests."""

from __future__ import annotations

import pytest
from sqlalchemy.exc import IntegrityError

from app.models import Area, Customer, Plant, Unit, User


@pytest.mark.asyncio
async def test_customers_code_unique(db_session):
    user = User(name="Test User", email="unique-user@example.com")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    db_session.add(Customer(name="Customer 1", code="CUST-X", owner_id=user.id))
    await db_session.commit()

    db_session.add(Customer(name="Customer 2", code="CUST-X", owner_id=user.id))
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()


@pytest.mark.asyncio
async def test_plants_code_unique_per_customer(db_session):
    user = User(name="Test User", email="plant-owner@example.com")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    customer = Customer(name="Customer", code="CUST-P", owner_id=user.id)
    db_session.add(customer)
    await db_session.commit()
    await db_session.refresh(customer)

    db_session.add(Plant(customer_id=customer.id, name="Plant 1", code="PLANT-X", owner_id=user.id))
    await db_session.commit()

    db_session.add(Plant(customer_id=customer.id, name="Plant 2", code="PLANT-X", owner_id=user.id))
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()


@pytest.mark.asyncio
async def test_areas_code_unique_per_unit(db_session):
    user = User(name="Test User", email="area-owner@example.com")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    customer = Customer(name="Customer", code="CUST-A", owner_id=user.id)
    db_session.add(customer)
    await db_session.commit()
    await db_session.refresh(customer)

    plant = Plant(customer_id=customer.id, name="Plant", code="PL-A", owner_id=user.id)
    db_session.add(plant)
    await db_session.commit()
    await db_session.refresh(plant)

    unit = Unit(plant_id=plant.id, name="Unit", code="U-A", owner_id=user.id)
    db_session.add(unit)
    await db_session.commit()
    await db_session.refresh(unit)

    db_session.add(Area(unit_id=unit.id, name="Area 1", code="A-X"))
    await db_session.commit()

    db_session.add(Area(unit_id=unit.id, name="Area 2", code="A-X"))
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()
