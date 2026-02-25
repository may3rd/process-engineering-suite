"""Equipment subtype persistence and hydration tests."""

from __future__ import annotations

import pytest

from app.models import Area, Customer, EquipmentTank, EquipmentVessel, Plant, Unit, User
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


@pytest.mark.asyncio
async def test_equipment_tank_venting_fields_round_trip(db_session):
    area_id, owner_id = await _create_min_hierarchy(db_session)
    dal = DatabaseService(db_session)

    details = {
        "tankType": "vertical_cylindrical",
        "orientation": "vertical",
        "innerDiameter": 3200,
        "height": 12500,
        "insulated": True,
        "insulationThickness": 50,
        "latitude": 13.7563,
        "workingTemperature": 35.0,
        "workingTemperatureUnit": "C",
        "fluid": "Hexane",
        "vapourPressure": 18.5,
        "vapourPressureUnit": "kPa",
        "flashPoint": -22.0,
        "flashPointUnit": "C",
        "boilingPoint": 68.7,
        "boilingPointUnit": "C",
        "latentHeat": 334.9,
        "latentHeatUnit": "kJ/kg",
        "relievingTemperature": 15.6,
        "relievingTemperatureUnit": "C",
        "molecularWeight": 86.17,
        "tankConfiguration": "Bare Metal Tank (No Insulation)",
        "insulationConductivity": 0.04,
        "insideHeatTransferCoeff": 12.5,
        "insulatedSurfaceArea": 55.0,
    }

    equipment = await dal.create_equipment(
        {
            "areaId": area_id,
            "type": "tank",
            "tag": "T-100",
            "name": "Test Tank",
            "ownerId": owner_id,
            "details": details,
        }
    )

    stmt = select(EquipmentTank).where(EquipmentTank.equipment_id == equipment.id)
    result = await db_session.execute(stmt)
    row = result.scalar_one_or_none()
    assert row is not None
    assert float(row.latitude_deg) == pytest.approx(13.7563)
    assert row.working_temperature_unit == "C"
    assert row.fluid == "Hexane"
    assert float(row.vapour_pressure) == pytest.approx(18.5)
    assert float(row.molecular_weight_g_mol) == pytest.approx(86.17)
    assert row.tank_configuration == "Bare Metal Tank (No Insulation)"

    hydrated = equipment.details or {}
    assert hydrated.get("latitude") == pytest.approx(13.7563)
    assert hydrated.get("workingTemperature") == pytest.approx(35.0)
    assert hydrated.get("workingTemperatureUnit") == "C"
    assert hydrated.get("fluid") == "Hexane"
    assert hydrated.get("vapourPressure") == pytest.approx(18.5)
    assert hydrated.get("vapourPressureUnit") == "kPa"
    assert hydrated.get("flashPoint") == pytest.approx(-22.0)
    assert hydrated.get("boilingPoint") == pytest.approx(68.7)
    assert hydrated.get("latentHeat") == pytest.approx(334.9)
    assert hydrated.get("relievingTemperature") == pytest.approx(15.6)
    assert hydrated.get("molecularWeight") == pytest.approx(86.17)
    assert hydrated.get("tankConfiguration") == "Bare Metal Tank (No Insulation)"
    assert hydrated.get("insulationConductivity") == pytest.approx(0.04)
    assert hydrated.get("insideHeatTransferCoeff") == pytest.approx(12.5)
    assert hydrated.get("insulatedSurfaceArea") == pytest.approx(55.0)
