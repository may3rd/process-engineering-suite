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

export interface DerivedGeometry {
  // Add derived properties useful for results
  ready: boolean
}

export enum CalculationStatus {
  SUCCESS = "success",
  WARNING = "warning",
  ERROR = "error",
}

export interface ValidationIssue {
  code: string
  message: string
  severity: "error" | "warning" | "info"
  field?: string
}

export interface CalculationInput {
  tag: string
  description?: string
  metadata: CalculationMetadata
  // Add logic-specific inputs here
}

export interface CalculationResult {
  status: CalculationStatus
  // Add calculated outputs here
}
