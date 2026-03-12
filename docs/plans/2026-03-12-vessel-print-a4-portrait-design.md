# Vessel Print A4 Portrait Design

**Goal:** Fit the browser print export for `apps/vessels-calculation` into a single A4 portrait page while keeping the live schematic SVG unchanged.

## Problem

The current print route reuses the live schematic correctly, but the surrounding report layout is still too spacious for a predictable single-page A4 portrait export. The app shell toolbar also consumes print space that should not appear in the final document.

## Approach

Keep the exact live schematic renderer and make the print route more document-like. The print layout will use a tighter width budget aligned to A4 portrait, smaller spacing and typography in print, denser metric tiles, and print-only CSS for page size and margins.

The app toolbar will be hidden in print so the actual report content gets the full printable area. The implementation will stay browser-only and continue using the HTML print route introduced for schematic parity.

## Constraints

- Preserve the existing live schematic components and SVG markup.
- Keep inputs and results visible; do not drop report sections just to force one page.
- Prefer layout compaction over browser print scaling.
- Keep the change scoped to print/export behavior.

## Verification

- Add a regression test for portrait print layout hooks in `PrintReportContent`.
- Run focused print/export Vitest coverage.
- Run app typecheck, lint, and build.
- Manually confirm the report compacts into a single A4 portrait print preview in the browser.
