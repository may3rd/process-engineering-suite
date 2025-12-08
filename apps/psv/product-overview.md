## Overview
Process Engineering Suite module for managing overpressure protective systems (OPS) across customers, plants, units, areas, and projects. Users can browse the hierarchy, capture overpressure scenarios, document protective equipment, and size PSVs/PRDs per API-520/521/2000 and ASME guidance. Built as a React web app with a services backend that shares suite-wide auth and data services.

## Goals and Scope
- Centralize OPS records with consistent hierarchy and metadata across projects.
- Make it easy to find protective systems by customer/plant/unit/area/project and to trace scenarios to equipment.
- Provide calculator-backed sizing (PSV/PRD) with transparent assumptions and audit trails.
- Support collaboration: versioning, approvals, and export for reports and design packages.

## Domain Hierarchy and Navigation
- **Hierarchy**: Customer → Plant → Unit → Area → Project → Protective System (PSV/PRD or other device). Each level stores metadata (IDs, names, codes, status, owners).
- **Navigation**: Tree/crumb navigation for quick drilling; facet filters (fluid type, service, status, design code), text search, and saved views.
- **Cross-links**: Protective system references upstream equipment, piping, and scenarios; show related calculations and documents.

## Core Data Model (conceptual)
- **ProtectiveSystem**: id, name, type (PSV, rupture disc, vent system), design code, service fluid, set pressure, MAWP, owner, status, tags.
- **OverpressureScenario**: id, protective_system_id, cause/type, relieving conditions (temperature, pressure, phase), relieving rate, accumulation %, required relieving capacity, assumptions, references to API/ASME clauses.
- **SizingCase**: id, protective_system_id, standard (API-520/521/2000/ASME), input set, calculation outputs (required area, orifice size, backpressure, capacity), calculation method (gas/liquid/steam/flare/vent), revision and validation state.
- **EquipmentLink**: links to vessels/piping/equipment affected; includes design conditions and location.
- **Attachment/Note**: drawings, vendor data sheets, ops notes, approvals.
- **Audit/Revision**: versions, approver, timestamp, change summary.

## Frontend (React) Overview
- **Tech**: React + TS, suite UI kit, React Query for data, routing with customer/plant/unit/area/project params, form validation (Zod/Yup), chart/table components for results. English-only UI; SI/US unit toggle.
- **Views**: 
  - Hierarchy browser with list and map of sites/units.
  - Project dashboard with OPS count, risk status, and recent changes.
  - Protective System detail: tabs for Overview, Scenarios, Sizing, Hydraulics (inlet/outlet), Attachments, History.
  - Scenario editor with templates for common causes (blocked outlet, fire, tube rupture, utility failure).
  - Sizing workspace: inputs side-by-side with live calculator outputs; standards selector; assumption checklist; export to PDF/Excel; optional import of Aspen Flare Network Analyzer hydraulics.
- **UX details**: inline validation against code limits (set pressure, accumulation), flags for missing assumptions, comparison of sizing revisions, “what changed” diff in forms, breadcrumb + quick search for fast switching.
- **Offline/Latency**: optimistic updates for notes/attachments; debounce search; cache recent hierarchies.
- **Accessibility**: keyboardable lists, clear error messaging, unit display (SI/US) toggle.

## Backend Overview
- **Tech**: Python services (e.g., FastAPI) aligned with suite auth and data contracts.
- **API**: REST/GraphQL for hierarchy, protective systems, scenarios, sizing cases, attachments, and audits. Pagination + server-side filters (customer/plant/unit/area/project, status, fluid, tag).
- **AuthN/AuthZ**: SSO (suite-wide) with role-based access; row-level ownership (customer/plant/unit) and per-project sharing; audit logging for changes to sizing assumptions and results.
- **Calculations**: Services implementing API-520/521/2000/ASME methods for gas/liquid/steam/vent sizing; handles superimposed/built-up backpressure, combination PSV+rupture disc; stores inputs/outputs for reproducibility.
- **Data store**: relational DB for hierarchy and OPS records; blob storage for attachments; versioned calculation records; caching layer for reference tables (orifice sizes, discharge coefficients, material limits).
- **Validation**: server-side checks for code compliance (set pressure vs MAWP, accumulation %, discharge coefficients valid for selected standard, backpressure limits).
- **Import/Export**: bulk import from spreadsheets; export project/plant OPS dossiers (PDF primary; Excel/JSON templates to be defined later). Idempotent imports with dry-run validation and row-level error reporting.
- **Integrations**: hooks to other Process Engineering Suite tools (hydraulics, equipment sizing) for sharing fluid properties and design conditions; Python API endpoints to capture inlet/outlet piping hydraulics or import results from Aspen Flare Network Analyzer; in-house integrated engineering platform for instrument list, equipment list, and line list; future webhooks for CMMS/asset registry updates.
- **API hygiene**: versioned APIs, rate limits, pagination defaults, idempotency keys for bulk actions, and retention policies for audit logs/attachments.

## Calculation QA and Standards
- Align stored inputs/outputs to API-520/521/2000/ASME clauses with clause references in records.
- Unit systems: SI/US conversions defined centrally; rounding and significant-figure rules for displayed/exported values.
- Regression test packs for gas/liquid/steam/vent sizing, including edge cases (critical flow, backpressure bounds, combination devices).
- Validation gates: flag missing/invalid assumptions, check set pressure vs MAWP/accumulation %, enforce backpressure/device limits.
- Explainability: show equation paths used per method, assumption checklist, and revision comparisons.

## Database Schema (relational, simplified)
- **customer**(id, name, code, status, owner_id, created_at)
- **plant**(id, customer_id FK, name, code, location, status, owner_id, created_at)
- **unit**(id, plant_id FK, name, code, service, status, owner_id, created_at)
- **area**(id, unit_id FK, name, code, status, created_at)
- **project**(id, area_id FK, name, code, phase, status, start_date, end_date, lead_id, created_at)
- **protective_system**(id, project_id FK, name, type, design_code, service_fluid, set_pressure, mawp, owner_id, status, tags JSONB, created_at, updated_at)
- **overpressure_scenario**(id, protective_system_id FK, cause, description, relieving_temp, relieving_pressure, phase, relieving_rate, accumulation_pct, required_capacity, assumptions JSONB, code_refs, created_at, updated_at)
- **sizing_case**(id, protective_system_id FK, standard, method, inputs JSONB, outputs JSONB, backpressure, orifice_size, capacity, revision_no, status, created_by, approved_by, created_at, updated_at)
- **hydraulic_detail**(id, protective_system_id FK, side (inlet/outlet), source (manual/aspen_import), model_ref, inputs JSONB, results JSONB, software_version, created_at, updated_at)
- **equipment**(id, project_id FK, type, tag, description, design_pressure, design_temp, location_ref, created_at)
- **equipment_link**(id, protective_system_id FK, equipment_id FK, relationship, notes)
- **attachment**(id, protective_system_id FK, file_uri, file_name, mime_type, size, uploaded_by, created_at)
- **note**(id, protective_system_id FK, body, created_by, created_at)
- **audit_log**(id, entity_type, entity_id, action, user_id, before JSONB, after JSONB, created_at)
- **user**(id, name, email, role, status)
- **permission**(id, user_id FK, scope_type (customer/plant/unit/project), scope_id, role)

## Data Quality and Validation
- Required fields per hierarchy level (name, code, status, owner) and uniqueness constraints (codes, equipment tags, PSV/PRD IDs).
- Enumerations for scenario causes, fluid types, standards, device types; validation on import and UI forms.
- Duplicate detection for equipment and protective systems; soft delete with audit trail.
- Import rules: preflight validation, row-level error reporting, transactional commits to avoid partial loads.

## User Roles and Permissions
- Process engineer: create/edit scenarios, run sizing, attach notes.
- Lead/approver: review and approve sizing cases; lock versions for issue packages.
- Viewer/Auditor: read-only, export data; see audit history and assumptions.

## Non-Functional Requirements
- Availability and integrity prioritized (regulatory data); backups and immutable audit logs; define RPO/RTO and run DR tests.
- Deployment: on-prem preferred; target >90% uptime for the web server initially; set SLO/SLA targets and maintenance windows.
- Performance: hierarchy browse <300 ms server response; sizing calculations <2 s typical; alert thresholds and error budgets aligned to SLOs.
- Compliance: traceability of standards used; reproducible results with recorded inputs; clear references to API/ASME clauses in outputs.
- Security: least-privilege roles, scoped API tokens for integrations, attachment malware scan, secrets in vault, server-side enforcement of share/ownership rules, retention policies for audit/attachments.

## Reporting and Export (PDF-first)
- Standard dossier sections: cover (metadata), hierarchy context, protective system summary, scenarios with assumptions, sizing calculations with references, equipment links, attachments manifest, approvals/audit trail.
- Shared pagination/branding across the Process Engineering Suite; configurable headers/footers and revision stamps.
- Excel/JSON templates to be defined later; include machine-readable manifests for downstream tools when added.

## Open Questions
- Report template needs beyond standard PDF (vendor/regulator variations)?
- Integration targets and data contracts for CMMS/asset registry (low priority for now)?
