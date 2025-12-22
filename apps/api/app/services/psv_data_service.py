import logging
from typing import Optional, Any, Dict
from .dal import DataAccessLayer

logger = logging.getLogger(__name__)

class PsvDataService:
    """Service to aggregate PSV data for reports and other views."""
    
    def __init__(self, dal: DataAccessLayer):
        self.dal = dal

    async def get_psv_report_data(self, psv_id: str) -> Dict[str, Any]:
        """Aggregate all data needed for a professional PSV sizing report."""
        
        # 1. Fetch PSV
        psv = await self.dal.get_protective_system_by_id(psv_id)
        if not psv:
            raise ValueError(f"PSV with ID {psv_id} not found")
            
        # 2. Fetch Scenarios & Find Governing
        scenarios = await self.dal.get_scenarios_by_psv(psv_id)
        governing_scenario = next((s for s in scenarios if s.get("isGoverning")), None)
        
        # 3. Fetch Sizing Cases & Find Primary/Latest
        sizing_cases = await self.dal.get_sizing_cases_by_psv(psv_id)
        # For now, pick the first one or logic can be refined
        active_case = sizing_cases[0] if sizing_cases else {}
        
        # 4. Fetch Hierarchy (Traverse Up)
        area_id = psv.get("area_id") or psv.get("areaId")
        hierarchy = await self._fetch_hierarchy(area_id)
        
        # 5. Aggregate Results
        return {
            "psv": psv,
            "scenario": governing_scenario or {},
            "results": {
                "required_area": active_case.get("required_area") or active_case.get("requiredArea"),
                "selected_orifice": active_case.get("selected_orifice") or active_case.get("selectedOrifice"),
                "rated_capacity": active_case.get("rated_capacity") or active_case.get("ratedCapacity"),
                "sizing_case": active_case
            },
            "hierarchy": hierarchy,
            "project_name": hierarchy.get("project", {}).get("name") if hierarchy.get("project") else hierarchy.get("plant", {}).get("name"),
            "inlet_network": psv.get("inlet_network") or psv.get("inletNetwork"),
            "outlet_network": psv.get("outlet_network") or psv.get("outletNetwork")
        }

    async def _fetch_hierarchy(self, area_id: str) -> dict[str, Any]:
        """Fetch the full hierarchy path for a given area."""
        if not area_id:
            return {}
            
        area = await self.dal.get_area_by_id(area_id)
        if not area:
            return {}
            
        unit_id = area.get("unit_id") or area.get("unitId")
        unit = await self.dal.get_unit_by_id(unit_id) if unit_id else None
        
        plant_id = unit.get("plant_id") or unit.get("plantId") if unit else None
        plant = await self.dal.get_plant_by_id(plant_id) if plant_id else None
        
        customer_id = plant.get("customer_id") or plant.get("customerId") if plant else None
        customer = await self.dal.get_customer_by_id(customer_id) if customer_id else None
        
        return {
            "area": area,
            "unit": unit or {},
            "plant": plant or {},
            "customer": customer or {}
        }
