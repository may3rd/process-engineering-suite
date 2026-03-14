import type { RequestFn } from '../client';

export interface CalculationRecord {
  id: string;
  app: string;
  areaId?: string | null;
  ownerId?: string | null;
  name: string;
  description: string;
  status: string;
  tag?: string | null;
  isActive: boolean;
  linkedEquipmentId?: string | null;
  linkedEquipmentTag?: string | null;
  latestVersionNo: number;
  latestVersionId?: string | null;
  inputs: Record<string, unknown>;
  results?: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  revisionHistory: Array<Record<string, unknown>>;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
}

export interface CalculationVersionRecord {
  id: string;
  calculationId: string;
  versionNo: number;
  versionKind: string;
  inputs: Record<string, unknown>;
  results?: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  revisionHistory: Array<Record<string, unknown>>;
  linkedEquipmentId?: string | null;
  linkedEquipmentTag?: string | null;
  sourceVersionId?: string | null;
  changeNote?: string | null;
  createdAt?: string | null;
}

export interface CalculationSavePayload {
  app: string;
  areaId?: string | null;
  ownerId?: string | null;
  name: string;
  description?: string | null;
  status?: string | null;
  tag?: string | null;
  inputs: Record<string, unknown>;
  results?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  revisionHistory?: Array<Record<string, unknown>>;
  linkedEquipmentId?: string | null;
  linkedEquipmentTag?: string | null;
}

export interface CalculationUpdatePayload {
  name?: string | null;
  description?: string | null;
  status?: string | null;
  tag?: string | null;
  inputs?: Record<string, unknown>;
  results?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  revisionHistory?: Array<Record<string, unknown>>;
  linkedEquipmentId?: string | null;
  linkedEquipmentTag?: string | null;
  changeNote?: string | null;
}

export interface RestoreCalculationPayload {
  versionId: string;
  changeNote?: string | null;
}

export interface ListCalculationsParams {
  app?: string;
  includeInactive?: boolean;
}

export function createCalculationsModule(req: RequestFn) {
  return {
    list(params?: ListCalculationsParams): Promise<CalculationRecord[]> {
      const qs = new URLSearchParams();
      if (params?.app) qs.set('app', params.app);
      if (params?.includeInactive) qs.set('includeInactive', 'true');
      const query = qs.toString() ? `?${qs.toString()}` : '';
      return req<CalculationRecord[]>(`/calculations${query}`);
    },

    get(calculationId: string): Promise<CalculationRecord> {
      return req<CalculationRecord>(`/calculations/${encodeURIComponent(calculationId)}`);
    },

    create(payload: CalculationSavePayload): Promise<CalculationRecord> {
      return req<CalculationRecord>('/calculations', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    saveVersion(calculationId: string, payload: CalculationUpdatePayload): Promise<CalculationRecord> {
      return req<CalculationRecord>(`/calculations/${encodeURIComponent(calculationId)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },

    softDelete(calculationId: string): Promise<{ message: string }> {
      return req<{ message: string }>(`/calculations/${encodeURIComponent(calculationId)}`, {
        method: 'DELETE',
      });
    },

    listVersions(calculationId: string): Promise<CalculationVersionRecord[]> {
      return req<CalculationVersionRecord[]>(
        `/calculations/${encodeURIComponent(calculationId)}/versions`,
      );
    },

    getVersion(calculationId: string, versionId: string): Promise<CalculationVersionRecord> {
      return req<CalculationVersionRecord>(
        `/calculations/${encodeURIComponent(calculationId)}/versions/${encodeURIComponent(versionId)}`,
      );
    },

    restoreVersion(
      calculationId: string,
      payload: RestoreCalculationPayload,
    ): Promise<CalculationRecord> {
      return req<CalculationRecord>(`/calculations/${encodeURIComponent(calculationId)}/restore`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  };
}
