# Engineering Objects Unification (2026-03-06)

## Summary
Database schema was updated to use `engineering_objects` as the unified object store for equipment-like entities (`tank`, `vessel`, `pump`, etc.) and calculator-linked objects.

## Why
- Remove fragmentation across many equipment-specific tables.
- Align with object-based central i-DDC integration.
- Keep one canonical object identity (`engineering_objects.uuid`) for cross-app linking.

## Implemented Changes
1. Expanded `engineering_objects` with operational equipment fields (`area_id`, `owner_id`, `name`, `design_*`, `mawp_*`, `is_active`, `deleted_at`, etc.).
2. Backfilled rows from `equipment` into `engineering_objects`.
3. Switched foreign keys:
- `equipment_links.equipment_id` -> `engineering_objects.uuid`
- `venting_calculations.equipment_id` -> `engineering_objects.uuid`
4. Kept `/equipment` API contract for compatibility while persisting via `engineering_objects`.
5. Made `properties.design_parameters` the canonical location for design pressure/temperature fields (migration phase 1).

## Migration Files
- `202603060001_create_engineering_objects_table.py`
- `202603060002_unify_equipment_into_engineering_objects.py`
- `202603060003_move_design_params_to_properties.py`
- `202603060004_drop_engineering_object_design_columns.py`

## Compatibility and Behavior
- Existing callers can still use `/equipment`, but the root path is being phased out.
- The documented transition path is now `/legacy/equipment`.
- Equipment payload shape remains compatible: `id`, `type`, `tag`, `name`, `details`, etc.
- Design parameters are stored in `properties.design_parameters` as canonical source.
- Transitional design columns were removed in phase 2.
- Soft delete uses `is_active` + `deleted_at` in `engineering_objects`.
- JSONB payload reference by object class: `docs/ENGINEERING_OBJECT_PROPERTIES_REFERENCE.md`

## Operational Notes
- `equipment` table still exists during transition for backward compatibility.
- New development should treat `engineering_objects` as source of truth.
- Shared client guidance:
  - prefer `apiClient.engineeringObjects`
  - `createApiClient()` no longer exposes `apiClient.equipment`
  - the legacy shared client wrapper for `/equipment` has been removed
  - use raw `/equipment` routes only for legacy compatibility or external transition work
- Future cleanup phase can remove legacy equipment table dependencies after all modules are migrated.

## Validation Checklist
1. `GET /legacy/equipment?type=tank` returns expected rows.
2. `GET /legacy/equipment?type=vessel` returns expected rows.
3. `POST /venting` accepts `equipmentId` from engineering object UUID.
4. `GET /venting?equipmentId=<uuid>` filters correctly.
5. `POST /equipment-links` creates links using engineering object UUID.
