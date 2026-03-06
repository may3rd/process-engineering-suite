'use client';

import { useCallback, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import type { CalculationMetadata, RevisionRecord } from '@/types';

export const VESSEL_CALCULATION_OBJECT_TYPE = 'VESSEL_CALCULATION';
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
  status?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface SavePayload {
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

function createObjectTag(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `VCALC-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
  }
  return `VCALC-${Date.now().toString(36).toUpperCase()}`;
}

function parseSavedItem(raw: {
  tag: string;
  object_type: string;
  properties: Record<string, unknown>;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}): VesselSavedCalculation {
  const props = raw.properties ?? {};
  const meta = (props.meta ?? {}) as Record<string, unknown>;
  const name = String(meta.name ?? raw.tag);
  const description = String(meta.description ?? '');
  const isActive = meta.isActive !== false;
  const inputs = (props.inputs ?? {}) as Record<string, unknown>;
  const results = (props.result ?? undefined) as Record<string, unknown> | undefined;
  const equipmentId = (props.linkedEquipmentId ?? null) as string | null;
  const equipmentTag = (props.linkedEquipmentTag ?? null) as string | null;
  const calculationMetadata = props.calculationMetadata as CalculationMetadata | undefined;
  const revisionHistory = props.revisionHistory as RevisionRecord[] | undefined;

  return {
    id: raw.tag,
    tag: raw.tag,
    name,
    description,
    inputs,
    results,
    equipmentId,
    equipmentTag,
    calculationMetadata,
    revisionHistory,
    status: raw.status ?? null,
    isActive,
    createdAt: (raw.created_at ?? (meta.createdAt as string | undefined) ?? undefined) ?? undefined,
    updatedAt: (raw.updated_at ?? (meta.updatedAt as string | undefined) ?? undefined) ?? undefined,
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
    tag,
    name,
    description,
    inputs,
    results,
    equipmentId,
    equipmentTag,
    calculationMetadata,
    revisionHistory,
    markMigrated,
    createdAt,
  }: SavePayload) => {
    setIsSaving(true);
    setError(null);
    try {
      const targetTag = (tag?.trim() ? tag.trim().toUpperCase() : createObjectTag());
      const now = new Date().toISOString();
      const payload = {
        object_type: VESSEL_CALCULATION_OBJECT_TYPE,
        status: 'In-Design',
        properties: {
          inputs,
          result: results ?? null,
          linkedEquipmentId: equipmentId ?? null,
          linkedEquipmentTag: equipmentTag ?? null,
          calculationMetadata: calculationMetadata ?? undefined,
          revisionHistory: revisionHistory ?? [],
          meta: {
            app: 'vessel',
            name: name.trim(),
            description: description?.trim() ?? '',
            isActive: true,
            deletedAt: null,
            createdAt: createdAt ?? now,
            updatedAt: now,
            migratedFromLocalStorage: markMigrated ?? false,
          },
        },
      };
      const item = await apiClient.engineeringObjects.upsert(targetTag, payload);
      return parseSavedItem(item);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setError(msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const softDelete = useCallback(async (tag: string) => {
    setIsDeleting(true);
    setError(null);
    try {
      const item = await apiClient.engineeringObjects.get(tag);
      const props = (item.properties ?? {}) as Record<string, unknown>;
      const meta = ((props.meta ?? {}) as Record<string, unknown>);
      await apiClient.engineeringObjects.upsert(tag, {
        object_type: item.object_type,
        status: item.status ?? 'In-Design',
        properties: {
          ...props,
          meta: {
            ...meta,
            isActive: false,
            deletedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      });
      setSavedItems((prev) => prev.map((entry) => entry.tag === tag ? { ...entry, isActive: false } : entry));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      setError(msg);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  const restore = useCallback(async (tag: string) => {
    setIsRestoring(true);
    setError(null);
    try {
      const item = await apiClient.engineeringObjects.get(tag);
      const props = (item.properties ?? {}) as Record<string, unknown>;
      const meta = ((props.meta ?? {}) as Record<string, unknown>);
      const restored = await apiClient.engineeringObjects.upsert(tag, {
        object_type: item.object_type,
        status: item.status ?? 'In-Design',
        properties: {
          ...props,
          meta: {
            ...meta,
            isActive: true,
            deletedAt: null,
            updatedAt: new Date().toISOString(),
          },
        },
      });
      const parsed = parseSavedItem(restored);
      setSavedItems((prev) => prev.map((entry) => entry.tag === tag ? parsed : entry));
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
      const items = await apiClient.engineeringObjects.list({
        objectType: VESSEL_CALCULATION_OBJECT_TYPE,
        includeInactive: params?.includeInactive ?? false,
        q: params?.q,
      });
      const parsed = items.map(parseSavedItem);
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
