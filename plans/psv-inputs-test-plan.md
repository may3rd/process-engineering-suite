# PSV Input Behavior Test Plan (Hybrid)

## Goal
Validate that input fields in `apps/psv/src/` support empty numeric values during editing, validate on blur/Enter, and correctly drive calculations such as Fire Case wetted area.

## Scope
- All input fields rendered from `apps/psv/src/`, with emphasis on numeric and unit-based inputs.
- Manual validation in Chrome and Safari.
- Automated tests for shared numeric input components and Fire Case calculation.

## Out of scope
- Cross-app flows outside `apps/psv/src/`.
- Non-PSV apps and backend APIs.

## Target browsers
- Chrome (latest)
- Safari (latest)

## Expected input behavior (numeric)
- Accept empty value during editing without error state until blur/Enter.
- Validate and show error state on blur or Enter.
- Escape key restores last committed value (where supported by component).
- Unit changes preserve numeric intent and re-calculate when valid.

## Manual test checklist (Chrome + Safari)
### Global behavior (all pages)
- Numeric inputs accept empty values during editing without error until blur/Enter.
- Blur or Enter triggers validation and inline error state/messages.
- Escape restores last committed value where supported.
- Unit changes preserve numeric intent and update derived values when valid.

### Per-page checklist
1) Dashboard dialogs (Customer/Plant/Unit/Area/Project/PSV/Equipment)
- Clear required numeric/date fields, confirm errors appear on blur/Enter.
- Switch selects and verify dependent fields reset or validate properly.

2) PSV creation wizard (`PsvCreationWizard`)
- Clear/set pressure, operating pressure/temp, design pressure/temp and confirm blur/Enter validation.
- Ensure step navigation blocks when required numeric fields are invalid.

3) Sizing workspace (`SizingWorkspace`)
- For each tab (Setup/Inlet/Outlet/Valve Selection), clear numeric fields and confirm no immediate error until blur/Enter.
- Enter invalid values (negative pressure/temperature) and confirm validation messages.
- Run calculation and confirm it is blocked until required fields are valid.

4) Scenario editor and dialogs
- Scenario editor (`ScenarioEditor`): clear relieving rate/temp/pressure and confirm blur/Enter validation.
- Blocked Outlet / Tube Rupture / Control Valve Failure: validate step gating and numeric input behavior.

5) Fire Case (API-521)
- Select equipment, clear and re-enter latent heat/relieving temp/height above grade; validate on blur/Enter.
- Liquid Levels: clear then re-enter a valid value; confirm wetted area preview appears and updates.
- Click "Calculate Fire Relief Load" and confirm summary values update without validation errors.

6) Equipment details forms
- Vessel/Column/Reactor/Pump/Heat Exchanger/Piping: clear numeric/unit fields and verify blur/Enter validation.
- Confirm any derived fields (e.g., wetted area/volume) update when values are valid.

7) Account/System pages
- Account settings: change selects and numeric fields; confirm validation and save gating.
- System tab (backup/restore): ensure file input and confirm text gating behaves correctly.

## Automated tests (current)
- `NumericInput` empty value handling and blur/Enter commit behavior.
- `UnitSelector` empty value handling and blur/Enter commit behavior.
- `API521Calculator` calculation path emits results and renders summary.

## Automated tests (next)
- Scenario-specific validation flows for blocked outlet, tube rupture, and control valve failure.
- Sizing workspace validation and calculation smoke tests.

## Test commands
- `cd apps/psv && bun run test`
- `cd apps/psv && bun run test:run`
- `cd apps/psv && ./scripts/test.sh`
