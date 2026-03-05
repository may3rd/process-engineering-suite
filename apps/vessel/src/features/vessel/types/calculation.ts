export type EquipmentType = 'vessel' | 'tank';

export type Orientation = 'vertical' | 'horizontal';

export type VesselShape =
  | 'flat'
  | 'elliptical'
  | 'hemispherical'
  | 'torispherical'
  | 'conical'
  | 'spherical';

export interface VesselCalculationInput {
  equipmentType: EquipmentType;
  orientation: Orientation;
  shape: VesselShape;
  insideDiameterM: number;
  wallThicknessM: number;
  tanTanLengthM: number;
  headDepthM?: number;
  hllM?: number;
  lllM?: number;
  oflM?: number;
  liquidLevelM: number;
  vesselMaterialDensityKgM3?: number;
  liquidDensityKgM3?: number;
  flowOutM3H?: number;
  flowRateM3H?: number;
  outletDiameterM?: number;
}

export interface VesselGeometryOutput {
  insideRadiusM: number;
  outsideDiameterM: number;
  outsideRadiusM: number;
  totalHeightM: number;
  tangentHeightM: number;
}

export interface VesselSurfaceAreaOutput {
  headsM2: number;
  shellM2: number;
  totalM2: number;
  wettedM2: number;
}

export interface VesselVolumeOutput {
  headsM3: number;
  shellM3: number;
  totalM3: number;
  tangentM3: number;
  effectiveM3: number;
  efficiencyPct: number;
  workingM3: number;
  overflowM3: number;
  partialM3: number;
}

export interface VesselMassOutput {
  emptyKg: number;
  liquidKg: number;
  fullKg: number;
}

export interface VesselTimingOutput {
  surgeMin?: number;
  inventoryHr?: number;
}

export interface VesselWarning {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface VesselCalculationOutput {
  geometry: VesselGeometryOutput;
  surfaceArea: VesselSurfaceAreaOutput;
  volume: VesselVolumeOutput;
  mass: VesselMassOutput;
  timing: VesselTimingOutput;
  warnings: VesselWarning[];
  calculatedAt: string;
}
