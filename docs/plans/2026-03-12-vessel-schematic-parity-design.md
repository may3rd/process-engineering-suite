# Vessel Schematic Parity Design

**Goal:** Make the exported PDF contain the exact live web schematic SVG instead of a separate re-rendered approximation.

## Problem

`apps/vessels-calculation` currently exports through `@react-pdf/renderer`, while the live schematic is rendered through the browser DOM/SVG engine. Matching the DOM SVG inside `react-pdf` has proven unreliable. Even when geometry is shared, the PDF still diverges in sizing, layout, and renderer behavior.

## Approach

Switch the export flow from `@react-pdf/renderer` to a dedicated printable HTML route in `apps/vessels-calculation`. That printable route will render the same React components used on the live page, especially the exact schematic component and its DOM `<svg>`, and then rely on the browser print engine for PDF generation.

The schematic will therefore be identical because it is no longer reimplemented. The export becomes “print the live DOM representation” instead of “translate the schematic into a second PDF-only rendering system.”

## Constraints

- Keep engineering math deterministic and in TypeScript, consistent with the scoped app rules.
- Preserve the current live schematic markup and styling.
- Keep the export entrypoint inside the existing action menu.
- Maintain browser-only implementation; do not add backend PDF infrastructure.

## Verification

- Add a regression test around the export action so it persists the print payload and opens the print route instead of calling `react-pdf`.
- Add a test around print payload storage helpers.
- Run targeted Vitest coverage for the new export flow.
- Manually render a sample print page and confirm the schematic is the same DOM/SVG component shown on the live page.
