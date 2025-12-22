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
    
    inlet_network = {
        "segments": [
            {"description": "Inlet Line 1", "diameter": 80, "length": 5.0, "pressure_drop": 0.05, "mach_number": 0.15},
            {"description": "Inlet Elbow", "diameter": 80, "length": 0.5, "pressure_drop": 0.01, "mach_number": 0.15}
        ]
    }
    outlet_network = {
        "segments": [
            {"description": "Outlet Line 1", "diameter": 100, "length": 10.0, "pressure_drop": 0.5, "mach_number": 0.4}
        ]
    }
    
    service = ReportService()
    html_content = service.render_psv_report(
        psv=psv_data,
        scenario=scenario_data,
        results=results_data,
        hierarchy=hierarchy_data,
        project_name="Test Project",
        current_date="2025-12-22",
        inlet_network=inlet_network,
        outlet_network=outlet_network
    )
    
    assert "PSV-101" in html_content
    assert "External Fire" in html_content
    assert "120.5" in html_content
    assert "Inlet Line 1" in html_content
    assert "Outlet Line 1" in html_content
    assert "0.05" in html_content
