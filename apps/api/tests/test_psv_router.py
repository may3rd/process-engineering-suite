import pytest
from fastapi.testclient import TestClient
from apps.api.main import app
from unittest.mock import AsyncMock, patch, MagicMock

client = TestClient(app)

@pytest.mark.asyncio
async def test_get_psv_report_endpoint():
    # Mock the services to avoid real DB/Mock dependencies during router test
    mock_data = {
        "psv": {"tag": "PSV-101", "service": "Test"},
        "scenario": {"name": "Fire", "fluid_name": "Water", "required_flow": 100},
        "results": {"required_area": 10, "selected_orifice": "D", "rated_capacity": 150},
        "hierarchy": {"customer": {"name": "Test Co"}},
        "project_name": "Test Project"
    }
    
    with patch("apps.api.app.routers.psv.PSV_DATA_SERVICE") as mock_data_service_dep:
        with patch("apps.api.app.routers.psv.REPORT_SERVICE") as mock_report_service_dep:
            # Note: FastAPI dependency overrides are usually done via app.dependency_overrides
            # but for a quick unit test we can patch where they are used if they are not complex.
            # Actually, let's use dependency_overrides for reliability.
            pass

    # Alternative: Use dependency_overrides
    from apps.api.app.dependencies import get_psv_data_service, get_report_service
    
    mock_psv_data_service = AsyncMock()
    mock_psv_data_service.get_psv_report_data.return_value = mock_data
    
    mock_report_service = MagicMock()
    mock_report_service.render_psv_report.return_value = "<html><body>Test Report</body></html>"
    import io
    mock_report_service.generate_pdf.return_value = io.BytesIO(b"%PDF-1.4 test")
    
    app.dependency_overrides[get_psv_data_service] = lambda: mock_psv_data_service
    app.dependency_overrides[get_report_service] = lambda: mock_report_service
    
    response = client.get("/psv/psv-1/report")
    
    app.dependency_overrides = {} # Clean up
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "attachment; filename=PSV_Report_PSV-101.pdf" in response.headers["content-disposition"]
    assert response.content.startswith(b"%PDF")
