import { useState, useCallback } from 'react';
import { engSuiteClient } from '../lib/engSuiteClient';
import type { components } from '@eng-suite/types';

type DesignAgentSession = components['schemas']['DesignAgentSessionResponse'];

/**
 * Hook for cloud save/load of design agent sessions via the centralised API.
 */
export function useSavedSessions() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [savedItems, setSavedItems] = useState<DesignAgentSession[]>([]);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(async (
    name: string,
    stateData: Record<string, unknown>,
    activeStepId?: string,
    completedSteps: string[] = [],
  ) => {
    setIsSaving(true);
    setError(null);
    try {
      const created = await engSuiteClient.designAgents.createSession({
        name,
        stateData,
        activeStepId,
        completedSteps,
      });
      return created;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
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
      const items = await engSuiteClient.designAgents.listSessions();
      setSavedItems(items);
      return items;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load sessions';
      setError(msg);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { save, fetchList, isSaving, isLoading, savedItems, error };
}
