# Database Schema

## Core Hierarchy
- **Customer**: Root entity (e.g., "PTT", "Chevron").
- **Plant**: Physical location (e.g., "Rayong Refinery").
- **Unit**: Process unit (e.g., "CDU-1").
- **Area**: Logical area within a unit.
- **Project**: Engineering project context.

## Protective Systems (PSV)
### `protective_systems`
| Column | Type | Description |
|---|---|---|
| id | uuid | PK |
| project_id | uuid | FK -> projects.id |
| tag | varchar | e.g. "PSV-1001" |
| status | enum | draft, in_review, approved, issued |
| ... | ... | (details in code) |

### `scenarios`
| Column | Type | Description |
|---|---|---|
| id | uuid | PK |
| psv_id | uuid | FK -> protective_systems.id |
| cause | varchar | blocked_outlet, fire_case, etc. |
| required_capacity | decimal | calculated required flow |

### `sizing_cases`
| Column | Type | Description |
|---|---|---|
| id | uuid | PK |
| scenario_id | uuid | FK -> scenarios.id |
| standard | varchar | API-520, etc. |
| status | enum | draft, calculated, verified |

## Pipeline Configuration
### `pipelines`
| Column | Type | Description |
|---|---|---|
| id | uuid | PK |
| sizing_case_id | uuid | FK -> sizing_cases.id |
| type | enum | inlet, outlet |
| fluids_model | jsonb | Fluid properties override (optional) |

### `pipeline_segments`
| Column | Type | Description |
|---|---|---|
| id | uuid | PK |
| pipeline_id | uuid | FK -> pipelines.id |
| sequence_order | int | 1, 2, 3... order from source to PSV (inlet) or PSV to disch (outlet) |
| type | enum | pipe, fitting, valve, reducer, expander |
| component_name | varchar | e.g. "4-inch Pipe", "90 deg Elbow" |
| nominal_size | varchar | e.g. "4", "6" |
| schedule | varchar | e.g. "40", "80", "STD" |
| length | decimal | Length in meters (for pipes) |
| elevation_change | decimal | Vertical change (+ up, - down) |
| equivalent_length | decimal | Calculated/User override Le |
| quantity | int | For fittings (e.g. 2 elbows) |

## Reference Data
- **`fittings_catalog`**: Standard Le/D or K values for fittings.
- **`pipe_schedule`**: ID, OD, Wall Thickness.

---

## Engineering Objects (Unified Object Store)
### `engineering_objects`
Single source of truth for process equipment and calculator-linked objects.

| Column | Type | Notes |
|---|---|---|
| uuid | uuid | PK (canonical object identity) |
| tag | varchar | Unique plant tag, normalized uppercase |
| object_type | varchar | Object discriminator, e.g. `TANK`, `VESSEL`, `PUMP`, `VESSEL_CALCULATION` |
| area_id | uuid | FK → areas.id (SET NULL), nullable |
| owner_id | uuid | FK → users.id (SET NULL), nullable |
| name | varchar(255) | Display name |
| description | text | Optional free-text |
| location_ref | varchar(255) | Optional location reference |
| status | varchar | Lifecycle/status label |
| is_active | boolean | Soft-delete flag |
| deleted_at | timestamptz | Soft-delete timestamp |
| properties | jsonb | Flexible payload. Equipment details are under `properties.details` |
| project_id | uuid | FK → projects.id, nullable |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

**Canonical design parameters (JSONB):** `properties.design_parameters`
- `designPressure`
- `designPressureUnit`
- `mawp`
- `mawpUnit`
- `designTemperature`
- `designTempUnit`

**Indexes:** `uq_engineering_objects_tag`, `ix_engineering_objects_area_id`, `ix_engineering_objects_owner_id`, `ix_engineering_objects_properties_gin`

### Compatibility Layer
- `/legacy/equipment` is the documented compatibility path during transition.
- `/equipment` root has been removed from the API surface.
- Backend now persists equipment reads/writes in `engineering_objects`.
- `equipment.id` compatible UUIDs are preserved during backfill into `engineering_objects.uuid`.
- Existing clients can continue using `id`, `type`, `details` payload shape.
- New clients should use `/engineering-objects` directly.

### FK Changes
- `equipment_links.equipment_id` now references `engineering_objects.uuid`.
- `venting_calculations.equipment_id` now references `engineering_objects.uuid`.

---

## App-Specific Resources
These three tables were added (migration `202602250001`) to give the stateless frontend apps persistent storage via the same centralised API.

### `venting_calculations`
Stores saved API 2000 tank venting calculations from `apps/venting-calculation` (port 3004).

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| area_id | uuid | FK → areas.id (SET NULL), nullable |
| equipment_id | uuid | FK → engineering_objects.uuid (SET NULL), nullable |
| owner_id | uuid | FK → users.id, nullable (no auth in this app yet) |
| name | varchar(255) | Human-readable label, e.g. "T-101 Rev 0" |
| description | text | Optional free-text |
| status | enum | `draft` \| `in_review` \| `approved` (default `draft`) |
| inputs | jsonb | Full `CalculationInput` shape from the frontend |
| results | jsonb | Full `CalculationResult` shape (null until calculated) |
| api_edition | varchar(10) | `5TH` \| `6TH` \| `7TH` (default `7TH`) |
| is_active | boolean | Soft-delete flag (default `true`) |
| deleted_at | timestamptz | Set on soft-delete, null otherwise |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

**Indexes:** `ix_venting_calculations_area_id`, `ix_venting_calculations_owner_id`
**Soft-delete:** `DELETE /venting/{id}` sets `is_active=false` + `deleted_at`. Use `GET /venting?includeDeleted=true` to see soft-deleted records. `POST /venting/{id}/restore` reverses.

---

### `network_designs`
Stores saved hydraulic network editor designs from `apps/network-editor` (port 3002).

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| area_id | uuid | FK → areas.id (SET NULL), nullable |
| owner_id | uuid | FK → users.id, nullable |
| name | varchar(255) | Human-readable label |
| description | text | Optional free-text |
| network_data | jsonb | Full `NetworkState` (nodes + pipes + fluid + project details) |
| node_count | int | Cached count for list display (default 0) |
| pipe_count | int | Cached count for list display (default 0) |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

**Indexes:** `ix_network_designs_area_id`, `ix_network_designs_owner_id`
**Delete:** Hard delete only (no soft-delete).

---

### `design_agent_sessions`
Stores saved design agent workflow sessions from `services/design-agents` (Python backend).

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| owner_id | uuid | FK → users.id, nullable |
| name | varchar(255) | Human-readable session name |
| description | text | Optional free-text |
| state_data | jsonb | Full `DesignState` from the Zustand store |
| active_step_id | varchar(100) | Current active workflow step ID, nullable |
| completed_steps | text[] | Array of completed step IDs |
| status | enum | `active` \| `completed` \| `archived` (default `active`) |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

**Indexes:** `ix_design_agent_sessions_owner_id`
**Delete:** Hard delete only.
