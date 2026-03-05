import type { VesselCalculationInput, VesselCalculationOutput } from './calculation';

export interface VesselCalculationMetadata {
  projectNumber: string;
  projectName: string;
  documentNumber: string;
  title: string;
  client: string;
}

export interface VesselRevisionRecord {
  rev: string;
  by: string;
  byDate?: string;
  checkedBy: string;
  checkedDate?: string;
  approvedBy: string;
  approvedDate?: string;
}

export interface VesselCalculationRecord {
  id: string;
  name: string;
  description?: string;
  equipmentId?: string | null;
  equipmentTag?: string | null;
  metadata: VesselCalculationMetadata;
  revisionHistory: VesselRevisionRecord[];
  inputs: VesselCalculationInput;
  results: VesselCalculationOutput | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface VesselCalculationSavePayload {
  name: string;
  description?: string;
  equipmentId?: string | null;
  equipmentTag?: string | null;
  metadata: VesselCalculationMetadata;
  revisionHistory?: VesselRevisionRecord[];
  inputs: VesselCalculationInput;
  results: VesselCalculationOutput | null;
}

export const EMPTY_VESSEL_METADATA: VesselCalculationMetadata = {
  projectNumber: '',
  projectName: '',
  documentNumber: '',
  title: '',
  client: '',
};
