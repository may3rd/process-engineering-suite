"""Mock data service - fallback when database is unavailable."""
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from uuid import uuid4

from .dal import DataAccessLayer

logger = logging.getLogger(__name__)


class MockService(DataAccessLayer):
    """Mock data implementation using JSON file.
    
    This service reads from mock_data.json and provides
    in-memory CRUD operations. Changes are NOT persisted.
    """
    
    def __init__(self) -> None:
        self._data: dict = {}
        self._load_mock_data()
    
    def _load_mock_data(self) -> None:
        """Load mock data from JSON file."""
        mock_path = Path(__file__).parent.parent.parent / "mock_data.json"
        
        if mock_path.exists():
            with open(mock_path, "r") as f:
                self._data = json.load(f)
            logger.info(f"Loaded mock data from {mock_path}")
        else:
            logger.warning(f"Mock data file not found: {mock_path}")
            # Initialize empty data structure
            self._data = {
                "users": [],
                "credentials": [],
                "customers": [],
                "plants": [],
                "units": [],
                "areas": [],
                "projects": [],
                "protectiveSystems": [],
                "scenarios": [],
                "sizingCases": [],
                "equipment": [],
                "equipmentLinks": [],
                "attachments": [],
                "comments": [],
                "todos": [],
            }
    
    # --- Users & Auth ---
    
    async def get_users(self) -> List[dict]:
        return self._data.get("users", [])
    
    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        for user in self._data.get("users", []):
            if user["id"] == user_id:
                return user
        return None
    
    async def get_user_by_email(self, email: str) -> Optional[dict]:
        for user in self._data.get("users", []):
            if user["email"] == email:
                return user
        return None
    
    async def get_credential_by_username(self, username: str) -> Optional[dict]:
        for cred in self._data.get("credentials", []):
            if cred["username"] == username:
                return cred
        return None
    
    async def update_credential_login(self, credential_id: str, success: bool) -> None:
        for cred in self._data.get("credentials", []):
            if cred["id"] == credential_id:
                if success:
                    cred["lastLogin"] = datetime.utcnow().isoformat()
                    cred["failedAttempts"] = 0
                else:
                    cred["failedAttempts"] = cred.get("failedAttempts", 0) + 1
                break
    
    # --- Hierarchy ---
    
    async def get_customers(self) -> List[dict]:
        return self._data.get("customers", [])
    
    async def get_plants_by_customer(self, customer_id: str) -> List[dict]:
        return [p for p in self._data.get("plants", []) if p["customerId"] == customer_id]
    
    async def get_units_by_plant(self, plant_id: str) -> List[dict]:
        return [u for u in self._data.get("units", []) if u["plantId"] == plant_id]
    
    async def get_areas_by_unit(self, unit_id: str) -> List[dict]:
        return [a for a in self._data.get("areas", []) if a["unitId"] == unit_id]
    
    async def get_projects_by_area(self, area_id: str) -> List[dict]:
        return [p for p in self._data.get("projects", []) if p["areaId"] == area_id]
    
    # --- Protective Systems (PSV) ---
    
    async def get_protective_systems(self, area_id: Optional[str] = None) -> List[dict]:
        psvs = self._data.get("protectiveSystems", [])
        if area_id:
            psvs = [p for p in psvs if p.get("areaId") == area_id]
        return psvs
    
    async def get_protective_system_by_id(self, psv_id: str) -> Optional[dict]:
        for psv in self._data.get("protectiveSystems", []):
            if psv["id"] == psv_id:
                return psv
        return None
    
    async def create_protective_system(self, data: dict) -> dict:
        data["id"] = str(uuid4())
        data["createdAt"] = datetime.utcnow().isoformat()
        data["updatedAt"] = datetime.utcnow().isoformat()
        self._data.setdefault("protectiveSystems", []).append(data)
        return data
    
    async def update_protective_system(self, psv_id: str, data: dict) -> dict:
        for i, psv in enumerate(self._data.get("protectiveSystems", [])):
            if psv["id"] == psv_id:
                data["id"] = psv_id
                data["updatedAt"] = datetime.utcnow().isoformat()
                self._data["protectiveSystems"][i] = {**psv, **data}
                return self._data["protectiveSystems"][i]
        raise ValueError(f"PSV not found: {psv_id}")
    
    async def delete_protective_system(self, psv_id: str) -> bool:
        psvs = self._data.get("protectiveSystems", [])
        for i, psv in enumerate(psvs):
            if psv["id"] == psv_id:
                psv["deletedAt"] = datetime.utcnow().isoformat()
                return True
        return False
    
    # --- Scenarios ---
    
    async def get_scenarios_by_psv(self, psv_id: str) -> List[dict]:
        return [s for s in self._data.get("scenarios", []) if s["protectiveSystemId"] == psv_id]
    
    async def create_scenario(self, data: dict) -> dict:
        data["id"] = str(uuid4())
        data["createdAt"] = datetime.utcnow().isoformat()
        data["updatedAt"] = datetime.utcnow().isoformat()
        self._data.setdefault("scenarios", []).append(data)
        return data
    
    async def update_scenario(self, scenario_id: str, data: dict) -> dict:
        for i, scenario in enumerate(self._data.get("scenarios", [])):
            if scenario["id"] == scenario_id:
                data["id"] = scenario_id
                data["updatedAt"] = datetime.utcnow().isoformat()
                self._data["scenarios"][i] = {**scenario, **data}
                return self._data["scenarios"][i]
        raise ValueError(f"Scenario not found: {scenario_id}")
    
    async def delete_scenario(self, scenario_id: str) -> bool:
        scenarios = self._data.get("scenarios", [])
        for i, scenario in enumerate(scenarios):
            if scenario["id"] == scenario_id:
                del scenarios[i]
                return True
        return False
    
    # --- Sizing Cases ---
    
    async def get_sizing_cases_by_psv(self, psv_id: str) -> List[dict]:
        return [s for s in self._data.get("sizingCases", []) if s["protectiveSystemId"] == psv_id]
    
    async def create_sizing_case(self, data: dict) -> dict:
        data["id"] = str(uuid4())
        data["createdAt"] = datetime.utcnow().isoformat()
        data["updatedAt"] = datetime.utcnow().isoformat()
        self._data.setdefault("sizingCases", []).append(data)
        return data
    
    async def update_sizing_case(self, case_id: str, data: dict) -> dict:
        for i, case in enumerate(self._data.get("sizingCases", [])):
            if case["id"] == case_id:
                data["id"] = case_id
                data["updatedAt"] = datetime.utcnow().isoformat()
                self._data["sizingCases"][i] = {**case, **data}
                return self._data["sizingCases"][i]
        raise ValueError(f"Sizing case not found: {case_id}")
    
    async def delete_sizing_case(self, case_id: str) -> bool:
        cases = self._data.get("sizingCases", [])
        for i, case in enumerate(cases):
            if case["id"] == case_id:
                del cases[i]
                return True
        return False
    
    # --- Equipment ---
    
    async def get_equipment(self, area_id: Optional[str] = None) -> List[dict]:
        equipment = self._data.get("equipment", [])
        if area_id:
            equipment = [e for e in equipment if e.get("areaId") == area_id]
        return equipment
    
    async def get_equipment_links_by_psv(self, psv_id: str) -> List[dict]:
        return [l for l in self._data.get("equipmentLinks", []) if l["protectiveSystemId"] == psv_id]

    async def create_equipment_link(self, data: dict) -> dict:
        data["id"] = str(uuid4())
        data["createdAt"] = datetime.utcnow().isoformat()
        self._data.setdefault("equipmentLinks", []).append(data)
        return data

    async def delete_equipment_link(self, link_id: str) -> bool:
        links = self._data.get("equipmentLinks", [])
        for i, link in enumerate(links):
            if link["id"] == link_id:
                del links[i]
                return True
        return False
    
    # --- Attachments ---
    
    async def get_attachments_by_psv(self, psv_id: str) -> List[dict]:
        return [a for a in self._data.get("attachments", []) if a["protectiveSystemId"] == psv_id]
    
    async def create_attachment(self, data: dict) -> dict:
        data["id"] = str(uuid4())
        data["createdAt"] = datetime.utcnow().isoformat()
        self._data.setdefault("attachments", []).append(data)
        return data
    
    async def delete_attachment(self, attachment_id: str) -> bool:
        attachments = self._data.get("attachments", [])
        for i, att in enumerate(attachments):
            if att["id"] == attachment_id:
                del attachments[i]
                return True
        return False
    
    # --- Comments ---
    
    async def get_comments_by_psv(self, psv_id: str) -> List[dict]:
        return [c for c in self._data.get("comments", []) if c["protectiveSystemId"] == psv_id]
    
    async def create_comment(self, data: dict) -> dict:
        data["id"] = str(uuid4())
        data["createdAt"] = datetime.utcnow().isoformat()
        data["updatedAt"] = datetime.utcnow().isoformat()
        self._data.setdefault("comments", []).append(data)
        return data

    async def update_comment(self, comment_id: str, data: dict) -> dict:
        comments = self._data.get("comments", [])
        for i, comment in enumerate(comments):
            if comment["id"] == comment_id:
                updated = {
                    **comment,
                    **data,
                    "updatedAt": datetime.utcnow().isoformat(),
                }
                comments[i] = updated
                return updated
        raise ValueError(f"Comment not found: {comment_id}")
    
    # --- Todos ---
    
    async def get_todos_by_psv(self, psv_id: str) -> List[dict]:
        return [t for t in self._data.get("todos", []) if t["protectiveSystemId"] == psv_id]
    
    async def create_todo(self, data: dict) -> dict:
        data["id"] = str(uuid4())
        data["createdAt"] = datetime.utcnow().isoformat()
        self._data.setdefault("todos", []).append(data)
        return data
    
    async def update_todo(self, todo_id: str, data: dict) -> dict:
        for i, todo in enumerate(self._data.get("todos", [])):
            if todo["id"] == todo_id:
                data["id"] = todo_id
                self._data["todos"][i] = {**todo, **data}
                return self._data["todos"][i]
        raise ValueError(f"Todo not found: {todo_id}")
