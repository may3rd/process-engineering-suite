'use client';

import { useCallback, useState } from 'react';
import {
  deleteVesselCalculation,
  listVesselCalculations,
  restoreVesselCalculation,
  saveVesselCalculation,
  type SaveVesselCalculationOptions,
} from '../utils/persistence';
import type {
  VesselCalculationRecord,
  VesselCalculationSavePayload,
} from '../types/persistence';

export function useSavedCalculations() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedItems, setSavedItems] = useState<VesselCalculationRecord[]>([]);

  const fetchList = useCallback(async (includeDeleted = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const items = listVesselCalculations(includeDeleted);
      setSavedItems(items);
      return items;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load calculations';
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const save = useCallback(
    async (payload: VesselCalculationSavePayload, options?: SaveVesselCalculationOptions) => {
      setIsSaving(true);
      setError(null);
      try {
        const saved = saveVesselCalculation(payload, options);
        setSavedItems((prev) => {
          const existingIndex = prev.findIndex((item) => item.id === saved.id);
          if (existingIndex < 0) {
            return [saved, ...prev];
          }
          const next = [...prev];
          next[existingIndex] = saved;
          return next.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        });
        return saved;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Save failed';
        setError(message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    setIsDeleting(true);
    setError(null);
    try {
      deleteVesselCalculation(id);
      setSavedItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      setError(message);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  const restore = useCallback(async (id: string) => {
    setIsSaving(true);
    setError(null);
    try {
      restoreVesselCalculation(id);
      const items = listVesselCalculations(false);
      setSavedItems(items);
      return items.find((item) => item.id === id) ?? null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Restore failed';
      setError(message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    save,
    remove,
    restore,
    fetchList,
    isSaving,
    isLoading,
    isDeleting,
    error,
    savedItems,
  };
}
