# Calculation Save/Load Hybrid Design

## Summary

This design defines a hybrid persistence model for calculator save/load across the updated apps.

Goals:

- keep normal load and list operations fast
- preserve a full immutable version history for audit and restore
- make save/load round-trippable for the full calculation payload
- avoid mutating historical versions
- support restore by creating a new latest version from an older snapshot

The primary model is:

- a current `calculations` record for the latest state
- an append-only `calculation_versions` history for every save/import/restore event

## Problems In The Current Approach

The current implementations are inconsistent across apps and mix UI-specific normalization with persistence behavior.

Observed risks:

- some loaders only restore a subset of the saved input shape
- overwrite behavior is ambiguous and app-specific
- history is not modeled as a first-class persistence concern
- restore is currently tied to record mutation rather than version lineage
- auditability is weak because a save can replace the previous state without preserving a full immutable snapshot

This makes save/load unreliable for engineering workflows where traceability matters.

## Design Goals

Functional goals:

- save the complete canonical form payload, not a partial projection
- load the exact saved payload without silent field loss
- keep linked equipment references with the saved version
- preserve metadata and revision history with every saved version
- allow soft-delete of calculations without deleting history
- allow restore of any prior version

Non-functional goals:

- listing calculations must stay fast
- latest-state queries should not require scanning all versions
- version history must be immutable
- restore must leave an audit trail
- migration from current saved records should be straightforward

## Data Model

### 1. `calculations`

This table is the fast current-state record used by list screens and standard load flows.

Suggested fields:

- `calculation_id`
- `app`
- `tag`
- `name`
- `description`
- `status`
- `is_active`
- `linked_equipment_id`
- `linked_equipment_tag`
- `latest_version_no`
- `latest_version_id`
- `current_input_snapshot`
- `current_result_snapshot`
- `current_metadata`
- `current_revision_history`
- `created_at`
- `updated_at`
- `deleted_at`

Notes:

- `current_*` fields mirror the latest version for fast reads
- `is_active` and `deleted_at` support soft delete
- search/list screens should query only this table

### 2. `calculation_versions`

This table stores immutable full snapshots.

Suggested fields:

- `version_id`
- `calculation_id`
- `version_no`
- `version_kind`
- `inputs`
- `results`
- `metadata`
- `revision_history`
- `linked_equipment_id`
- `linked_equipment_tag`
- `source_version_id`
- `change_note`
- `created_by`
- `created_at`

`version_kind` values:

- `save`
- `autosave`
- `restore`
- `import`
- `migration`

Notes:

- every row is immutable after insert
- `source_version_id` is used for restore/import lineage
- the payload is the full canonical calculation state, not a derived subset

## Canonical Payload Rules

Each saved version must store the full canonical payload used by the app at the form boundary.

Required snapshot content:

- `inputs`
- `results`
- `metadata`
- `revision_history`
- `linked_equipment_id`
- `linked_equipment_tag`
- app identity and schema version

Rules:

- inputs must be stored in canonical base units
- no UI-only display units should be persisted inside the canonical snapshot
- loaders should merge against app defaults only for backward compatibility, not for normal same-version loads
- same-version save then load must reproduce the same calculation state

## Write Flows

### Create New Calculation

1. Create a row in `calculations`
2. Insert `calculation_versions.version_no = 1`
3. Copy that version's payload into `calculations.current_*`
4. Set `latest_version_id` and `latest_version_no`

### Save Existing Calculation

1. Read current `latest_version_no`
2. Insert a new `calculation_versions` row with `version_no + 1`
3. Update `calculations.current_*`
4. Update `latest_version_id`, `latest_version_no`, `updated_at`

### Import From File

Two acceptable behaviors:

- import as a new calculation with `version_kind = import`
- import into an existing calculation only if the user explicitly chooses that action

Default recommendation:

- import creates a new calculation unless the user intentionally selected an existing target

### Restore Old Version

Restore must create a new latest version, not reactivate an old row.

Flow:

1. User selects historical version `N`
2. System copies version `N` payload into a new version `N+1`
3. New row is inserted with `version_kind = restore`
4. `source_version_id` points to restored version `N`
5. `calculations.current_*` is updated to the new version payload

This preserves a complete audit chain and avoids history mutation.

### Soft Delete

Soft delete affects only `calculations`.

Flow:

1. Set `is_active = false`
2. Set `deleted_at`
3. Keep all versions intact

Optional:

- create a lightweight audit event elsewhere if deletion tracking needs actor attribution

## Read Flows

### List Calculations

Query only `calculations`.

Fields returned should be enough for list UI:

- `calculation_id`
- `app`
- `tag`
- `name`
- `description`
- `status`
- `is_active`
- `linked_equipment_id`
- `linked_equipment_tag`
- `latest_version_no`
- `updated_at`

### Load Latest

Default load should read from `calculations.current_*`.

This avoids joining version history for the normal path.

### Load Specific Historical Version

Read directly from `calculation_versions` by `version_id` or `calculation_id + version_no`.

This is the source for history preview and restore actions.

## API Shape

Recommended endpoints:

- `POST /calculations`
- `GET /calculations`
- `GET /calculations/{calculation_id}`
- `PATCH /calculations/{calculation_id}`
- `DELETE /calculations/{calculation_id}` for soft delete
- `GET /calculations/{calculation_id}/versions`
- `GET /calculations/{calculation_id}/versions/{version_id}`
- `POST /calculations/{calculation_id}/restore`

Recommended semantics:

- `POST /calculations` creates calculation + version 1
- `PATCH /calculations/{id}` creates a new version, not in-place overwrite
- `POST /calculations/{id}/restore` creates a new version from a historical version

The client should not be responsible for version numbering.

## Client Behavior

Client save/load behavior should be uniform across calculator apps.

Required client rules:

- save the full form shape
- do not hand-maintain field-by-field persistence mappers unless they are generated or schema-driven
- when loading, prefer direct assignment of the canonical payload
- only use normalization for legacy compatibility or schema migration
- duplicate-name checks should be advisory UX, not identity logic
- stable identity must be `calculation_id`

Recommended client model:

- `Save As New`
- `Save New Version`
- `Load Latest`
- `View History`
- `Restore This Version`
- `Import File As New`

## Validation And Migration

Every version should carry:

- `app`
- `schema_version`

Migration rules:

- old records should be converted into `calculations` + initial `calculation_versions` rows
- any legacy local-storage data should be imported as `version_kind = migration`
- loaders may apply schema migration only when `schema_version` is older than current

## Concurrency

Use optimistic concurrency on the current calculation record.

Recommended approach:

- include `latest_version_no` or `updated_at` in update requests
- reject stale writes with a conflict response
- let the user decide whether to reload latest or save as a new branch/version

For the first pass, a simple conflict error is enough.

## Audit And Provenance

Every version should answer:

- who saved it
- when it was saved
- what kind of save it was
- which historical version it came from, if restored/imported

This is necessary for engineering traceability and document control.

## Testing Strategy

Required tests:

- save then load latest returns identical payload
- save advanced optional fields then load returns identical payload
- restore creates a new version and preserves prior versions
- soft delete hides a calculation from default list but preserves versions
- import creates a new calculation and a version row
- schema migration upgrades older payloads correctly
- conflict handling rejects stale updates

App-level regression tests should explicitly cover fields that were previously dropped by partial normalizers.

## Recommendation

Implement a shared calculation persistence contract first, then adapt each app to it.

The key rule is:

`calculation_versions` is the system of record for history, while `calculations` is the optimized current-state projection.

This keeps the UI fast, the audit trail complete, and restore behavior deterministic.

## Out Of Scope

- branching version trees beyond linear restore lineage
- collaborative editing
- autosave UX details
- cross-app shared loading of another app's payload
