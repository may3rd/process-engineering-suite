# Pump Schematic Design

**Date:** 2026-03-11
**Scope:** Improve the on-screen SVG schematic in `apps/pump-calculation`

## Goal

Make the live pump system schematic easier to read and more resilient across equipment combinations, elevations, and incomplete form states without changing calculation behavior.

## Current State

The calculator already renders a live SVG schematic in `PumpSystemSchematic.tsx`. It correctly reflects core form inputs and computed pressures, but the component mixes geometry, rendering, and annotation rules in one large block. That makes layout collisions and incremental visual changes harder to manage.

## Chosen Approach

Refactor the current SVG into clearer layout helpers while preserving the existing data model and placement in the results panel.

This keeps feature scope tight:

- no export flow yet
- no new calculation inputs
- no report-generation changes
- no backend work

## Design Changes

### Layout

- Compute source, pump, and destination geometry from a shared layout model rather than scattered constants.
- Keep the process path visually dominant.
- Reserve stable annotation zones above equipment, around the pump, and below the pipe run so labels do not overlap as often.

### Visual Hierarchy

- Use stronger line weight and contrast for the main process path.
- Keep equipment silhouettes lighter than the process path.
- Group result labels into consistent cards or callout boxes inside the SVG so pump values, endpoint pressures, and flow are visually distinct.
- Improve the legend so it reads as part of the schematic rather than leftover helper text.

### Responsiveness

- Preserve the existing `viewBox`-based scaling.
- Reduce text crowding on narrower widths by using shorter labels and more deliberate placement.
- Keep the diagram readable in empty, invalid, and fully calculated states.

### Maintainability

- Extract small render helpers for repeated callout patterns.
- Move derived geometry into pure helper functions so future changes can be tested and reasoned about without editing the entire SVG body.

## Non-Goals

- Exporting the schematic to image or PDF
- Building a full P&ID generator
- Adding new process equipment inputs
- Changing pump calculation formulas

## Verification

- Run app-level lint
- Run app-level type check
- Run targeted test command if any schematic tests are added

## Risks

- The user already has local edits in `ResultsPanel.tsx` and an untracked `PumpSystemSchematic.tsx`, so changes must build on the current worktree state rather than assume repository baseline.
