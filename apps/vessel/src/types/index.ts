// ─── Enums ────────────────────────────────────────────────────────────────────

export enum VesselOrientation {
  VERTICAL = "Vertical",
  HORIZONTAL = "Horizontal",
}

export enum HeadType {
  FLAT = "Flat / Blind",
  ELLIPSOIDAL_2_1 = "2:1 Ellipsoidal",
  HEMISPHERICAL = "Hemispherical",
  TORISPHERICAL_80_10 = "Torispherical (ASME F&D 80:10)",
  CONICAL = "Conical",
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
  orientation: VesselOrientation
  headType: HeadType

  // Geometry — all in mm (base unit)
  insideDiameter: number
  shellLength: number         // tangent-to-tangent length
  wallThickness?: number      // mm
  headDepth?: number          // mm (auto-calculated from headType unless overridden)

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
  surgeTime: number | null    // hours — time to fill from LLL to HLL at given flowrate
  inventory: number | null    // hours — time to drain from HLL to LLL at given flowrate
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
