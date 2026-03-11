# Pump Input Sections Collapsible Design

**Date:** 2026-03-11
**Scope:** Add collapse controls to pump calculator input sections

## Goal

Make the calculator easier to scan by collapsing input sections by default while keeping results and summary cards unchanged.

## Chosen Approach

Implement collapsible behavior centrally in `SectionCard` and opt the input sections into it.

This avoids duplicating collapse logic across every section and keeps the change easy to maintain.

## Design

- Extend `SectionCard` with optional collapse props.
- Use the existing Radix collapsible wrapper in `src/components/ui/collapsible.tsx`.
- Render a chevron toggle in the header when collapse is enabled.
- Default input sections to collapsed with `defaultOpen={false}`.
- Leave results cards, metadata, validation cards, and the schematic untouched unless they explicitly opt in later.

## UX Rules

- Input sections start collapsed on first render.
- Each section can be expanded independently.
- Collapse state is local to the rendered component tree and is not persisted.
- The entire header toggle should be obvious and keyboard accessible.

## Testing

- Add a focused component test for `SectionCard` collapse behavior.
- Verify the body is hidden by default when `defaultOpen={false}`.
- Verify clicking the toggle expands the body.

## Non-Goals

- Persisting collapse state
- Global expand/collapse all controls
- Collapsing results-side cards
