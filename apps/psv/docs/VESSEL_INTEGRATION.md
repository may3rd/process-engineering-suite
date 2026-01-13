# Vessel Calculations Integration Guide

## Overview

The PSV app now uses the calc-engine vessel service for accurate wetted area calculations. This is primarily used for fire case scenarios in PSV sizing (API-521).

## Quick Start

### API Usage

```typescript
import { calculateWettedArea } from '@/lib/vesselCalculations';

const result = await calculateWettedArea({
  vesselType: 'vertical-torispherical',
  diameter: 3.5,
  length: 10.0,
  liquidLevel: 6.5
});

console.log(`Wetted area: ${result.wettedArea.toFixed(2)} m²`);
```

### Using the Utility Function

```typescript
import { calculateWettedArea } from '@/lib/vesselCalculations';

const result = await calculateWettedArea({
  vesselType: 'vertical-torispherical',
  diameter: 3.5,
  length: 10.0,
  liquidLevel: 6.5
});

console.log(`Wetted area: ${result.wettedArea.toFixed(2)} m²`);
console.log(`Liquid volume: ${result.liquidVolume.toFixed(2)} m³`);
console.log(`Percent full: ${result.percentFull.toFixed(1)}%`);
```

## Fire Exposure Area Calculation

For PSV fire sizing according to API-521:

```typescript
import { calculateFireExposureArea } from '@/lib/vesselCalculations';

// Unprotected vessel
const exposureArea = await calculateFireExposureArea(
  {
    vesselType: 'vertical-torispherical',
    diameter: 3.5,
    length: 10.0,
    liquidLevel: 6.5
  },
  false  // isProtected = false
);

console.log(`Fire exposure area: ${exposureArea.toFixed(2)} m²`);
```

## Available Vessel Types

### Vertical Vessels
- `vertical-torispherical` - Most common pressure vessel (ASME heads)
- `vertical-flat` - Flat heads
- `vertical-elliptical` - Elliptical 2:1 heads
- `vertical-hemispherical` - Hemispherical heads
- `vertical-conical` - Conical heads (requires headDistance)

### Horizontal Vessels
- `horizontal-torispherical`
- `horizontal-flat`
- `horizontal-elliptical`
- `horizontal-hemispherical`
- `horizontal-conical` (requires headDistance)

### Spherical
- `spherical` - Spherical storage tank

## Integration with Fire Case Scenarios

### Step 1: Get Vessel Data from User

In your fire case form, add fields for:
- Vessel type (dropdown)
- Diameter (number input, meters)
- Length / Height (number input, meters)
- Normal liquid level (number input, meters)
- Fire protection (checkbox)

### Step 2: Calculate Wetted Area

```typescript
import { calculateFireExposureArea } from '@/lib/vesselCalculations';

// In your fire case calculation function
async function calculateFireRelief(scenario: FireCase) {
  const wettedArea = await calculateFireExposureArea(
    {
      vesselType: scenario.vesselType,
      diameter: scenario.vesselDiameter,
      length: scenario.vesselLength,
      liquidLevel: scenario.normalLiquidLevel
    },
    scenario.hasFireProtection
  );

  // Use wetted area in API-521 fire sizing formula
  const Q = calculateFireLoadAPI521(wettedArea, scenario.fluidProperties);
  
  return Q;
}
```

### Step 3: Display Results

Show wetted area in the summary:

```tsx
<Typography variant="body2">
  Vessel Configuration: {scenario.vesselType}
</Typography>
<Typography variant="body2">
  Diameter: {scenario.vesselDiameter} m
</Typography>
<Typography variant="body2">
  Wetted Surface Area: {wettedArea.toFixed(2)} m²
</Typography>
```

## Unit Conversions

The vessel library works in SI units:
- **Diameter**: meters (m)
- **Length**: meters (m)
- **Liquid Level**: meters (m)
- **Wetted Area**: square meters (m²)
- **Volume**: cubic meters (m³)

Convert from imperial using the `convertUnit` utility:
```typescript
import { convertUnit } from '@eng-suite/physics';

// Convert diameter from feet to meters
const diameterM = convertUnit(diameterFt, 'ft', 'm');

// Convert length from feet to meters
const lengthM = convertUnit(lengthFt, 'ft', 'm');

// Convert liquid level from feet to meters
const liquidLevelM = convertUnit(liquidLevelFt, 'ft', 'm');

// Calculate wetted area (returns m²)
const wettedAreaM2 = vessel.wettedArea(liquidLevelM);

// Convert wetted area from m² to ft²
const wettedAreaFt2 = convertUnit(wettedAreaM2, 'm2', 'ft2');
```

## Example: Complete Fire Case Integration

```typescript
// In your SizingWorkspace or fire case calculation file
import { calculateFireExposureArea } from '@/lib/vesselCalculations';
import {
  calculateAPI521FireLoad,
  ENVIRONMENTAL_FACTORS,
  validateFireSizingInputs
} from '@/lib/api521';

interface FireCaseInput {
  vesselType: string;
  diameter: number;  // m
  length: number;    // m
  liquidLevel: number;  // m
  hasFireProtection: boolean;
  hasInsulation: boolean;
  hasWaterSpray: boolean;
  fluidLatentHeat: number;  // kJ/kg
  heightAboveGrade?: number;  // m (default 0)
}

function calculateFireReliefLoad(input: FireCaseInput): {
  reliefRate: number;  // kg/h
  heatAbsorption: number;  // W
  wettedArea: number;  // m²
  errors: string[];
} {
  // Get wetted area from vessel geometry
  const wettedArea = calculateFireExposureArea(
    {
      vesselType: input.vesselType as any,
      diameter: input.diameter,
      length: input.length,
      liquidLevel: input.liquidLevel
    },
    input.hasFireProtection
  );

  // Determine environmental factor based on protection
  let environmentalFactor = ENVIRONMENTAL_FACTORS.BARE;
  if (input.hasInsulation && input.hasWaterSpray) {
    environmentalFactor = ENVIRONMENTAL_FACTORS.INSULATED_WITH_WATER;
  } else if (input.hasWaterSpray) {
    environmentalFactor = ENVIRONMENTAL_FACTORS.WATER_SPRAY;
  } else if (input.hasInsulation) {
    environmentalFactor = ENVIRONMENTAL_FACTORS.INSULATED;
  }

  // Validate inputs
  const validation = validateFireSizingInputs(
    wettedArea,
    input.fluidLatentHeat,
    environmentalFactor
  );

  if (!validation.valid) {
    return {
      reliefRate: 0,
      heatAbsorption: 0,
      wettedArea,
      errors: validation.errors,
    };
  }

  // Calculate fire relief load per API-521
  const result = calculateAPI521FireLoad(
    wettedArea,
    input.fluidLatentHeat,
    environmentalFactor,
    input.heightAboveGrade ?? 0
  );

  return {
    reliefRate: result.reliefRate,
    heatAbsorption: result.heatAbsorption,
    wettedArea: result.wettedArea,
    errors: [],
  };
}
```

## Testing

Test the integration:

```typescript
// Test wetted area calculation
const testVessel = new VerticalTorisphericalVessel(3.0, 9.0);
const testWettedArea = testVessel.wettedArea(5.0);

console.assert(
  testWettedArea > 0 && testWettedArea < 1000,
  'Wetted area should be reasonable'
);

console.log('✅ Vessel calculations working correctly');
```

## Common Pitfalls

1. **Liquid level above total height**: The library handles this gracefully, but validate user input
2. **Zero or negative dimensions**: Add validation before creating vessels
3. **Wrong units**: Always convert to meters before passing to the library
4. **Conical vessels**: Remember to set `headDistance` for conical head types

## Need Help?

- Vessel geometry lives in `services/calc-engine/pes_calc/vessels/`
- API endpoints: `POST /vessels/wetted-area`, `POST /vessels/fire-exposure`
- Compare with Python implementation for validation
