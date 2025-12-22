import pytest
from unittest.mock import AsyncMock, MagicMock
from apps.api.app.services.psv_data_service import PsvDataService

@pytest.mark.asyncio
async def test_get_psv_report_data():
    # Mock DAL
    dal = MagicMock()
    dal.get_protective_system_by_id = AsyncMock(return_value={
        "id": "psv-1", "tag": "PSV-101", "service": "LPG", "areaId": "area-1"
    })
    dal.get_scenarios_by_psv = AsyncMock(return_value=[
        {"id": "scen-1", "name": "Fire", "isGoverning": True, "fluidName": "LPG", "relievingRate": 5000}
    ])
    dal.get_sizing_cases_by_psv = AsyncMock(return_value=[
        {"id": "case-1", "requiredArea": 120.5, "selectedOrifice": "G", "ratedCapacity": 5500}
    ])
    
    # Hierarchy mocks
    dal.get_area_by_id = AsyncMock(return_value={"id": "area-1", "name": "Storage Tank Area", "unitId": "unit-1"})
    dal.get_unit_by_id = AsyncMock(return_value={"id": "unit-1", "name": "Utility Unit", "plantId": "plant-1"})
    dal.get_plant_by_id = AsyncMock(return_value={"id": "plant-1", "name": "LNG Terminal", "customerId": "cust-1"})
    dal.get_customer_by_id = AsyncMock(return_value={"id": "cust-1", "name": "Global Energy Co"})
    
    service = PsvDataService(dal)
    data = await service.get_psv_report_data("psv-1")
    
    assert data["psv"]["tag"] == "PSV-101"
    assert data["scenario"]["name"] == "Fire"
    assert data["results"]["required_area"] == 120.5
    assert data["hierarchy"]["customer"]["name"] == "Global Energy Co"
    assert data["hierarchy"]["plant"]["name"] == "LNG Terminal"
