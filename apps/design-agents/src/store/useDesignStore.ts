import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { DesignState, StepStatus, DESIGN_STEPS, AgentStep } from '../types';

interface DesignStore {
  // Navigation
  activeStepId: string;
  steps: AgentStep[];
  setActiveStep: (stepId: string) => void;
  updateStepStatus: (stepId: string, status: StepStatus) => void;

  // Data
  designState: DesignState;
  updateDesignState: (partial: Partial<DesignState>) => void;
  serverConfigured: boolean; // True if backend has env key
  setServerConfigured: (configured: boolean) => void;

  // Actions
  reset: () => void;
}

export const useDesignStore = create<DesignStore>()(
  devtools(
    persist(
      (set) => ({
        activeStepId: DESIGN_STEPS[0]?.id ?? '',
        steps: DESIGN_STEPS,
        designState: {
          llmSettings: {
            provider: 'OpenRouter',
            quickModel: 'x-ai/grok-4.1-fast',
            deepModel: 'x-ai/grok-4.1-fast',
            temperature: 0.7
          }
        },
        serverConfigured: false,
        setServerConfigured: (configured) => set({ serverConfigured: configured }),

        setActiveStep: (stepId) => set({ activeStepId: stepId }),

        updateStepStatus: (stepId, status) =>
          set((state) => ({
            steps: state.steps.map((s) =>
              s.id === stepId ? { ...s, status } : s
            ),
          })),

        updateDesignState: (partial) =>
          set((state) => ({
            designState: { ...state.designState, ...partial },
          })),

        reset: () =>
          set({
            activeStepId: DESIGN_STEPS[0]?.id ?? '',
            steps: DESIGN_STEPS,
            designState: {},
          }),
      }),
      {
        name: 'design-agent-storage', // name of the item in the storage (must be unique)
        partialize: (state) => ({
          activeStepId: state.activeStepId,
          steps: state.steps,
          designState: state.designState,
        }),
      }
    ),
    { name: 'DesignStore' }
  )
);
