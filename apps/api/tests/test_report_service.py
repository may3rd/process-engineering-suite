import pytest
from apps.api.app.services.report_service import ReportService

def test_render_psv_report():
    # Mock data
    psv_data = {
        "tag": "PSV-101",
        "service": "LPG Storage",
        "manufacturer": "Crosby",
        "model": "JOS-E",
        "set_pressure": 10.5,
        "status": "approved"
    }
    scenario_data = {
        "name": "External Fire",
        "fluid_name": "LPG",
        "relieving_rate": 5000.0,
        "relieving_temp": 45.0,
        "relieving_pressure": 11.55,
        "phase": "gas",
        "accumulation_pct": 21.0,
        "assumptions": ["Fire duration 2h", "No pool fire"],
        "case_consideration": "Standard fire case analysis applied."
    }
    results_data = {
        "required_area": 120.5,
        "selected_orifice": "G",
        "rated_capacity": 5500.0,
        "sizing_case": {
            "standard": "API-520",
            "method": "gas",
            "status": "calculated",
            "outputs": {
                "Kd": 0.975,
                "Kb": 1.0,
                "Kc": 1.0
            }
        }
    }
    hierarchy_data = {
        "customer": {"name": "Global Energy"},
        "plant": {"name": "Refinery A"},
        "unit": {"name": "Unit 100"},
        "area": {"name": "Tank Farm"}
    }
    
    service = ReportService()
    html_content = service.render_psv_report(
        psv=psv_data,
        scenario=scenario_data,
        results=results_data,
        hierarchy=hierarchy_data,
        project_name="Test Project",
        current_date="2025-12-22"
    )
    
    assert "PSV-101" in html_content
    assert "External Fire" in html_content
    assert "120.5" in html_content
    assert "Global Energy" in html_content
    assert "Refinery A" in html_content
    assert "Fire duration 2h" in html_content
