"use client";

import { useState, useCallback } from "react";
import { engSuiteClient } from "@/lib/engSuiteClient";
import type { components } from "@eng-suite/types";

type NetworkDesign = components["schemas"]["NetworkDesignResponse"];

/**
 * Hook for cloud save/load of network designs via the centralised API.
 */
export function useSavedDesigns() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [savedItems, setSavedItems] = useState<NetworkDesign[]>([]);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(async (
    name: string,
    networkData: Record<string, unknown>,
    nodeCount = 0,
    pipeCount = 0,
  ) => {
    setIsSaving(true);
    setError(null);
    try {
      const created = await engSuiteClient.network.create({
        name,
        networkData,
        nodeCount,
        pipeCount,
      });
      return created;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setError(msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const fetchList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await engSuiteClient.network.list();
      setSavedItems(items);
      return items;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load designs";
      setError(msg);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { save, fetchList, isSaving, isLoading, savedItems, error };
}
