# Pump Schematic Monochrome Redesign

**Date:** 2026-03-11
**Scope:** Redesign the live pump schematic as a report-ready monochrome engineering figure

## Goal

Replace the current mixed UI/drawing treatment with a simpler monochrome line drawing that looks appropriate inside a professional calculation report.

## Chosen Direction

Use a formal report-figure layout:

- monochrome linework only
- one clean outer drawing frame
- elevated source and destination vessels
- pump centered on the process axis
- small annotation boxes and labels
- one compact bottom data table instead of floating summary cards

## Composition

- Source vessel on the left, above the pump centerline
- Destination vessel on the right, above the pump centerline
- Pump on the central process axis
- Suction line drops from the source vessel to the pump axis
- Discharge line routes from the pump axis to the elevated destination vessel
- Datum line remains subtle and secondary

## Annotation Rules

- Local pressure labels remain close to the equipment or pump nozzles
- Losses become small rectangular note boxes under the process line
- Elevation remains annotation-only and should not distort equipment placement
- Bottom table contains suction, operating point, and discharge values in one aligned report-style block

## Visual Rules

- No soft dashboard cards
- No glass effect or tinted legend pills
- Main process line is the heaviest stroke
- Equipment outlines use secondary stroke weight
- Table/grid lines are lighter than the process path
- Typography remains plain, technical, and compact

## Non-Goals

- No animated effects
- No color accents
- No P&ID complexity beyond the current schematic scope
- No data-model changes
