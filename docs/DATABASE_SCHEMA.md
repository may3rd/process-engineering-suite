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
