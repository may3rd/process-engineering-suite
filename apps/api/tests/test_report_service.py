import pytest
from apps.api.app.services.report_service import ReportService

def test_render_psv_report():
    # Mock data
    psv_data = {
        "tag": "PSV-101",
        "service": "LPG Storage",
        "manufacturer": "Crosby",
        "model": "JOS-E"
    }
    scenario_data = {
        "name": "External Fire",
        "fluid_name": "LPG",
        "required_flow": 5000.0
    }
    results_data = {
        "required_area": 120.5,
        "selected_orifice": "G",
        "rated_capacity": 5500.0
    }
    
    service = ReportService()
    html_content = service.render_psv_report(
        psv=psv_data,
        scenario=scenario_data,
        results=results_data,
        project_name="Test Project",
        current_date="2025-12-22"
    )
    
    assert "PSV-101" in html_content
    assert "External Fire" in html_content
    assert "120.5" in html_content
    assert "Process Engineering Suite" in html_content
