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
                "notes": [],
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

    async def get_area_by_id(self, area_id: str) -> Optional[dict]:
        for area in self._data.get("areas", []):
            if area["id"] == area_id:
                return area
        return None

    async def get_unit_by_id(self, unit_id: str) -> Optional[dict]:
        for unit in self._data.get("units", []):
            if unit["id"] == unit_id:
                return unit
        return None

    async def get_plant_by_id(self, plant_id: str) -> Optional[dict]:
        for plant in self._data.get("plants", []):
            if plant["id"] == plant_id:
                return plant
        return None

    async def get_customer_by_id(self, customer_id: str) -> Optional[dict]:
        for customer in self._data.get("customers", []):
            if customer["id"] == customer_id:
                return customer
        return None
    
    # --- Protective Systems (PSV) ---
    
    async def get_protective_systems(
        self, area_id: Optional[str] = None, include_deleted: bool = False
    ) -> List[dict]:
        psvs = self._data.get("protectiveSystems", [])
        if area_id:
            psvs = [p for p in psvs if p.get("areaId") == area_id]
        if not include_deleted:
            psvs = [p for p in psvs if p.get("deletedAt") is None]
        return psvs
    
    async def get_protective_system_by_id(
        self, psv_id: str, include_deleted: bool = False
    ) -> Optional[dict]:
        for psv in self._data.get("protectiveSystems", []):
            if psv["id"] == psv_id:
                if not include_deleted and psv.get("deletedAt") is not None:
                    return None
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
                next_psv = {**psv, **data}

                # If currentRevisionId changes, derive PSV status from that revision's signatures.
                if "currentRevisionId" in data and next_psv.get("status") != "issued":
                    next_status = "draft"
                    current_rev_id = next_psv.get("currentRevisionId")
                    if current_rev_id:
                        rev = next((r for r in self._data.get("revisionHistory", []) if r.get("id") == current_rev_id), None)
                        if rev and rev.get("originatedBy"):
                            next_status = "in_review"
                            if rev.get("checkedBy"):
                                next_status = "checked"
                                if rev.get("approvedBy"):
                                    next_status = "approved"
                    next_psv["status"] = next_status

                self._data["protectiveSystems"][i] = next_psv
                return self._data["protectiveSystems"][i]
        raise ValueError(f"PSV not found: {psv_id}")
    
    async def delete_protective_system(self, psv_id: str) -> bool:
        psvs = self._data.get("protectiveSystems", [])
        for i, psv in enumerate(psvs):
            if psv["id"] == psv_id:
                psv["deletedAt"] = datetime.utcnow().isoformat()
                psv["isActive"] = False
                return True
        return False

    async def restore_protective_system(self, psv_id: str) -> dict:
        psv = await self.get_protective_system_by_id(psv_id, include_deleted=True)
        if not psv:
            raise ValueError("PSV not found")
        psv["deletedAt"] = None
        psv["isActive"] = True
        psv["updatedAt"] = datetime.utcnow().isoformat()
        return psv

    async def purge_protective_system(self, psv_id: str) -> bool:
        psvs = self._data.get("protectiveSystems", [])
        for i, psv in enumerate(psvs):
            if psv["id"] == psv_id:
                if psv.get("deletedAt") is None:
                    raise ValueError("PSV must be deleted before purge")
                del psvs[i]
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
    
    # --- Comments & Notes ---

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

    async def get_notes_by_psv(self, psv_id: str) -> List[dict]:
        return [n for n in self._data.get("notes", []) if n["protectiveSystemId"] == psv_id]

    async def create_note(self, data: dict) -> dict:
        data["id"] = str(uuid4())
        data["createdAt"] = datetime.utcnow().isoformat()
        data.setdefault("updatedAt", None)
        self._data.setdefault("notes", []).append(data)
        return data

    async def update_note(self, note_id: str, data: dict) -> dict:
        notes = self._data.get("notes", [])
        for i, note in enumerate(notes):
            if note["id"] == note_id:
                updated = {
                    **note,
                    **data,
                    "updatedAt": data.get("updatedAt") or datetime.utcnow().isoformat(),
                }
                notes[i] = updated
                return updated
        raise ValueError(f"Note not found: {note_id}")

    async def delete_note(self, note_id: str) -> bool:
        notes = self._data.get("notes", [])
        for i, note in enumerate(notes):
            if note["id"] == note_id:
                del notes[i]
                return True
        return False
    
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

    # --- Revision History ---

    async def get_revisions_by_entity(self, entity_type: str, entity_id: str) -> List[dict]:
        """Get revisions for an entity, ordered by originator signed date descending."""
        revisions = self._data.get("revisionHistory", [])
        filtered = [r for r in revisions if r["entityType"] == entity_type and r["entityId"] == entity_id]
        def sort_key(item: dict) -> tuple:
            # Primary: originatedAt (originator signed date), fallback: createdAt, then sequence.
            return (
                item.get("originatedAt") or "",
                item.get("createdAt") or "",
                item.get("sequence", 0),
            )
        return sorted(filtered, key=sort_key, reverse=True)

    async def get_revision_by_id(self, revision_id: str) -> Optional[dict]:
        for rev in self._data.get("revisionHistory", []):
            if rev["id"] == revision_id:
                return rev
        return None

    async def create_revision(self, data: dict) -> dict:
        data["id"] = str(uuid4())
        data["createdAt"] = datetime.utcnow().isoformat()
        self._data.setdefault("revisionHistory", []).append(data)
        return data

    async def update_revision(self, revision_id: str, data: dict) -> dict:
        for i, rev in enumerate(self._data.get("revisionHistory", [])):
            if rev["id"] == revision_id:
                next_rev = {**rev, **data}
                self._data["revisionHistory"][i] = next_rev

                # If this is the current revision of a PSV, derive PSV status.
                if next_rev.get("entityType") == "protective_system":
                    psv_id = next_rev.get("entityId")
                    if psv_id:
                        for j, psv in enumerate(self._data.get("protectiveSystems", [])):
                            if psv.get("id") == psv_id and psv.get("currentRevisionId") == revision_id and psv.get("status") != "issued":
                                next_status = "draft"
                                if next_rev.get("originatedBy"):
                                    next_status = "in_review"
                                    if next_rev.get("checkedBy"):
                                        next_status = "checked"
                                        if next_rev.get("approvedBy"):
                                            next_status = "approved"
                                self._data["protectiveSystems"][j] = {**psv, "status": next_status}
                                break

                return next_rev
        raise ValueError(f"Revision not found: {revision_id}")

    async def delete_revision(self, revision_id: str) -> bool:
        revisions = self._data.get("revisionHistory", [])
        for i, rev in enumerate(revisions):
            if rev.get("id") == revision_id:
                del revisions[i]
                # Clear currentRevisionId + set status draft for affected PSVs (unless issued).
                for j, psv in enumerate(self._data.get("protectiveSystems", [])):
                    if psv.get("currentRevisionId") == revision_id:
                        next = {**psv, "currentRevisionId": None}
                        if next.get("status") != "issued":
                            next["status"] = "draft"
                        self._data["protectiveSystems"][j] = next
                return True
        return False

    # --- Equipment CRUD (abstract methods) ---

    async def create_equipment(self, data: dict) -> dict:
        data["id"] = str(uuid4())
        data["createdAt"] = datetime.utcnow().isoformat()
        self._data.setdefault("equipment", []).append(data)
        return data

    async def update_equipment(self, equipment_id: str, data: dict) -> dict:
        for i, eq in enumerate(self._data.get("equipment", [])):
            if eq["id"] == equipment_id:
                self._data["equipment"][i] = {**eq, **data}
                return self._data["equipment"][i]
        raise ValueError(f"Equipment not found: {equipment_id}")

    async def delete_equipment(self, equipment_id: str) -> bool:
        equipment = self._data.get("equipment", [])
        for i, eq in enumerate(equipment):
            if eq["id"] == equipment_id:
                del equipment[i]
                return True
        return False

    # --- Audit Logs (mock in-memory) ---
    
    async def get_audit_logs(self, filters: dict, limit: int, offset: int) -> tuple[list, int]:
        """Get audit logs with filters, returns (logs, total_count)."""
        logs = self._data.get("auditLogs", [])
        
        # Apply filters
        if filters.get("entity_type"):
            logs = [l for l in logs if l.get("entityType") == filters["entity_type"]]
        if filters.get("entity_id"):
            logs = [l for l in logs if l.get("entityId") == filters["entity_id"]]
        if filters.get("user_id"):
            logs = [l for l in logs if l.get("userId") == filters["user_id"]]
        if filters.get("project_id"):
            logs = [l for l in logs if l.get("projectId") == filters["project_id"]]
        if filters.get("action"):
            logs = [l for l in logs if l.get("action") == filters["action"]]
        
        total = len(logs)
        # Sort by createdAt descending
        logs = sorted(logs, key=lambda x: x.get("createdAt", ""), reverse=True)
        return logs[offset:offset + limit], total
    
    async def get_audit_log_by_id(self, log_id: str) -> Optional[dict]:
        """Get a single audit log by ID."""
        for log in self._data.get("auditLogs", []):
            if log.get("id") == log_id:
                return log
        return None
    
    async def create_audit_log(self, data: dict) -> dict:
        """Create a new audit log entry."""
        log = {
            "id": str(uuid4()),
            "action": data.get("action"),
            "entityType": data.get("entityType"),
            "entityId": data.get("entityId"),
            "entityName": data.get("entityName"),
            "userId": data.get("userId"),
            "userName": data.get("userName"),
            "userRole": data.get("userRole"),
            "changes": data.get("changes"),
            "description": data.get("description"),
            "projectId": data.get("projectId"),
            "projectName": data.get("projectName"),
            "createdAt": datetime.utcnow().isoformat(),
        }
        self._data.setdefault("auditLogs", []).insert(0, log)
        return log
    
    async def clear_audit_logs(self) -> int:
        """Clear all audit logs. Returns count of deleted logs."""
        count = len(self._data.get("auditLogs", []))
        self._data["auditLogs"] = []
        return count
