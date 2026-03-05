import type { components } from '@eng-suite/types';
import { apiClient } from './client';
import type { VesselCalculationInput, VesselCalculationOutput } from '../types/calculation';
import type {
  VesselCalculationMetadata,
  VesselRevisionRecord,
} from '../types/persistence';

type EquipmentResponse = components['schemas']['EquipmentResponse'];
type EquipmentUpdate = components['schemas']['EquipmentUpdate'];

export interface SyncEquipmentPayload {
  equipmentId: string;
  calculationId?: string;
  calculationName: string;
  input: VesselCalculationInput;
  result: VesselCalculationOutput | null;
  metadata: VesselCalculationMetadata;
  revisionHistory: VesselRevisionRecord[];
}

export async function syncCalculationToEquipment({
  equipmentId,
  calculationId,
  calculationName,
  input,
  result,
  metadata,
  revisionHistory,
}: SyncEquipmentPayload): Promise<EquipmentResponse> {
  const current = await apiClient.equipment.get(equipmentId);
  const existingDetails = (current.details ?? {}) as Record<string, unknown>;

  const details: Record<string, unknown> = {
    ...existingDetails,
    vesselCalculation: {
      calculationId,
      calculationName,
      metadata,
      revisionHistory,
      inputs: input,
      result,
      syncedAt: new Date().toISOString(),
    },
    vesselGeometry: {
      orientation: input.orientation,
      shape: input.shape,
      insideDiameterM: input.insideDiameterM,
      tanTanLengthM: input.tanTanLengthM,
      liquidLevelM: input.liquidLevelM,
    },
    volume: result?.volume.totalM3 ?? existingDetails.volume ?? null,
    wettedArea: result?.surfaceArea.wettedM2 ?? existingDetails.wettedArea ?? null,
  };

  const payload: EquipmentUpdate = {
    details,
  };

  return apiClient.equipment.update(equipmentId, payload);
}
