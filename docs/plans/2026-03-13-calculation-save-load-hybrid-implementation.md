# Calculation Save/Load Hybrid Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current mixed save/load behavior with a hybrid database-backed model that keeps a fast current calculation record plus immutable version history for audit and restore.

**Architecture:** Add first-class calculation and calculation-version persistence in the API, with the current record acting as a projection of the latest version. Update the TypeScript client and calculator apps to use stable `calculationId` identity, append-only version saves, and exact round-trip loading of canonical payloads.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Pydantic, Bun, TypeScript, React Hook Form, Vitest, pytest

---

### Task 1: Add API regression coverage for the target persistence contract

**Files:**
- Modify: `services/api/tests/test_venting_metadata.py`
- Modify: `services/api/tests/test_engineering_objects_endpoints.py`
- Create: `services/api/tests/test_calculation_versioning.py`

**Step 1: Write the failing API tests**

Add tests that assert:

- creating a calculation creates `version_no = 1`
- saving an existing calculation creates a new version instead of mutating history
- restoring a historical version creates a new latest version
- soft delete hides the calculation from default lists but preserves version history
- loading latest returns the same full payload that was saved

Use fixtures shaped like:

```python
payload = {
    "app": "pump-calculation",
    "name": "P-101 base case",
    "description": "Normal case",
    "inputs": {"tag": "P-101", "flowDesign": 100, "showOrifice": True, "orificePipeId": 50},
    "results": {"differentialHead": 12.3},
    "metadata": {"projectNumber": "P1", "documentNumber": "DOC-1", "title": "Calc", "projectName": "Proj", "client": "Client"},
    "revisionHistory": [{"rev": "0", "by": "EE", "checkedBy": "", "approvedBy": ""}],
    "linkedEquipmentId": "pump-123",
    "linkedEquipmentTag": "P-101",
}
```

**Step 2: Run the new API tests to verify they fail**

Run:

```bash
cd /Users/maetee/Code/process-engineering-suite/services/api
pytest tests/test_calculation_versioning.py -v
```

Expected: failures for missing endpoints, schema fields, or version semantics.

**Step 3: Commit the failing test scaffold**

```bash
git add services/api/tests/test_calculation_versioning.py services/api/tests/test_venting_metadata.py services/api/tests/test_engineering_objects_endpoints.py
git commit -m "test(api): define calculation versioning contract"
```

### Task 2: Add database models and Alembic migration for current calculations plus immutable versions

**Files:**
- Create: `services/api/app/models/calculation.py`
- Create: `services/api/app/models/calculation_version.py`
- Modify: `services/api/app/models/__init__.py`
- Create: `services/api/alembic/versions/20260313xxxx_add_calculation_versioning.py`
- Modify: `services/api/app/models/base.py`

**Step 1: Write the migration and models**

Implement:

- `calculations` table with current/latest projection fields
- `calculation_versions` table with immutable full snapshots
- foreign key from `calculation_versions.calculation_id` to `calculations.id`
- unique constraint on `(calculation_id, version_no)`
- indexes for `(app, is_active, updated_at)` and `(calculation_id, version_no)`

Suggested SQLAlchemy shapes:

```python
class Calculation(...):
    app = mapped_column(String, nullable=False, index=True)
    name = mapped_column(String, nullable=False)
    description = mapped_column(Text, nullable=False, default="")
    is_active = mapped_column(Boolean, nullable=False, default=True)
    latest_version_no = mapped_column(Integer, nullable=False, default=1)
    latest_version_id = mapped_column(UUID, ForeignKey("calculation_versions.id"), nullable=True)
    current_input_snapshot = mapped_column(JSONB, nullable=False)
    current_result_snapshot = mapped_column(JSONB, nullable=True)
```

```python
class CalculationVersion(...):
    calculation_id = mapped_column(UUID, ForeignKey("calculations.id"), nullable=False, index=True)
    version_no = mapped_column(Integer, nullable=False)
    version_kind = mapped_column(String, nullable=False)
    inputs = mapped_column(JSONB, nullable=False)
    results = mapped_column(JSONB, nullable=True)
    source_version_id = mapped_column(UUID, ForeignKey("calculation_versions.id"), nullable=True)
```

**Step 2: Run the migration tests and schema checks**

Run:

```bash
cd /Users/maetee/Code/process-engineering-suite/services/api
pytest tests/test_calculation_versioning.py -v
```

Expected: still failing in DAL/router code, but migration/model imports succeed.

**Step 3: Commit the schema layer**

```bash
git add services/api/app/models/calculation.py services/api/app/models/calculation_version.py services/api/app/models/__init__.py services/api/alembic/versions/20260313xxxx_add_calculation_versioning.py services/api/app/models/base.py
git commit -m "feat(api): add calculation and version persistence models"
```

### Task 3: Implement FastAPI schemas, DAL methods, and router endpoints for hybrid save/load

**Files:**
- Create: `services/api/app/routers/calculations.py`
- Modify: `services/api/app/routers/__init__.py`
- Modify: `services/api/app/services/dal.py`
- Modify: `services/api/app/services/db_service.py`
- Modify: `services/api/app/main.py`
- Optionally create: `services/api/app/schemas/calculations.py`

**Step 1: Add request/response schemas**

Define API models for:

- `CalculationCreate`
- `CalculationUpdate`
- `CalculationResponse`
- `CalculationVersionResponse`
- `CalculationRestoreRequest`

Keep the response shape explicit:

```python
class CalculationResponse(BaseModel):
    id: str
    app: str
    name: str
    description: str
    is_active: bool
    latest_version_no: int
    linked_equipment_id: str | None
    linked_equipment_tag: str | None
    inputs: dict[str, Any]
    results: dict[str, Any] | None
    metadata: dict[str, Any]
    revision_history: list[dict[str, Any]]
```

**Step 2: Add DAL/service methods**

Implement methods for:

- create calculation
- append version
- list calculations
- get latest calculation
- list versions
- get specific version
- restore version as new latest version
- soft delete calculation

Required rule:

- every update path inserts a new `calculation_versions` row
- no historical version is mutated

**Step 3: Add router endpoints**

Expose:

- `POST /calculations`
- `GET /calculations`
- `GET /calculations/{calculation_id}`
- `PATCH /calculations/{calculation_id}`
- `DELETE /calculations/{calculation_id}`
- `GET /calculations/{calculation_id}/versions`
- `GET /calculations/{calculation_id}/versions/{version_id}`
- `POST /calculations/{calculation_id}/restore`

**Step 4: Run API tests**

Run:

```bash
cd /Users/maetee/Code/process-engineering-suite/services/api
pytest tests/test_calculation_versioning.py tests/test_venting_metadata.py tests/test_engineering_objects_endpoints.py -v
```

Expected: the new contract tests pass.

**Step 5: Commit the API behavior**

```bash
git add services/api/app/routers/calculations.py services/api/app/routers/__init__.py services/api/app/services/dal.py services/api/app/services/db_service.py services/api/app/main.py
git commit -m "feat(api): add hybrid calculation save load endpoints"
```

### Task 4: Add API client module and shared TypeScript contract for calculations

**Files:**
- Create: `packages/api-client/src/modules/calculations.ts`
- Modify: `packages/api-client/src/client.ts`
- Modify: `packages/api-client/src/index.ts`
- Modify: `packages/types/index.d.ts` or regenerate from API schema if that is the repo flow

**Step 1: Write the failing client-facing tests or type assertions**

If this package has no direct tests yet, add a minimal type-level smoke path in app tests that imports the new module signatures.

Required methods:

- `list`
- `get`
- `create`
- `saveVersion`
- `listVersions`
- `getVersion`
- `restoreVersion`
- `softDelete`

Suggested TS shape:

```ts
export interface CalculationSavePayload {
  app: string;
  name: string;
  description: string;
  inputs: Record<string, unknown>;
  results?: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  revisionHistory: Array<Record<string, unknown>>;
  linkedEquipmentId?: string | null;
  linkedEquipmentTag?: string | null;
}
```

**Step 2: Implement the client module**

Map the REST calls directly to the new endpoints. Avoid app-specific helpers here.

**Step 3: Build the package**

Run:

```bash
cd /Users/maetee/Code/process-engineering-suite
bun turbo run build --filter=@eng-suite/api-client
```

Expected: successful package build and exported client methods.

**Step 4: Commit the client module**

```bash
git add packages/api-client/src/modules/calculations.ts packages/api-client/src/client.ts packages/api-client/src/index.ts packages/types/index.d.ts
git commit -m "feat(client): add calculations api module"
```

### Task 5: Refactor calculator app hooks to use `calculationId` identity and exact round-trip payloads

**Files:**
- Modify: `apps/pump-calculation/src/lib/hooks/useSavedCalculations.ts`
- Modify: `apps/venting-calculation/src/lib/hooks/useSavedCalculations.ts`
- Modify: `apps/vessels-calculation/src/lib/hooks/useSavedCalculations.ts`
- Modify: `apps/calculation-template/src/lib/hooks/useSavedCalculations.ts`
- Modify: `apps/pump-calculation/src/app/calculator/components/SaveCalculationButton.tsx`
- Modify: `apps/pump-calculation/src/app/calculator/components/LoadCalculationButton.tsx`
- Modify: `apps/venting-calculation/src/app/calculator/components/SaveCalculationButton.tsx`
- Modify: `apps/venting-calculation/src/app/calculator/components/LoadCalculationButton.tsx`
- Modify: `apps/vessels-calculation/src/app/calculator/components/SaveCalculationButton.tsx`
- Modify: `apps/vessels-calculation/src/app/calculator/components/LoadCalculationButton.tsx`
- Modify: `apps/pump-calculation/src/app/calculator/components/ActionMenu.tsx`
- Modify: `apps/venting-calculation/src/app/calculator/components/ActionMenu.tsx`
- Modify: `apps/vessels-calculation/src/app/calculator/components/ActionMenu.tsx`

**Step 1: Add failing round-trip tests for dropped fields**

Extend or add tests to prove that advanced fields survive save/load:

- pump: optional orifice, CV, shutoff, equipment-type, PD fields
- vessels: `bottomHeight`, `bootInsideDiameter`, `outletFittingDiameter`
- venting: linked equipment and full arrays

Suggested test files:

- Modify: `apps/pump-calculation/__tests__/ActionMenu.test.tsx`
- Modify: `apps/pump-calculation/__tests__/calculationFile.test.ts`
- Modify: `apps/vessels-calculation/__tests__/saveLoad.test.ts`
- Modify: `apps/vessels-calculation/__tests__/components/ActionMenu.test.tsx`
- Modify: `apps/venting-calculation/__tests__/ActionMenu.test.tsx`

**Step 2: Introduce stable UI state**

Track:

- `calculationId`
- `latestVersionNo`
- `selectedVersionId` only when viewing history

Use `calculationId` for save/update, never duplicate-name matching.

**Step 3: Replace field-by-field lossy normalizers**

Rules:

- same-schema latest loads should reset the form with the exact canonical payload
- migration/compat normalization should be isolated in a versioned migration helper
- do not hand-maintain partial lists of fields in each component

Recommended pattern:

```ts
const payload = migrateCalculationPayload(serverPayload);
reset(payload.inputs as CalculationInput, { keepDefaultValues: false });
onCalculationLoaded(payload.metadata, payload.revisionHistory, payload.linkedEquipmentId, payload.linkedEquipmentTag);
```

**Step 4: Add version history UI hooks without full UI polish**

Minimum behavior:

- list latest calculations
- save new version to current `calculationId`
- restore historical version through API

Defer rich history browser UI if needed, but keep hook methods ready.

**Step 5: Run app tests**

Run:

```bash
cd /Users/maetee/Code/process-engineering-suite/apps/pump-calculation
bun run test:run
```

```bash
cd /Users/maetee/Code/process-engineering-suite/apps/venting-calculation
bun run test:run
```

```bash
cd /Users/maetee/Code/process-engineering-suite/apps/vessels-calculation
bun run test:run
```

Expected: round-trip tests pass and old lossy behavior is gone.

**Step 6: Commit the app hook migration**

```bash
git add apps/pump-calculation apps/venting-calculation apps/vessels-calculation apps/calculation-template
git commit -m "feat(apps): use hybrid calculation persistence contract"
```

### Task 6: Migrate venting away from the legacy dedicated persistence shape

**Files:**
- Modify: `services/api/app/routers/venting.py`
- Modify: `services/api/app/models/venting_calculation.py`
- Modify: `services/api/app/services/db_service.py`
- Modify: `packages/api-client/src/modules/venting.ts`
- Modify: `apps/venting-calculation/src/lib/hooks/useSavedCalculations.ts`
- Modify: `services/api/tests/test_venting_metadata.py`

**Step 1: Decide the compatibility strategy**

Recommended first pass:

- keep venting calculation endpoints as compatibility wrappers
- internally back them with the shared calculation/version store
- mark dedicated `VentingCalculation` persistence as deprecated

**Step 2: Write compatibility tests**

Assert:

- old venting endpoints still work for create/list/get/update/restore
- each update still creates a new version in the shared store

**Step 3: Implement the compatibility layer**

Map old venting payloads into the shared calculation contract with `app = "venting-calculation"`.

**Step 4: Run venting API tests**

Run:

```bash
cd /Users/maetee/Code/process-engineering-suite/services/api
pytest tests/test_venting_metadata.py tests/test_calculation_versioning.py -v
```

Expected: both new and compatibility tests pass.

**Step 5: Commit compatibility support**

```bash
git add services/api/app/routers/venting.py services/api/app/models/venting_calculation.py services/api/app/services/db_service.py packages/api-client/src/modules/venting.ts apps/venting-calculation/src/lib/hooks/useSavedCalculations.ts services/api/tests/test_venting_metadata.py
git commit -m "feat(venting): back legacy endpoints with shared calculation store"
```

### Task 7: Add migration and restore safety checks

**Files:**
- Modify: `services/api/app/services/db_service.py`
- Create: `services/api/tests/test_calculation_migration.py`
- Modify: `apps/vessels-calculation/src/lib/hooks/useSavedCalculations.ts`

**Step 1: Add failing migration tests**

Cover:

- migration from local storage snapshots into version 1 rows
- migration from existing engineering-object-backed saves into new calculation records
- `version_kind = migration`
- restored records maintain source lineage

**Step 2: Implement migration helpers**

Migration rules:

- one current calculation row per legacy saved case
- one initial version row containing the full legacy payload
- preserve original save timestamp when available

**Step 3: Run migration tests**

Run:

```bash
cd /Users/maetee/Code/process-engineering-suite/services/api
pytest tests/test_calculation_migration.py tests/test_calculation_versioning.py -v
```

Expected: migration and restore lineage pass.

**Step 4: Commit the migration tooling**

```bash
git add services/api/tests/test_calculation_migration.py services/api/app/services/db_service.py apps/vessels-calculation/src/lib/hooks/useSavedCalculations.ts
git commit -m "feat(api): add calculation migration and restore lineage"
```

### Task 8: Final verification, docs, and cleanup

**Files:**
- Modify: `docs/plans/2026-03-13-calculation-save-load-hybrid-design.md`
- Optionally modify: `docs/DATABASE_SCHEMA.md`
- Optionally modify: `docs/ENGINEERING_OBJECT_PROPERTIES_REFERENCE.md`

**Step 1: Run repo verification**

Run:

```bash
cd /Users/maetee/Code/process-engineering-suite
bun turbo run check-types --filter=pump-calculation --filter=venting-calculation --filter=vessels-calculation
```

```bash
cd /Users/maetee/Code/process-engineering-suite
bun turbo run lint --filter=pump-calculation --filter=venting-calculation --filter=vessels-calculation
```

```bash
cd /Users/maetee/Code/process-engineering-suite/services/api
pytest tests/test_calculation_versioning.py tests/test_calculation_migration.py tests/test_venting_metadata.py tests/test_engineering_objects_endpoints.py -v
```

**Step 2: Update docs**

Record:

- final endpoint names
- schema names
- migration notes
- any temporary compatibility constraints for venting

**Step 3: Commit the final cleanup**

```bash
git add docs/DATABASE_SCHEMA.md docs/ENGINEERING_OBJECT_PROPERTIES_REFERENCE.md docs/plans/2026-03-13-calculation-save-load-hybrid-design.md
git commit -m "docs: finalize hybrid calculation persistence reference"
```

## Notes For Execution

- Do not start by changing UI behavior first. Lock the API contract and database semantics before migrating app hooks.
- Preserve file import/export support as a separate transport. It should map into the same canonical payload shape, not a second persistence model.
- Treat `calculationId` as identity. Names are user-facing labels only.
- Eliminate field-by-field save/load maps wherever possible. Use schema-aware payload migration helpers instead.
- Keep historical version rows immutable.

## Suggested Commit Order

1. `test(api): define calculation versioning contract`
2. `feat(api): add calculation and version persistence models`
3. `feat(api): add hybrid calculation save load endpoints`
4. `feat(client): add calculations api module`
5. `feat(apps): use hybrid calculation persistence contract`
6. `feat(venting): back legacy endpoints with shared calculation store`
7. `feat(api): add calculation migration and restore lineage`
8. `docs: finalize hybrid calculation persistence reference`
