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

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface CalculationInput {
  // Identification
  tag: string
  description?: string

  // Example numeric fields with units
  pressure: number // base unit: kPag
  temperature: number // base unit: C
  length: number // base unit: mm
  flowrate: number // base unit: m3/h

  // Example selection field
  category: "A" | "B" | "C"
}

// ─── Calculation Results ──────────────────────────────────────────────────────

export interface CalculationResult {
  mainMetric: number
  secondaryMetric: number
  summary: {
    isSafe: boolean
    margin: number
  }
  calculatedAt: string // ISO timestamp
}
