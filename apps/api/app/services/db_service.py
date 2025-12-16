"""Database implementation of DataAccessLayer using SQLAlchemy."""
import logging
from typing import List, Optional, Any, Type, TypeVar
from datetime import datetime, date
from dateutil import parser as dateutil_parser

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, case
from sqlalchemy.sql import nullslast
from sqlalchemy.orm import selectinload

from ..models import (
    User, Credential, Customer, Plant, Unit, Area, Project,
    ProtectiveSystem, OverpressureScenario, SizingCase,
    Equipment, EquipmentLink, Attachment, Comment, Todo,
    ProjectNote, RevisionHistory,
)
from .dal import DataAccessLayer

logger = logging.getLogger(__name__)

T = TypeVar("T")

class DatabaseService(DataAccessLayer):
    """PostgreSQL implementation of DataAccessLayer."""

    def __init__(self, session: AsyncSession):
        self.session = session

    # --- Generic Helpers ---

    async def _get_all(self, model: Type[T], *filters) -> List[T]:
        stmt = select(model).where(*filters)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def _get_by_id(self, model: Type[T], id: str, options=None) -> Optional[T]:
        stmt = select(model).where(model.id == id)
        if options:
            stmt = stmt.options(*options)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def _create(self, model: Type[T], data: dict) -> T:
        instance = model(**data)
        self.session.add(instance)
        await self.session.commit()
        await self.session.refresh(instance)
        return instance

    async def _update(self, model: Type[T], id: str, data: dict) -> T:
        stmt = update(model).where(model.id == id).values(**data).returning(model)
        result = await self.session.execute(stmt)
        instance = result.scalar_one()
        await self.session.commit()
        return instance

    async def _delete(self, model: Type[T], id: str) -> bool:
        stmt = delete(model).where(model.id == id)
        result = await self.session.execute(stmt)
        await self.session.commit()
        return result.rowcount > 0

    # --- Users & Auth ---

    async def get_users(self) -> List[dict]:
        return await self._get_all(User)

    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        return await self._get_by_id(User, user_id)

    async def get_user_by_email(self, email: str) -> Optional[dict]:
        stmt = select(User).where(User.email == email)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_credential_by_username(self, username: str) -> Optional[dict]:
        stmt = select(Credential).where(Credential.username == username)
        result = await self.session.execute(stmt)
        cred = result.scalar_one_or_none()
        # Ensure 'user' relation is loaded if needed, or join
        # But credential usually just needs hash + user_id
        return cred

    async def update_credential_login(self, credential_id: str, success: bool) -> None:
        data = {"last_login_at": datetime.utcnow()} if success else {}
        # We might track failed attempts too if model supports it
        if data:
            await self._update(Credential, credential_id, data)

    # --- Hierarchy ---

    async def get_customers(self) -> List[dict]:
        return await self._get_all(Customer)

    async def get_plants_by_customer(self, customer_id: str) -> List[dict]:
        return await self._get_all(Plant, Plant.customer_id == customer_id)

    async def get_units_by_plant(self, plant_id: str) -> List[dict]:
        return await self._get_all(Unit, Unit.plant_id == plant_id)

    async def get_areas_by_unit(self, unit_id: str) -> List[dict]:
        return await self._get_all(Area, Area.unit_id == unit_id)

    async def get_projects_by_area(self, area_id: str) -> List[dict]:
        return await self._get_all(Project, Project.area_id == area_id)

    async def create_customer(self, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._create(Customer, converted_data)

    async def update_customer(self, id: str, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._update(Customer, id, converted_data)

    async def delete_customer(self, id: str) -> bool:
        return await self._delete(Customer, id)

    async def create_plant(self, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._create(Plant, converted_data)

    async def update_plant(self, id: str, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._update(Plant, id, converted_data)

    async def delete_plant(self, id: str) -> bool:
        return await self._delete(Plant, id)

    async def create_unit(self, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._create(Unit, converted_data)

    async def update_unit(self, id: str, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._update(Unit, id, converted_data)

    async def delete_unit(self, id: str) -> bool:
        return await self._delete(Unit, id)

    async def create_area(self, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._create(Area, converted_data)

    async def update_area(self, id: str, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._update(Area, id, converted_data)

    async def delete_area(self, id: str) -> bool:
        return await self._delete(Area, id)

    async def create_project(self, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._create(Project, converted_data)

    async def update_project(self, id: str, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._update(Project, id, converted_data)

    async def delete_project(self, id: str) -> bool:
        return await self._delete(Project, id)

    # --- Protective Systems (PSV) ---

    async def get_protective_systems(self, area_id: Optional[str] = None) -> List[dict]:
        filters = []
        if area_id:
            filters.append(ProtectiveSystem.area_id == area_id)
        
        # Eager load projects for 'projectIds' property
        stmt = select(ProtectiveSystem).where(*filters).options(
            selectinload(ProtectiveSystem.projects)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_protective_system_by_id(self, psv_id: str) -> Optional[dict]:
        # Eager load projects
        return await self._get_by_id(
            ProtectiveSystem, 
            psv_id, 
            options=[selectinload(ProtectiveSystem.projects)]
        )

    async def create_protective_system(self, data: dict) -> dict:
        # Convert camelCase keys to snake_case for ORM
        converted_data = self._convert_keys(data)
        
        # Remove fields that are relationships or properties
        project_ids = converted_data.pop('projectIds', None) or converted_data.pop('project_ids', None)
        clean_data = {k: v for k, v in converted_data.items() if k not in ['projects']}
        
        instance = ProtectiveSystem(**clean_data)
        
        # Handle project links
        if project_ids:
            stmt = select(Project).where(Project.id.in_(project_ids))
            result = await self.session.execute(stmt)
            instance.projects = list(result.scalars().all())
            
        self.session.add(instance)
        await self.session.commit()
        
        # Refresh to ensure timestamps and scalar columns have latest values
        await self.session.refresh(instance)
        # Ensure projects relationship stays loaded
        await self.session.refresh(instance, attribute_names=['projects'])
        return instance

    async def update_protective_system(self, psv_id: str, data: dict) -> dict:
        # Convert camelCase keys to snake_case for ORM
        converted_data = self._convert_keys(data)
        
        project_ids = converted_data.pop('projectIds', None) or converted_data.pop('project_ids', None)
        clean_data = {k: v for k, v in converted_data.items() if k not in ['projects']}
        
        # Load instance with projects relationship
        instance = await self._get_by_id(
            ProtectiveSystem, 
            psv_id, 
            options=[selectinload(ProtectiveSystem.projects)]
        )
        if not instance:
            raise ValueError(f"PSV {psv_id} not found")
        
        # Update scalar fields directly on instance
        for key, value in clean_data.items():
            if hasattr(instance, key):
                setattr(instance, key, value)

        # If current revision changes, derive PSV status from that revision's signatures.
        if "current_revision_id" in clean_data:
            if instance.status != "issued":
                next_status = "draft"
                if instance.current_revision_id:
                    rev = await self._get_by_id(RevisionHistory, instance.current_revision_id)
                    if rev:
                        if rev.originated_by:
                            next_status = "in_review"
                            if rev.checked_by:
                                next_status = "checked"
                                if rev.approved_by:
                                    next_status = "approved"
                        else:
                            next_status = "draft"
                instance.status = next_status
        
        # Update project links if provided
        if project_ids is not None:
            stmt = select(Project).where(Project.id.in_(project_ids))
            result = await self.session.execute(stmt)
            instance.projects = list(result.scalars().all())
        
        await self.session.commit()
        await self.session.refresh(instance)
        await self.session.refresh(instance, attribute_names=['projects'])
        return instance

    async def delete_protective_system(self, psv_id: str) -> bool:
        return await self._delete(ProtectiveSystem, psv_id)

    # --- Scenarios ---

    async def get_scenarios_by_psv(self, psv_id: str) -> List[dict]:
        return await self._get_all(OverpressureScenario, OverpressureScenario.protective_system_id == psv_id)

    async def create_scenario(self, data: dict) -> dict:
        # Map camelCase to snake_case if needed? 
        # Models use snake_case attributes. 
        # Pydantic dump usually matches unless aliased.
        # Assuming DataAccessLayer receives correct field names (snake_case) or standard dict
        # The routers call data.model_dump(). If models use camelCase alias but field names are standard...
        # Wait, Pydantic models in routers define fields like `protectiveSystemId`.
        # ORM expects `protective_system_id`.
        # I need to convert keys!
        
        converted_data = self._convert_keys(data)
        return await self._create(OverpressureScenario, converted_data)

    async def update_scenario(self, scenario_id: str, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._update(OverpressureScenario, scenario_id, converted_data)

    async def delete_scenario(self, scenario_id: str) -> bool:
        return await self._delete(OverpressureScenario, scenario_id)

    # --- Sizing Cases ---

    async def get_sizing_cases_by_psv(self, psv_id: str) -> List[dict]:
        return await self._get_all(SizingCase, SizingCase.protective_system_id == psv_id)

    async def create_sizing_case(self, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._create(SizingCase, converted_data)

    async def update_sizing_case(self, case_id: str, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._update(SizingCase, case_id, converted_data)

    async def delete_sizing_case(self, case_id: str) -> bool:
        return await self._delete(SizingCase, case_id)

    # --- Equipment ---

    async def get_equipment(self, area_id: Optional[str] = None) -> List[dict]:
        filters = []
        if area_id:
            filters.append(Equipment.area_id == area_id)
        return await self._get_all(Equipment, *filters)

    async def get_equipment_links_by_psv(self, psv_id: str) -> List[dict]:
        return await self._get_all(EquipmentLink, EquipmentLink.protective_system_id == psv_id)

    async def create_equipment_link(self, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._create(EquipmentLink, converted_data)

    async def delete_equipment_link(self, link_id: str) -> bool:
        return await self._delete(EquipmentLink, link_id)

    async def create_equipment(self, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._create(Equipment, converted_data)

    async def update_equipment(self, equipment_id: str, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        instance = await self._get_by_id(Equipment, equipment_id)
        if not instance:
            raise ValueError(f"Equipment {equipment_id} not found")
        
        for key, value in converted_data.items():
            if hasattr(instance, key):
                setattr(instance, key, value)
        
        await self.session.commit()
        await self.session.refresh(instance)
        return instance

    async def delete_equipment(self, equipment_id: str) -> bool:
        return await self._delete(Equipment, equipment_id)

    # --- Attachments ---

    async def get_attachments_by_psv(self, psv_id: str) -> List[dict]:
        return await self._get_all(Attachment, Attachment.protective_system_id == psv_id)

    async def create_attachment(self, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._create(Attachment, converted_data)

    async def delete_attachment(self, attachment_id: str) -> bool:
        return await self._delete(Attachment, attachment_id)

    # --- Notes ---

    async def get_notes_by_psv(self, psv_id: str) -> List[dict]:
        return await self._get_all(ProjectNote, ProjectNote.protective_system_id == psv_id)

    async def create_note(self, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._create(ProjectNote, converted_data)

    async def update_note(self, note_id: str, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._update(ProjectNote, note_id, converted_data)

    async def delete_note(self, note_id: str) -> bool:
        return await self._delete(ProjectNote, note_id)

    # --- Comments ---

    async def get_comments_by_psv(self, psv_id: str) -> List[dict]:
        return await self._get_all(Comment, Comment.protective_system_id == psv_id)

    async def create_comment(self, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._create(Comment, converted_data)

    async def update_comment(self, comment_id: str, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        instance = await self._get_by_id(Comment, comment_id)
        if not instance:
            raise ValueError(f"Comment {comment_id} not found")
        for key, value in converted_data.items():
            if hasattr(instance, key):
                setattr(instance, key, value)
        await self.session.commit()
        await self.session.refresh(instance)
        return instance

    async def delete_comment(self, comment_id: str) -> bool:
        return await self._delete(Comment, comment_id)

    # --- Todos ---

    async def get_todos_by_psv(self, psv_id: str) -> List[dict]:
        return await self._get_all(Todo, Todo.protective_system_id == psv_id)

    async def create_todo(self, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._create(Todo, converted_data)

    async def update_todo(self, todo_id: str, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._update(Todo, todo_id, converted_data)

    async def delete_todo(self, todo_id: str) -> bool:
        return await self._delete(Todo, todo_id)

    # --- Revision History ---

    async def get_revisions_by_entity(self, entity_type: str, entity_id: str) -> List[dict]:
        """Get revisions for an entity, ordered by sequence descending."""
        stmt = select(RevisionHistory).where(
            RevisionHistory.entity_type == entity_type,
            RevisionHistory.entity_id == entity_id
        ).order_by(
            nullslast(RevisionHistory.originated_at.desc()),
            RevisionHistory.sequence.desc(),
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_revision_by_id(self, revision_id: str) -> Optional[dict]:
        return await self._get_by_id(RevisionHistory, revision_id)

    async def create_revision(self, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._create(RevisionHistory, converted_data)

    async def update_revision(self, revision_id: str, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        instance = await self._get_by_id(RevisionHistory, revision_id)
        if not instance:
            raise ValueError(f"Revision {revision_id} not found")
        
        for key, value in converted_data.items():
            if hasattr(instance, key):
                setattr(instance, key, value)
        
        await self.session.commit()
        await self.session.refresh(instance)

        # If this revision is the current revision of a PSV, derive PSV status.
        if instance.entity_type == "protective_system":
            psv = await self._get_by_id(ProtectiveSystem, instance.entity_id)
            if psv and psv.current_revision_id == revision_id and psv.status != "issued":
                next_status = "draft"
                if instance.originated_by:
                    next_status = "in_review"
                    if instance.checked_by:
                        next_status = "checked"
                        if instance.approved_by:
                            next_status = "approved"
                psv.status = next_status
                await self.session.commit()
                await self.session.refresh(psv)

        return instance

    async def delete_revision(self, revision_id: str) -> bool:
        """Delete a revision and clear any current_revision_id references."""
        # First, clear references from entities so FK constraints don't block deletes.
        # Update status to draft when current revision is removed (unless already issued).
        stmt_psv = update(ProtectiveSystem).where(
            ProtectiveSystem.current_revision_id == revision_id
        ).values(
            current_revision_id=None,
            status=case(
                (ProtectiveSystem.status == "issued", "issued"),
                else_="draft",
            )
        )
        stmt_scenario = update(OverpressureScenario).where(
            OverpressureScenario.current_revision_id == revision_id
        ).values(current_revision_id=None)
        stmt_case = update(SizingCase).where(
            SizingCase.current_revision_id == revision_id
        ).values(current_revision_id=None)

        await self.session.execute(stmt_psv)
        await self.session.execute(stmt_scenario)
        await self.session.execute(stmt_case)
        await self.session.commit()

        return await self._delete(RevisionHistory, revision_id)

    # --- Utils ---
    
    def _convert_keys(self, data: dict) -> dict:
        """Convert camelCase keys (from API) to snake_case (for ORM)."""
        mapping = {
            "protectiveSystemId": "protective_system_id",
            "areaId": "area_id",
            "projectId": "project_id",
            "unitId": "unit_id",
            "plantId": "plant_id",
            "customerId": "customer_id",
            "ownerId": "owner_id",
            "scenarioId": "scenario_id",
            "equipmentId": "equipment_id",
            "leadId": "lead_id",
            "startDate": "start_date",
            "endDate": "end_date",
            "userId": "user_id",
            "passwordHash": "password_hash",
            "failedAttempts": "failed_attempts",
            "lastLogin": "last_login_at",
            "createdAt": "created_at",
            "updatedAt": "updated_at",
            "deletedAt": "deleted_at",
            "valveType": "valve_type",
            "designCode": "design_code",
            "serviceFluid": "service_fluid",
            "fluidPhase": "fluid_phase",
            "setPressure": "set_pressure",
            "projectIds": "projectIds",  # handled specially
            "relievingTemp": "relieving_temp",
            "relievingPressure": "relieving_pressure",
            "relievingRate": "relieving_rate",
            "accumulationPct": "accumulation_pct",
            "requiredCapacity": "required_capacity",
            "codeRefs": "code_refs",
            "isGoverning": "is_governing",
            # PSV scenario markdown notes (camelCase from frontend -> snake_case DB column)
            "caseConsideration": "case_consideration",
            "designPressure": "design_pressure",
            "designTemperature": "design_temp",
            "locationRef": "location_ref",
            "fileUri": "file_uri",
            "fileName": "file_name",
            "mimeType": "mime_type",
            "uploadedBy": "uploaded_by",
            "assignedTo": "assigned_to",
            "dueDate": "due_date",
            # Additional mappings
            "unitPreferences": "unit_preferences",
            "isPrimary": "is_primary",
            "createdBy": "created_by",
            "updatedBy": "updated_by",
            "approvedBy": "approved_by",
            "relationship": "relationship_type",
            "inletNetwork": "inlet_network",
            "outletNetwork": "outlet_network",
            "currentRevisionId": "current_revision_id",
            # Revision history
            "entityType": "entity_type",
            "entityId": "entity_id",
            "revisionCode": "revision_code",
            "originatedBy": "originated_by",
            "originatedAt": "originated_at",
            "checkedBy": "checked_by",
            "checkedAt": "checked_at",
            "approvedBy": "approved_by",
            "approvedAt": "approved_at",
            "issuedAt": "issued_at",
        }
        new_data = data.copy()
        
        # Handle simple keys
        for camel, snake in mapping.items():
            if camel in new_data:
                new_data[snake] = new_data.pop(camel)
        
        # Parse datetime fields (ISO string -> datetime)
        datetime_fields = [
            'created_at', 'updated_at', 'deleted_at', 'last_login_at',
            # Revision history
            'originated_at', 'checked_at', 'approved_at', 'issued_at'
        ]
        for field in datetime_fields:
            if field in new_data and isinstance(new_data[field], str):
                try:
                    new_data[field] = dateutil_parser.isoparse(new_data[field])
                except (ValueError, TypeError):
                    pass  # Keep as-is if parsing fails
        
        # Parse date fields (ISO string -> date)
        date_fields = ['start_date', 'end_date', 'due_date']
        for field in date_fields:
            if field in new_data and isinstance(new_data[field], str):
                try:
                    parsed = dateutil_parser.isoparse(new_data[field])
                    new_data[field] = parsed.date() if isinstance(parsed, datetime) else parsed
                except (ValueError, TypeError):
                    pass
                
        # Handle nested objects like inputs/outputs if they are JSONB and keys need preservation or conversion
        # Use as is for JSONB columns, SQLAlchemy handles dicts
        
        return new_data

    async def seed_data(self, data: dict) -> dict:
        """Seed database with mock data (RESET)."""
        from ..models.protective_system import protective_system_projects
        from sqlalchemy import insert
        
        # 1. Delete all data (Order matters for Foreign Keys!)
        # Leaf nodes first
        await self.session.execute(delete(Todo))
        await self.session.execute(delete(Comment))
        await self.session.execute(delete(Attachment))
        await self.session.execute(delete(EquipmentLink))
        await self.session.execute(delete(SizingCase))
        await self.session.execute(delete(OverpressureScenario))
        await self.session.execute(delete(protective_system_projects)) # Association table
        await self.session.execute(delete(ProtectiveSystem))
        await self.session.execute(delete(Equipment))
        await self.session.execute(delete(Project))
        await self.session.execute(delete(Area))
        await self.session.execute(delete(Unit))
        await self.session.execute(delete(Plant))
        await self.session.execute(delete(Customer))
        await self.session.execute(delete(Credential))
        await self.session.execute(delete(User))
        
        await self.session.commit()
        
        counts = {}

        # 2. Insert Data (Root nodes first)
        
        # Users
        users = data.get("users", [])
        for item in users:
            await self._create(User, self._convert_keys(item))
        counts["users"] = len(users)

        # Credentials
        creds = data.get("credentials", [])
        for item in creds:
             await self._create(Credential, self._convert_keys(item))
        counts["credentials"] = len(creds)

        # Customers
        customers = data.get("customers", [])
        for item in customers:
             await self._create(Customer, self._convert_keys(item))
        counts["customers"] = len(customers)

        # Plants
        plants = data.get("plants", [])
        for item in plants:
             await self._create(Plant, self._convert_keys(item))
        counts["plants"] = len(plants)

        # Units
        units = data.get("units", [])
        for item in units:
             await self._create(Unit, self._convert_keys(item))
        counts["units"] = len(units)

        # Areas
        areas = data.get("areas", [])
        for item in areas:
             await self._create(Area, self._convert_keys(item))
        counts["areas"] = len(areas)

        # Projects
        projects = data.get("projects", [])
        for item in projects:
             await self._create(Project, self._convert_keys(item))
        counts["projects"] = len(projects)

        # Equipment
        equipment = data.get("equipment", [])
        for item in equipment:
             await self._create(Equipment, self._convert_keys(item))
        counts["equipment"] = len(equipment)

        # Protective Systems
        psvs = data.get("protectiveSystems", [])
        psv_project_links = []
        for item in psvs:
            clean_item = self._convert_keys(item)
            # projectIds is preserved by _convert_keys if mapped to itself or ignored? 
            # I mapped "projectIds": "projectIds" in _convert_keys above.
            p_ids = clean_item.pop("projectIds", [])
            
            # Create PSV
            await self._create(ProtectiveSystem, clean_item)
            
            # Store links
            for pid in p_ids:
                psv_project_links.append({"protective_system_id": clean_item["id"], "project_id": pid})
                
        # Insert links
        if psv_project_links:
            await self.session.execute(insert(protective_system_projects).values(psv_project_links))
            await self.session.commit()
            
        counts["protectiveSystems"] = len(psvs)

        # Scenarios
        scenarios = data.get("scenarios", [])
        for item in scenarios:
             await self._create(OverpressureScenario, self._convert_keys(item))
        counts["scenarios"] = len(scenarios)

        # Sizing Cases
        cases = data.get("sizingCases", [])
        for item in cases:
             await self._create(SizingCase, self._convert_keys(item))
        counts["sizingCases"] = len(cases)

        # Equipment Links
        links = data.get("equipmentLinks", [])
        for item in links:
             await self._create(EquipmentLink, self._convert_keys(item))
        counts["equipmentLinks"] = len(links)
        
        # Attachments
        att = data.get("attachments", [])
        for item in att:
             await self._create(Attachment, self._convert_keys(item))
        counts["attachments"] = len(att)

        # Comments
        comments = data.get("comments", [])
        for item in comments:
             await self._create(Comment, self._convert_keys(item))
        counts["comments"] = len(comments)

        # Todos
        todos = data.get("todos", [])
        for item in todos:
             await self._create(Todo, self._convert_keys(item))
        counts["todos"] = len(todos)

        # Revision History
        revisions = data.get("revisionHistory", [])
        for item in revisions:
             await self._create(RevisionHistory, self._convert_keys(item))
        counts["revisionHistory"] = len(revisions)

        return counts
