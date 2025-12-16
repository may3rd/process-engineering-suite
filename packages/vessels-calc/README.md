# @eng-suite/vessels

Vessel and tank calculation library for process engineering applications.

## Features

- **Comprehensive Vessel Types**: Vertical, horizontal, spherical vessels with various head types
- **Accurate Calculations**: Volume, wetted area, surface area calculations
- **Type-Safe**: Full TypeScript support
- **Zero Dependencies**: Pure JavaScript calculations
- **Browser Compatible**: Runs client-side with no API calls

## Installation

```bash
# In your app's package.json
"@eng-suite/vessels": "workspace:*"
```

## Usage

### Basic Example

```typescript
import { VerticalTorisphericalVessel } from '@eng-suite/vessels';

// Create a vessel
const vessel = new VerticalTorisphericalVessel(
  3.0,  // diameter in meters
  9.0   // length in meters
);

// Set liquid levels
vessel.highLiquidLevel = 8.0;
vessel.lowLiquidLevel = 2.0;

// Get calculations
const wettedArea = vessel.wettedArea(5.0);  // at 5m liquid level
const volume = vessel.liquidVolume(5.0);
const totalVolume = vessel.totalVolume;
const workingVolume = vessel.workingVolume;
```

### PSV Fire Case Example

```typescript
import { VerticalTorisphericalVessel } from '@eng-suite/vessels';

function calculateFireExposureArea(
  diameter: number,
  length: number,
  liquidLevel: number
): number {
  const vessel = new VerticalTorisphericalVessel(diameter, length);
  
  // Wetted area is used in API-521 fire case calculations
  return vessel.wettedArea(liquidLevel);
}

// Calculate for a protected vessel
const wettedArea = calculateFireExposureArea(3.5, 10.0, 6.5);
console.log(`Wetted surface area: ${wettedArea.toFixed(2)} m²`);
```

## Available Vessel Types

### Vertical Vessels
- `VerticalFlatVessel` - Flat heads
- `VerticalConicalVessel` - Conical heads
- `VerticalEllipticalVessel` - Elliptical (2:1) heads
- `VerticalHemisphericalVessel` - Hemispherical heads
- `VerticalTorisphericalVessel` - Torispherical (ASME) heads

### Horizontal Vessels
- `HorizontalFlatVessel` - Flat heads
- `HorizontalConicalVessel` - Conical heads
- `HorizontalEllipticalVessel` - Elliptical heads
- `HorizontalHemisphericalVessel` - Hemispherical heads
- `HorizontalTorisphericalVessel` - Torispherical heads

### Tanks
- `VerticalFlatTank` - Flat bottom, no top head
- `VerticalConicalTank` - Conical bottom
- `VerticalEllipticalTank` - Elliptical bottom
- `VerticalHemisphericalTank` - Hemispherical bottom
- `VerticalTorisphericalTank` - Torispherical bottom
- `SphericalTank` - Spherical storage

## API Reference

### Common Properties

All vessels inherit from the `Vessel` base class:

```typescript
// Dimensions
vessel.diameter: number
vessel.length: number
vessel.totalHeight: number
vessel.tangentHeight: number

// Liquid levels
vessel.highLiquidLevel: number
vessel.lowLiquidLevel: number
vessel.liquidLevel: number

// Volumes
vessel.totalVolume: number          // Total vessel volume
vessel.shellVolume: number          // Cylindrical section volume
vessel.headVolume: number           // Head sections volume
vessel.effectiveVolume: number      // Volume at high liquid level
vessel.workingVolume: number        // Between high and low levels
vessel.tangentVolume: number        // Volume at tangent line

// Surface Areas
vessel.totalSurfaceArea: number     // Total external area
vessel.shellSurfaceArea: number     // Cylindrical section area
vessel.headSurfaceArea: number      // Head sections area
```

### Methods

```typescript
// Calculate liquid volume at specific level
vessel.liquidVolume(level: number): number

// Calculate wetted surface area at specific level
vessel.wettedArea(level: number): number

// Component-specific calculations
vessel.headLiquidVolume(level: number): number
vessel.shellLiquidVolume(level: number): number
vessel.headWettedArea(level: number): number
vessel.shellWettedArea(level: number): number
```

## TypeScript Types

```typescript
import type {
  VesselType,
  VesselConfig,
  VesselResults,
  VesselDimensions
} from '@eng-suite/vessels';
```

## License

MIT
