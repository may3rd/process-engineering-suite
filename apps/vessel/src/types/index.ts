// ─── Enums ────────────────────────────────────────────────────────────────────

export enum VesselOrientation {
  VERTICAL = "Vertical",
  HORIZONTAL = "Horizontal",
}

export enum EquipmentMode {
  VESSEL = "Vessel",
  TANK = "Tank",
}

export enum TankType {
  TOP_ROOF = "Top Roof Tank",
  SPHERICAL = "Spherical Tank",
}

export enum TankRoofType {
  FLAT = "Flat Roof",
  CONE = "Cone Roof",
  DOME = "Dome Roof",
}

export enum HeadType {
  FLAT = "Flat / Blind",
  ELLIPSOIDAL_2_1 = "2:1 Ellipsoidal",
  HEMISPHERICAL = "Hemispherical",
  TORISPHERICAL_80_10 = "Torispherical (ASME F&D 80:10)",
  CONICAL = "Conical",
}

export enum VesselMaterial {
  CS = "CS (Carbon Steel)",
  LTCS = "LTCS (Low-Temperature Carbon Steel)",
  A387_22 = "Alloy Steel A387 Gr22",
  SS304 = "SS 304",
  SS304L = "SS 304L",
  SS316 = "SS 316",
  SS316L = "SS 316L",
  DUPLEX_2205 = "Duplex 2205",
  SUPER_DUPLEX_2507 = "Super Duplex 2507",
  AL6061 = "Aluminum 6061",
  MONEL_400 = "Monel 400",
  TITANIUM_GR2 = "Titanium Gr2",
}

// ─── Metadata & Revisions ─────────────────────────────────────────────────────

export interface CalculationMetadata {
  projectNumber: string
  documentNumber: string
  title: string
  projectName: string
  client: string
}

export interface RevisionRecord {
  rev: string
  by: string
  byDate?: string
  checkedBy: string
  checkedDate?: string
  approvedBy: string
  approvedDate?: string
}

// ─── Input ────────────────────────────────────────────────────────────────────

export interface CalculationInput {
  // Identification
  tag: string
  description?: string

  // Configuration
  equipmentMode?: EquipmentMode
  orientation?: VesselOrientation
  headType?: HeadType
  tankType?: TankType
  tankRoofType?: TankRoofType
  material?: VesselMaterial

  // Geometry — all in mm (base unit)
  insideDiameter: number
  shellLength?: number        // tangent-to-tangent length (vessel) or shell height (tank)
  wallThickness?: number      // mm
  materialDensity?: number     // kg/m3 (base unit), overrides selected material default if provided
  headDepth?: number          // mm (auto-calculated from headType unless overridden)
  roofHeight?: number         // mm (for cone/dome roof tank)
  bootHeight?: number         // mm (support elevation reference by equipment/orientation)

  // Levels — all in mm
  liquidLevel?: number
  hll?: number                // high liquid level
  lll?: number                // low liquid level
  ofl?: number                // overflow level

  // Fluid properties
  density?: number            // kg/m3 (base unit)
  flowrate?: number           // m3/h (base unit)

  // Metadata
  metadata: CalculationMetadata
}

// ─── Calculation Outputs ──────────────────────────────────────────────────────

export interface VolumeResult {
  headVolume: number          // m3 — volume of both heads combined
  shellVolume: number         // m3 — cylindrical shell only
  totalVolume: number         // m3 — full vessel (shell + heads)
  tangentVolume: number       // m3 — volume within tangent lines (shell only)
  effectiveVolume: number     // m3 — usable volume (below OFL or total if no OFL)
  workingVolume: number       // m3 — between LLL and HLL (or 0 if levels not set)
  overflowVolume: number      // m3 — above OFL (or 0 if no OFL)
  partialVolume: number | null // m3 — volume at liquid level (null if no level set)
}

export interface SurfaceAreaResult {
  headSurfaceArea: number     // m2 — both heads combined
  shellSurfaceArea: number    // m2 — cylindrical shell
  totalSurfaceArea: number    // m2 — shell + heads
  wettedSurfaceArea: number   // m2 — area in contact with liquid (at liquid level)
}

export interface MassResult {
  massEmpty: number | null    // kg — empty vessel mass (null if no wall thickness)
  massLiquid: number | null   // kg — mass of liquid at liquid level (null if no density)
  massFull: number | null     // kg — mass of liquid filling entire vessel (null if no density)
}

export interface TimingResult {
  surgeTime: number | null    // hours — time across LLL↔HLL band at given flowrate (requires HLL and LLL)
  inventory: number | null    // hours — time represented by current LL volume (or effective volume if LL is not set)
}

export interface CalculationResult {
  volumes: VolumeResult
  surfaceAreas: SurfaceAreaResult
  masses: MassResult
  timing: TimingResult
  headDepthUsed: number       // mm — actual head depth used in calculation
  calculatedAt: string        // ISO timestamp
}

// ─── Equipment Link (API) ─────────────────────────────────────────────────────

export interface EngineeringObjectPayload {
  tag: string
  object_type: string
  properties: Record<string, unknown>
  status: string | null
}

export interface EquipmentPushPayload {
  object_type: string
  properties: {
    inputs: CalculationInput
    result: CalculationResult
    savedAt: string
  }
  status: string
}

export type EquipmentLinkStatus = 'idle' | 'linked' | 'unlinked' | 'loading' | 'error'
