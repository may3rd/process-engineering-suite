# Engineering Object Properties Reference

This document records the JSONB payloads currently stored or expected in `engineering_objects.properties`.

It is a reference document, not a strict schema contract. Keys may be absent, and some object classes reuse only part of the documented structure.

## Common Structure

Most engineering objects use some combination of these top-level keys inside `properties`:

| Key | Type | Purpose |
|---|---|---|
| `details` | object | Object-class-specific process, geometry, or equipment data |
| `design_parameters` | object | Canonical design pressure / temperature fields |
| `meta` | object | App-managed metadata for saved calculations |
| `inputs` | object | Raw calculator input snapshot |
| `result` | object or null | Calculator result snapshot |
| `calculationMetadata` | object | App-level calculation metadata |
| `revisionHistory` | array | Revision history snapshot |
| `linkedEquipmentId` | string or null | Linked `engineering_objects.uuid` |
| `linkedEquipmentTag` | string or null | Linked engineering object tag |

## Canonical Design Parameters

When present, canonical design data lives in `properties.design_parameters`.

| Key | Type | Notes |
|---|---|---|
| `designPressure` | number or null | Numeric value in the unit below |
| `designPressureUnit` | string | Usually `barg` in current apps |
| `mawp` | number or null | Numeric value in the unit below |
| `mawpUnit` | string | Usually `barg` in current apps |
| `designTemperature` | number or null | Numeric value in the unit below |
| `designTempUnit` | string | Usually `C` in current apps |

## Equipment Object Classes

These are the equipment-like object classes currently handled in PSV or linked from vessel / venting flows.

### `VESSEL`

Expected primary payload:

- `properties.details.orientation`: `horizontal` or `vertical`
- `properties.details.innerDiameter`: number, mm
- `properties.details.tangentToTangentLength`: number, mm
- `properties.details.headType`: `ellipsoidal` | `hemispherical` | `torispherical` | `flat`
- `properties.details.wallThickness`: number, mm, optional
- `properties.details.insulated`: boolean
- `properties.details.insulationType`: string, optional
- `properties.details.insulationThickness`: number, mm, optional
- `properties.details.normalLiquidLevel`: number, optional
- `properties.details.lowLiquidLevel`: number, optional
- `properties.details.highLiquidLevel`: number, optional
- `properties.details.wettedArea`: number, m2, optional
- `properties.details.totalSurfaceArea`: number, m2, optional
- `properties.details.volume`: number, m3, optional

Common extension written by `apps/vessels-calculation` when syncing back to linked equipment:

- `properties.details.insideDiameter`
- `properties.details.shellLength`
- `properties.details.orientation`
- `properties.details.headType`
- `properties.details.wallThickness`
- `properties.details.vesselCalculation`

`vesselCalculation` currently contains:

- `inputs`
- `result`
- `calculationMetadata`
- `revisionHistory`
- `syncedAt`

### `TANK`

Expected primary payload:

- `properties.details.tankType`: `atmospheric` | `low_pressure` | `pressure`
- `properties.details.orientation`: `horizontal` or `vertical`
- `properties.details.innerDiameter`: number, mm
- `properties.details.height`: number, mm
- `properties.details.roofType`: `fixed_cone` | `fixed_dome` | `floating_internal` | `floating_external` | `none`, optional
- `properties.details.wallThickness`: number, mm, optional
- `properties.details.insulated`: boolean
- `properties.details.insulationType`: string, optional
- `properties.details.insulationThickness`: number, mm, optional
- `properties.details.normalLiquidLevel`: number, optional
- `properties.details.lowLiquidLevel`: number, optional
- `properties.details.highLiquidLevel`: number, optional
- `properties.details.wettedArea`: number, m2, optional
- `properties.details.volume`: number, m3, optional
- `properties.details.heelVolume`: number, m3, optional

Common extension written by `apps/venting-calculation` when syncing back to linked tank:

- `properties.details.innerDiameter`
- `properties.details.height`
- `properties.details.insulated`
- `properties.details.insulationThickness`
- `properties.details.insulationConductivity`
- `properties.details.insideHeatTransferCoeff`
- `properties.details.insulatedSurfaceArea`
- `properties.details.latitude`
- `properties.details.workingTemperature`
- `properties.details.workingTemperatureUnit`
- `properties.details.fluid`
- `properties.details.vapourPressure`
- `properties.details.vapourPressureUnit`
- `properties.details.flashPoint`
- `properties.details.flashPointUnit`
- `properties.details.boilingPoint`
- `properties.details.boilingPointUnit`
- `properties.details.latentHeat`
- `properties.details.latentHeatUnit`
- `properties.details.relievingTemperature`
- `properties.details.relievingTemperatureUnit`
- `properties.details.molecularWeight`
- `properties.details.tankConfiguration`
- `properties.details.volume`
- `properties.details.wettedArea`
- `properties.details.ventingCalculation`

`ventingCalculation` currently contains:

- `inputs`
- `result`
- `syncedAt`

### `COLUMN`

Expected primary payload:

- `properties.details.innerDiameter`
- `properties.details.tangentToTangentHeight`
- `properties.details.headType`
- `properties.details.wallThickness`
- `properties.details.insulated`
- `properties.details.insulationType`
- `properties.details.insulationThickness`
- `properties.details.normalLiquidLevel`
- `properties.details.lowLiquidLevel`
- `properties.details.highLiquidLevel`
- `properties.details.numberOfTrays`
- `properties.details.traySpacing`
- `properties.details.columnType`
- `properties.details.packingHeight`
- `properties.details.wettedArea`
- `properties.details.totalSurfaceArea`
- `properties.details.volume`

### `PUMP`

Expected primary payload:

- `properties.details.pumpType`
- `properties.details.ratedFlow`
- `properties.details.ratedHead`
- `properties.details.maxDischargePressure`
- `properties.details.shutoffHead`
- `properties.details.npshRequired`
- `properties.details.efficiency`
- `properties.details.motorPower`
- `properties.details.reliefValveSetPressure`
- `properties.details.maxViscosity`
- `properties.details.suctionPressure`
- `properties.details.dischargePressure`
- `properties.details.fluidTemperature`
- `properties.details.fluidDensity`

### `COMPRESSOR`

Expected primary payload:

- `properties.details.compressorType`
- `properties.details.ratedCapacity`
- `properties.details.standardCapacity`
- `properties.details.suctionPressure`
- `properties.details.dischargePressure`
- `properties.details.compressionRatio`
- `properties.details.suctionTemperature`
- `properties.details.dischargeTemperature`
- `properties.details.efficiency`
- `properties.details.motorPower`
- `properties.details.surgeFlow`
- `properties.details.antiSurgeValveSetpoint`

### `HEAT_EXCHANGER`

Expected primary payload:

- `properties.details.hxType`
- `properties.details.shellDiameter`
- `properties.details.tubeLength`
- `properties.details.numberOfTubes`
- `properties.details.tubePitch`
- `properties.details.numberOfPasses`
- `properties.details.shellSidePressure`
- `properties.details.tubeSidePressure`
- `properties.details.shellSideTemperature`
- `properties.details.tubeSideTemperature`
- `properties.details.heatDuty`
- `properties.details.heatTransferArea`
- `properties.details.wettedArea`

### `CONTROL_VALVE`

Expected primary payload:

- `properties.details.valveType`
- `properties.details.bodySize`
- `properties.details.rating`
- `properties.details.cv`
- `properties.details.cg`
- `properties.details.xT`
- `properties.details.fL`
- `properties.details.fd`
- `properties.details.actuatorType`
- `properties.details.failPosition`
- `properties.details.upstreamPressure`
- `properties.details.downstreamPressure`
- `properties.details.normalFlow`
- `properties.details.maxFlow`
- `properties.details.trimType`
- `properties.details.rangeability`

### `PIPING`

Expected primary payload:

- `properties.details.nominalDiameter`
- `properties.details.schedule`
- `properties.details.material`
- `properties.details.totalLength`
- `properties.details.designPressure`
- `properties.details.designTemperature`
- `properties.details.insulated`
- `properties.details.insulationType`
- `properties.details.insulationThickness`

### `REACTOR`

Current status:

- No strict shared shape is enforced yet.
- Current code treats this as free-form under `properties.details`.
- Recommended approach is to keep process / geometry / duty data grouped under `details`.

### `VENDOR_PACKAGE`

Current status:

- No strict shared shape is enforced yet.
- Current code treats this as free-form under `properties.details`.

### `OTHER`

Current status:

- Free-form under `properties.details`.

## Calculation Object Classes

These are saved-calculation records stored in `engineering_objects`, distinct from physical equipment.

### `VESSEL_CALCULATION`

Written by `apps/vessels-calculation`.

Expected payload:

- `properties.inputs`: full vessel calculator input snapshot
- `properties.result`: vessel calculation result or `null`
- `properties.linkedEquipmentId`: linked engineering object UUID or `null`
- `properties.linkedEquipmentTag`: linked engineering object tag or `null`
- `properties.calculationMetadata`: optional metadata block
- `properties.revisionHistory`: revision history array
- `properties.meta.app`: `vessel`
- `properties.meta.name`: saved calculation name
- `properties.meta.description`: saved calculation description
- `properties.meta.isActive`: soft-delete flag inside payload
- `properties.meta.deletedAt`: soft-delete timestamp or `null`
- `properties.meta.createdAt`
- `properties.meta.updatedAt`
- `properties.meta.migratedFromLocalStorage`

## Notes

- `properties.details` is intentionally flexible and may contain both canonical fields and app-specific sync blocks.
- `properties.design_parameters` is the canonical home for design pressure / temperature values.
- Soft delete for equipment should use table columns `is_active` and `deleted_at`. Some saved-calculation flows also keep app-level soft-delete metadata in `properties.meta`.
- If a new app starts writing a new object class or new `details` keys, this file should be updated in the same change.
