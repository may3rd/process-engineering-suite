'use client';

import { useCallback, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import type { CalculationMetadata, RevisionRecord } from '@/types';

const VESSEL_CALCULATION_APP = 'vessels-calculation';
const LEGACY_STORAGE_KEY = 'vessel-calculations';
const LEGACY_MIGRATION_FLAG_KEY = 'vessel-calculations-migrated-v1';

export interface VesselSavedCalculation {
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
  markMigrated?: boolean;
  createdAt?: string;
}

interface LegacySavedCalculation {
  id?: string;
  name?: string;
  inputs?: Record<string, unknown>;
  result?: Record<string, unknown>;
  metadata?: CalculationMetadata;
  revisions?: RevisionRecord[];
  savedAt?: string;
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
}): VesselSavedCalculation {
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
  const [savedItems, setSavedItems] = useState<VesselSavedCalculation[]>([]);
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
    markMigrated: _markMigrated,
    createdAt: _createdAt,
  }: SavePayload) => {
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        app: VESSEL_CALCULATION_APP,
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

  const migrateLegacyLocalStorage = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const hasMigrated = window.localStorage.getItem(LEGACY_MIGRATION_FLAG_KEY) === '1';
    if (hasMigrated) return;

    let legacyItems: LegacySavedCalculation[] = [];
    try {
      const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      legacyItems = raw ? (JSON.parse(raw) as LegacySavedCalculation[]) : [];
    } catch {
      legacyItems = [];
    }

    for (const item of legacyItems) {
      if (!item || typeof item !== 'object') continue;
      const legacyInputs = (item.inputs ?? {}) as Record<string, unknown>;
      const fallbackName = typeof legacyInputs.tag === 'string' && legacyInputs.tag.trim().length > 0
        ? legacyInputs.tag
        : 'Imported Vessel Calculation';
      const name = (item.name && item.name.trim().length > 0 ? item.name : fallbackName) as string;
      const description = typeof legacyInputs.description === 'string' ? legacyInputs.description : '';
      await save({
        tag: item.id ? `VCALC-${String(item.id).replace(/[^A-Za-z0-9]/g, '').slice(0, 24).toUpperCase()}` : undefined,
        name,
        description,
        inputs: legacyInputs,
        results: item.result ?? null,
        calculationMetadata: item.metadata,
        revisionHistory: item.revisions,
        markMigrated: true,
        createdAt: item.savedAt,
      });
    }

    window.localStorage.setItem(LEGACY_MIGRATION_FLAG_KEY, '1');
  }, [save]);

  const fetchList = useCallback(async (params?: { includeInactive?: boolean; q?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      await migrateLegacyLocalStorage();
      const items = await apiClient.calculations.list({
        app: VESSEL_CALCULATION_APP,
        includeInactive: params?.includeInactive ?? false,
      });
      const query = params?.q?.trim().toLowerCase();
      const parsed = items
        .map(parseSavedItem)
        .filter((item) => {
          if (!query) return true;
          const tag = String(item.inputs.tag ?? '').toLowerCase();
          return (
            item.name.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query) ||
            item.tag.toLowerCase().includes(query) ||
            tag.includes(query)
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
  }, [migrateLegacyLocalStorage]);

  return {
    save,
    softDelete,
    restore,
    fetchList,
    migrateLegacyLocalStorage,
    isSaving,
    isLoading,
    isDeleting,
    isRestoring,
    savedItems,
    error,
  };
}
