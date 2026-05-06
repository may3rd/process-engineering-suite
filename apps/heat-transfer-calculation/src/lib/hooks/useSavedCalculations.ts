'use client';

import { useCallback, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import type { CalculationMetadata, RevisionRecord } from '@/types';

const HEAT_TRANSFER_CALCULATION_APP = 'heat-transfer-calculation';

export interface HeatTransferSavedCalculation {
  id: string;
  tag: string;
  name: string;
  description: string;
  inputs: Record<string, unknown>;
  results?: Record<string, unknown>;
  equipmentId?: string | null;
  equipmentTag?: string | null;
  calculationMetadata?: CalculationMetadata;
  revisionHistory?: RevisionRecord[];
  latestVersionId?: string | null;
  latestVersionNo?: number;
  status?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface SavePayload {
  calculationId?: string;
  tag?: string;
  name: string;
  description?: string;
  inputs: Record<string, unknown>;
  results?: Record<string, unknown> | null;
  equipmentId?: string | null;
  equipmentTag?: string | null;
  calculationMetadata?: CalculationMetadata;
  revisionHistory?: RevisionRecord[];
}

function parseSavedItem(raw: {
  id: string;
  tag?: string | null;
  name: string;
  description: string;
  inputs: Record<string, unknown>;
  results?: Record<string, unknown> | null;
  linkedEquipmentId?: string | null;
  linkedEquipmentTag?: string | null;
  metadata?: Record<string, unknown>;
  revisionHistory?: Array<Record<string, unknown>>;
  latestVersionId?: string | null;
  latestVersionNo?: number;
  status?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}): HeatTransferSavedCalculation {
  return {
    id: raw.id,
    tag: raw.tag ?? '',
    name: raw.name,
    description: raw.description,
    inputs: raw.inputs ?? {},
    results: raw.results ?? undefined,
    equipmentId: raw.linkedEquipmentId ?? null,
    equipmentTag: raw.linkedEquipmentTag ?? null,
    calculationMetadata: raw.metadata as CalculationMetadata | undefined,
    revisionHistory: raw.revisionHistory as RevisionRecord[] | undefined,
    latestVersionId: raw.latestVersionId ?? null,
    latestVersionNo: raw.latestVersionNo,
    status: raw.status ?? null,
    isActive: raw.isActive,
    createdAt: raw.createdAt ?? undefined,
    updatedAt: raw.updatedAt ?? undefined,
  };
}

export function useSavedCalculations() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [savedItems, setSavedItems] = useState<HeatTransferSavedCalculation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(async ({
    calculationId,
    tag,
    name,
    description,
    inputs,
    results,
    equipmentId,
    equipmentTag,
    calculationMetadata,
    revisionHistory,
  }: SavePayload) => {
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        app: HEAT_TRANSFER_CALCULATION_APP,
        name: name.trim(),
        description: description?.trim() ?? '',
        status: 'draft',
        tag: tag?.trim() || (typeof inputs.tag === 'string' ? inputs.tag : null),
        inputs,
        results: results ?? null,
        metadata: (calculationMetadata ?? {}) as unknown as Record<string, unknown>,
        revisionHistory: (revisionHistory ?? []) as unknown as Array<Record<string, unknown>>,
        linkedEquipmentId: equipmentId ?? null,
        linkedEquipmentTag: equipmentTag ?? null,
      };
      const item = calculationId
        ? await apiClient.calculations.saveVersion(calculationId, payload)
        : await apiClient.calculations.create(payload);
      return parseSavedItem(item);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setError(msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const softDelete = useCallback(async (calculationId: string) => {
    setIsDeleting(true);
    setError(null);
    try {
      await apiClient.calculations.softDelete(calculationId);
      setSavedItems((prev) => prev.map((entry) => entry.id === calculationId ? { ...entry, isActive: false } : entry));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      setError(msg);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  const restore = useCallback(async (calculationId: string) => {
    setIsRestoring(true);
    setError(null);
    try {
      const calculation = await apiClient.calculations.get(calculationId);
      if (!calculation.latestVersionId) {
        throw new Error('Calculation is missing a latest version');
      }
      const restored = await apiClient.calculations.restoreVersion(calculationId, {
        versionId: calculation.latestVersionId,
      });
      const parsed = parseSavedItem(restored);
      setSavedItems((prev) => prev.map((entry) => entry.id === calculationId ? parsed : entry));
      return parsed;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Restore failed';
      setError(msg);
      throw err;
    } finally {
      setIsRestoring(false);
    }
  }, []);

  const fetchList = useCallback(async (params?: { includeInactive?: boolean; q?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await apiClient.calculations.list({
        app: HEAT_TRANSFER_CALCULATION_APP,
        includeInactive: params?.includeInactive ?? false,
      });
      const query = params?.q?.trim().toLowerCase();
      const parsed = items
        .map(parseSavedItem)
        .filter((item) => {
          if (!query) return true;
          const inputTag = String(item.inputs.tag ?? '').toLowerCase();
          return (
            item.name.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query) ||
            item.tag.toLowerCase().includes(query) ||
            inputTag.includes(query)
          );
        });
      setSavedItems(parsed);
      return parsed;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load calculations';
      setError(msg);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    save,
    softDelete,
    restore,
    fetchList,
    isSaving,
    isLoading,
    isDeleting,
    isRestoring,
    savedItems,
    error,
  };
}
