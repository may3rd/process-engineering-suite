"""Abstract Data Access Layer interface."""
from abc import ABC, abstractmethod
from typing import List, Optional


class DataAccessLayer(ABC):
    """Abstract base class for data access.
    
    This defines the interface that both DatabaseService and MockService must implement.
    The application uses this interface, allowing seamless switching between
    PostgreSQL and mock data.
    """
    
    # --- Users & Auth ---
    
    @abstractmethod
    async def get_users(self) -> List[dict]:
        """Get all users."""
        pass
    
    @abstractmethod
    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """Get user by ID."""
        pass
    
    @abstractmethod
    async def get_user_by_email(self, email: str) -> Optional[dict]:
        """Get user by email."""
        pass
    
    @abstractmethod
    async def get_credential_by_username(self, username: str) -> Optional[dict]:
        """Get credential by username for authentication."""
        pass
    
    @abstractmethod
    async def update_credential_login(self, credential_id: str, success: bool) -> None:
        """Update credential after login attempt."""
        pass
    
    # --- Hierarchy ---
    
    @abstractmethod
    async def get_customers(self) -> List[dict]:
        """Get all customers."""
        pass
    
    @abstractmethod
    async def get_plants_by_customer(self, customer_id: str) -> List[dict]:
        """Get plants for a customer."""
        pass
    
    @abstractmethod
    async def get_units_by_plant(self, plant_id: str) -> List[dict]:
        """Get units for a plant."""
        pass
    
    @abstractmethod
    async def get_areas_by_unit(self, unit_id: str) -> List[dict]:
        """Get areas for a unit."""
        pass
    
    @abstractmethod
    async def get_projects_by_area(self, area_id: str) -> List[dict]:
        """Get projects for an area."""
        pass

    @abstractmethod
    async def get_area_by_id(self, area_id: str) -> Optional[dict]:
        """Get area by ID."""
        pass

    @abstractmethod
    async def get_unit_by_id(self, unit_id: str) -> Optional[dict]:
        """Get unit by ID."""
        pass

    @abstractmethod
    async def get_plant_by_id(self, plant_id: str) -> Optional[dict]:
        """Get plant by ID."""
        pass

    @abstractmethod
    async def get_customer_by_id(self, customer_id: str) -> Optional[dict]:
        """Get customer by ID."""
        pass
    
    # --- Protective Systems (PSV) ---
    
    @abstractmethod
    async def get_protective_systems(self, area_id: Optional[str] = None) -> List[dict]:
        """Get all protective systems, optionally filtered by area."""
        pass
    
    @abstractmethod
    async def get_protective_system_by_id(self, psv_id: str) -> Optional[dict]:
        """Get protective system by ID with all relations."""
        pass
    
    @abstractmethod
    async def create_protective_system(self, data: dict) -> dict:
        """Create a new protective system."""
        pass
    
    @abstractmethod
    async def update_protective_system(self, psv_id: str, data: dict) -> dict:
        """Update a protective system."""
        pass
    
    @abstractmethod
    async def delete_protective_system(self, psv_id: str) -> bool:
        """Soft delete a protective system."""
        pass
    
    # --- Scenarios ---
    
    @abstractmethod
    async def get_scenarios_by_psv(self, psv_id: str) -> List[dict]:
        """Get scenarios for a protective system."""
        pass
    
    @abstractmethod
    async def create_scenario(self, data: dict) -> dict:
        """Create a new scenario."""
        pass
    
    @abstractmethod
    async def update_scenario(self, scenario_id: str, data: dict) -> dict:
        """Update a scenario."""
        pass
    
    @abstractmethod
    async def delete_scenario(self, scenario_id: str) -> bool:
        """Delete a scenario."""
        pass
    
    # --- Sizing Cases ---
    
    @abstractmethod
    async def get_sizing_cases_by_psv(self, psv_id: str) -> List[dict]:
        """Get sizing cases for a protective system."""
        pass
    
    @abstractmethod
    async def create_sizing_case(self, data: dict) -> dict:
        """Create a new sizing case."""
        pass
    
    @abstractmethod
    async def update_sizing_case(self, case_id: str, data: dict) -> dict:
        """Update a sizing case."""
        pass
    
    @abstractmethod
    async def delete_sizing_case(self, case_id: str) -> bool:
        """Delete a sizing case."""
        pass
    
    # --- Equipment ---
    
    @abstractmethod
    async def get_equipment(self, area_id: Optional[str] = None) -> List[dict]:
        """Get all equipment, optionally filtered by area."""
        pass
    
    @abstractmethod
    async def get_equipment_links_by_psv(self, psv_id: str) -> List[dict]:
        """Get equipment links for a protective system."""
        pass

    @abstractmethod
    async def create_equipment_link(self, data: dict) -> dict:
        """Create a new equipment link."""
        pass

    @abstractmethod
    async def delete_equipment_link(self, link_id: str) -> bool:
        """Delete an equipment link."""
        pass
    
    @abstractmethod
    async def create_equipment(self, data: dict) -> dict:
        """Create a new equipment."""
        pass
    
    @abstractmethod
    async def update_equipment(self, equipment_id: str, data: dict) -> dict:
        """Update an equipment."""
        pass
    
    @abstractmethod
    async def delete_equipment(self, equipment_id: str) -> bool:
        """Delete an equipment."""
        pass
    
    # --- Attachments ---
    
    @abstractmethod
    async def get_attachments_by_psv(self, psv_id: str) -> List[dict]:
        """Get attachments for a protective system."""
        pass
    
    @abstractmethod
    async def create_attachment(self, data: dict) -> dict:
        """Create a new attachment."""
        pass
    
    @abstractmethod
    async def delete_attachment(self, attachment_id: str) -> bool:
        """Delete an attachment."""
        pass

    # --- Notes ---

    @abstractmethod
    async def get_notes_by_psv(self, psv_id: str) -> List[dict]:
        """Get notes for a protective system."""
        pass

    @abstractmethod
    async def create_note(self, data: dict) -> dict:
        """Create a new note."""
        pass

    @abstractmethod
    async def update_note(self, note_id: str, data: dict) -> dict:
        """Update a note."""
        pass

    @abstractmethod
    async def delete_note(self, note_id: str) -> bool:
        """Delete a note."""
        pass
    
    # --- Comments ---
    
    @abstractmethod
    async def get_comments_by_psv(self, psv_id: str) -> List[dict]:
        """Get comments for a protective system."""
        pass
    
    @abstractmethod
    async def create_comment(self, data: dict) -> dict:
        """Create a new comment."""
        pass

    @abstractmethod
    async def update_comment(self, comment_id: str, data: dict) -> dict:
        """Update an existing comment."""
        pass
    
    # --- Todos ---
    
    @abstractmethod
    async def get_todos_by_psv(self, psv_id: str) -> List[dict]:
        """Get todos for a protective system."""
        pass
    
    @abstractmethod
    async def create_todo(self, data: dict) -> dict:
        """Create a new todo."""
        pass
    
    @abstractmethod
    async def update_todo(self, todo_id: str, data: dict) -> dict:
        """Update a todo."""
        pass
    
    # --- Revision History ---
    
    @abstractmethod
    async def get_revisions_by_entity(self, entity_type: str, entity_id: str) -> List[dict]:
        """Get revisions for an entity (PSV, scenario, sizing case)."""
        pass
    
    @abstractmethod
    async def get_revision_by_id(self, revision_id: str) -> Optional[dict]:
        """Get a single revision by ID."""
        pass
    
    @abstractmethod
    async def create_revision(self, data: dict) -> dict:
        """Create a new revision."""
        pass
    
    @abstractmethod
    async def update_revision(self, revision_id: str, data: dict) -> dict:
        """Update a revision (lifecycle fields)."""
        pass

    @abstractmethod
    async def delete_revision(self, revision_id: str) -> bool:
        """Delete a revision."""
        pass

    # --- Audit Logs ---
    
    @abstractmethod
    async def get_audit_logs(self, filters: dict, limit: int, offset: int) -> tuple[List[dict], int]:
        """Get audit logs with filters, returns (logs, total_count)."""
        pass
    
    @abstractmethod
    async def get_audit_log_by_id(self, log_id: str) -> Optional[dict]:
        """Get a single audit log by ID."""
        pass
    
    @abstractmethod
    async def create_audit_log(self, data: dict) -> dict:
        """Create a new audit log entry."""
        pass
    
    @abstractmethod
    async def clear_audit_logs(self) -> int:
        """Clear all audit logs. Returns count of deleted logs."""
        pass
