import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  DesignState,
  StepStatus,
  OutputStatus,
  OutputMetadata,
  LLMMessage,
  AgentStep,
} from "@/data/types";
import {
  AGENT_STEPS,
  AGENT_LABELS,
  getStepIndexForKey,
  getOutputsForStep,
  StepIndex,
} from "@/data/stepConfig";
import { api, StreamUpdate } from "@/lib/api";
import {
  mockProject,
  mockProblemStatement,
  mockProcessRequirements,
  mockResearchConcepts,
  mockResearchRatingResults,
  mockComponentList,
  mockDesignBasis,
  mockFlowsheetDescription,
  mockEquipmentList,
  mockStreamList,
  mockSafetyReport,
  mockPMReport,
} from "@/data/mockData";

interface DesignStoreState extends DesignState {
  // Workflow management
  currentWorkflowId: string | null;
  workflowStatus: string;
  isStreaming: boolean;
  streamError: string | null;
  eventSource: EventSource | undefined;

  // Actions
  setProject: (project: DesignState["project"]) => void;
  setProblemStatement: (value: string) => void;
  setStepOutput: (key: keyof DesignState, value: string) => void;
  setCurrentStep: (step: number) => void;
  setStepStatus: (step: number, status: StepStatus) => void;
  markStepEdited: (step: number) => void;
  markDownstreamOutdated: (fromStep: number) => void;
  triggerNextStep: () => Promise<void>;
  resetProject: () => void;
  startOver: () => void;

  // Workflow management actions
  initializeWorkflow: () => Promise<void>;
  connectStreaming: () => Promise<void>;
  disconnectStreaming: () => void;
  setWorkflowStatus: (status: string) => void;
  setStreamError: (error: string | null) => void;

  // UI actions
  setActiveTab: (tab: DesignState["activeTab"]) => void;

  // Output status tracking
  setOutputStatus: (key: keyof DesignState, status: OutputStatus) => void;
  markOutputEdited: (key: keyof DesignState) => void;
  getOutputMetadata: (key: keyof DesignState) => OutputMetadata | undefined;

  // LLM settings - Quick model
  setLLMQuickProvider: (provider: string) => void;
  setLLMQuickModel: (model: string) => void;
  setLLMQuickTemperature: (temperature: number) => void;
  setLLMQuickApiKey: (apiKey: string) => void;
  setLLMQuickUseStructured: (useStructured: boolean) => void;

  // LLM settings - Deep Thinking model
  setLLMDeepProvider: (provider: string) => void;
  setLLMDeepModel: (model: string) => void;
  setLLMDeepTemperature: (temperature: number) => void;
  setLLMDeepApiKey: (apiKey: string) => void;
  setLLMDeepUseStructured: (useStructured: boolean) => void;

  // Message transcript actions
  addMessage: (message: Omit<LLMMessage, "id" | "timestamp">) => void;
  clearMessages: () => void;
}

const initialState: DesignState = {
  project: mockProject,
  problemStatement: mockProblemStatement,
  processRequirements: mockProcessRequirements,
  researchConcepts: mockResearchConcepts,
  researchRatingResults: mockResearchRatingResults,
  selectedConceptName: "Autothermal Reforming (ATR)",
  selectedConceptDetails: "",
  selectedConceptEvaluation: "",
  componentList: mockComponentList,
  designBasis: mockDesignBasis,
  flowsheetDescription: mockFlowsheetDescription,
  equipmentListTemplate: "",
  equipmentListResults: mockEquipmentList,
  streamListTemplate: "",
  streamListResults: mockStreamList,
  safetyRiskAnalystReport: mockSafetyReport,
  projectManagerReport: mockPMReport,
  projectApproval: "Approved",
  currentStep: 11,
  stepStatuses: {
    0: "complete",
    1: "complete",
    2: "complete",
    3: "complete",
    4: "complete",
    5: "complete",
    6: "complete",
    7: "complete",
    8: "complete",
    9: "complete",
    10: "complete",
    11: "complete",
  },
  llmQuickProvider: "openrouter",
  llmQuickModel: "google/gemini-2.0-flash-exp",
  llmQuickTemperature: 0.5,
  llmQuickApiKey: "",
  llmQuickUseStructured: false,
  llmDeepProvider: "openrouter",
  llmDeepModel: "anthropic/claude-3.5-sonnet",
  llmDeepTemperature: 0.7,
  llmDeepApiKey: "",
  llmDeepUseStructured: false,
  activeTab: "requirements",
  outputStatuses: {
    processRequirements: {
      status: "needs_review",
      lastModified: new Date().toISOString(),
      modifiedBy: "system",
      version: 1,
    },
    researchConcepts: {
      status: "needs_review",
      lastModified: new Date().toISOString(),
      modifiedBy: "system",
      version: 1,
    },
    researchRatingResults: {
      status: "needs_review",
      lastModified: new Date().toISOString(),
      modifiedBy: "system",
      version: 1,
    },
    selectedConceptName: {
      status: "needs_review",
      lastModified: new Date().toISOString(),
      modifiedBy: "system",
      version: 1,
    },
    componentList: {
      status: "needs_review",
      lastModified: new Date().toISOString(),
      modifiedBy: "system",
      version: 1,
    },
    designBasis: {
      status: "needs_review",
      lastModified: new Date().toISOString(),
      modifiedBy: "system",
      version: 1,
    },
    flowsheetDescription: {
      status: "needs_review",
      lastModified: new Date().toISOString(),
      modifiedBy: "system",
      version: 1,
    },
    equipmentListResults: {
      status: "needs_review",
      lastModified: new Date().toISOString(),
      modifiedBy: "system",
      version: 1,
    },
    streamListResults: {
      status: "needs_review",
      lastModified: new Date().toISOString(),
      modifiedBy: "system",
      version: 1,
    },
    safetyRiskAnalystReport: {
      status: "needs_review",
      lastModified: new Date().toISOString(),
      modifiedBy: "system",
      version: 1,
    },
    projectManagerReport: {
      status: "needs_review",
      lastModified: new Date().toISOString(),
      modifiedBy: "system",
      version: 1,
    },
  },
  messages: [],

  // Workflow management state
  currentWorkflowId: null,
  workflowStatus: "idle",
  isStreaming: false,
  streamError: null,
  eventSource: undefined,
};

export const useDesignStore = create<DesignStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Workflow management state
      currentWorkflowId: null,
      workflowStatus: "idle",
      isStreaming: false,
      streamError: null,
      eventSource: undefined,

      setProject: (project) => set({ project }),

      setProblemStatement: (value) => set({ problemStatement: value }),

      setStepOutput: (key, value) => {
        set({ [key]: value });
      },

      setCurrentStep: (step) => set({ currentStep: step }),

      setStepStatus: (step, status) =>
        set((state) => ({
          stepStatuses: {
            ...state.stepStatuses,
            [step]: status,
          },
        })),

      markStepEdited: (step) => {
        const { setStepStatus, markDownstreamOutdated } = get();
        setStepStatus(step, "edited");
        markDownstreamOutdated(step);
      },

      markDownstreamOutdated: (fromStep) => {
        const { stepStatuses } = get();
        const updatedStatuses = { ...stepStatuses };

        // Mark all downstream steps as outdated
        for (let i = fromStep + 1; i < 12; i++) {
          if (
            updatedStatuses[i] === "complete" ||
            updatedStatuses[i] === "edited"
          ) {
            updatedStatuses[i] = "outdated";
          }
        }

        set({ stepStatuses: updatedStatuses });
      },

      triggerNextStep: async () => {
        const { currentStep, currentWorkflowId } = get();

        if (!currentWorkflowId) {
          throw new Error(
            "No active workflow. Please initialize a workflow first.",
          );
        }

        try {
          // Execute the current step via API
          const result = await api.executeWorkflowStep(
            currentStep,
            currentWorkflowId,
          );

          // The streaming updates will handle updating the UI state
          // This function just initiates the step execution
        } catch (error) {
          console.error("Failed to execute workflow step:", error);
          throw error;
        }
      },

      resetProject: () => set(initialState),

      startOver: () =>
        set((state) => ({
          // Keep project metadata but reset content
          project: {
            ...state.project,
            name: "New Project",
            lastModified: new Date().toISOString(),
          },
          // Clear all inputs and outputs
          problemStatement: "",
          processRequirements: "",
          researchConcepts: "[]",
          researchRatingResults: "[]",
          selectedConceptName: "",
          selectedConceptDetails: "",
          selectedConceptEvaluation: "",
          componentList: "",
          designBasis: "",
          flowsheetDescription: "",
          equipmentListTemplate: "",
          equipmentListResults: "[]",
          streamListTemplate: "",
          streamListResults: "[]",
          safetyRiskAnalystReport: "",
          projectManagerReport: "",
          projectApproval: "",
          // Reset workflow state
          currentStep: 0,
          stepStatuses: {
            0: "pending",
            1: "pending",
            2: "pending",
            3: "pending",
            4: "pending",
            5: "pending",
            6: "pending",
            7: "pending",
            8: "pending",
            9: "pending",
            10: "pending",
            11: "pending",
          },
          outputStatuses: {},
          // Reset to requirements tab
          activeTab: "requirements",
          // Clear messages
          messages: [],
          // Keep LLM settings unchanged
        })),

      setActiveTab: (tab) => set({ activeTab: tab }),

      setOutputStatus: (key, status) => {
        const { outputStatuses } = get();
        set({
          outputStatuses: {
            ...outputStatuses,
            [key]: {
              status,
              lastModified: new Date().toISOString(),
              modifiedBy: "user",
              version: (outputStatuses[key]?.version || 0) + 1,
            },
          },
        });
      },

      markOutputEdited: (key) => {
        const { outputStatuses, markDownstreamOutdated } = get();
        const currentStepForKey = getStepIndexForKey(key as string);

        set({
          outputStatuses: {
            ...outputStatuses,
            [key]: {
              status: "needs_review",
              lastModified: new Date().toISOString(),
              modifiedBy: "user",
              version: (outputStatuses[key]?.version || 0) + 1,
            },
          },
        });

        // Mark downstream steps as outdated
        if (currentStepForKey !== -1) {
          markDownstreamOutdated(currentStepForKey as StepIndex);
        }
      },

      getOutputMetadata: (key) => {
        const { outputStatuses } = get();
        return outputStatuses[key];
      },

      // Quick model setters
      setLLMQuickProvider: (provider) => set({ llmQuickProvider: provider }),
      setLLMQuickModel: (model) => set({ llmQuickModel: model }),
      setLLMQuickTemperature: (temperature) =>
        set({ llmQuickTemperature: temperature }),
      setLLMQuickApiKey: (apiKey) => set({ llmQuickApiKey: apiKey }),
      setLLMQuickUseStructured: (useStructured) =>
        set({ llmQuickUseStructured: useStructured }),

      // Deep Thinking model setters
      setLLMDeepProvider: (provider) => set({ llmDeepProvider: provider }),
      setLLMDeepModel: (model) => set({ llmDeepModel: model }),
      setLLMDeepTemperature: (temperature) =>
        set({ llmDeepTemperature: temperature }),
      setLLMDeepApiKey: (apiKey) => set({ llmDeepApiKey: apiKey }),
      setLLMDeepUseStructured: (useStructured) =>
        set({ llmDeepUseStructured: useStructured }),

      // Message transcript actions
      addMessage: (message) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              ...message,
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date().toISOString(),
            },
          ],
        })),

      // Workflow management actions
      initializeWorkflow: async () => {
        const { problemStatement } = get();
        if (!problemStatement.trim()) {
          throw new Error(
            "Problem statement is required to initialize workflow",
          );
        }

        try {
          set({ workflowStatus: "initializing" });

          const response = await api.createWorkflow({
            problem_statement: problemStatement,
            config: {
              llm_provider: "openrouter",
              quick_think_model: "google/gemini-2.5-flash-lite-preview-09-2025",
              deep_think_model: "google/gemini-2.5-flash-preview-09-2025",
              temperature: 0.7,
              resume_from_last: true,
            },
          });

          set({
            currentWorkflowId: response.workflow_id,
            workflowStatus: response.status,
          });

          // Connect streaming after successful initialization
          await get().connectStreaming();
        } catch (error) {
          console.error("Failed to initialize workflow:", error);
          set({
            workflowStatus: "error",
            streamError:
              error instanceof Error
                ? error.message
                : "Failed to initialize workflow",
          });
          throw error;
        }
      },

      connectStreaming: async () => {
        const { currentWorkflowId } = get();
        if (!currentWorkflowId) {
          throw new Error("No workflow ID available for streaming");
        }

        try {
          set({ isStreaming: true, streamError: null });

          const eventSource = await api.streamWorkflowUpdates(
            currentWorkflowId,
            (update) => {
              console.log("Stream update:", update);

              // Handle different update types
              switch (update.type) {
                case "step_started":
                  if (update.step_index !== undefined) {
                    get().setStepStatus(update.step_index, "running");
                  }
                  break;

                case "step_completed":
                  if (update.step_index !== undefined) {
                    get().setStepStatus(update.step_index, "needs_review");

                    // Update outputs if provided
                    if (update.outputs) {
                      Object.entries(update.outputs).forEach(([key, value]) => {
                        get().setStepOutput(
                          key as keyof DesignState,
                          value as string,
                        );
                        get().setOutputStatus(
                          key as keyof DesignState,
                          "needs_review",
                        );
                      });
                    }
                  }
                  break;

                case "step_error":
                  if (update.step_index !== undefined) {
                    get().setStepStatus(update.step_index, "outdated");
                  }
                  set({ streamError: update.error || "Step execution failed" });
                  break;

                case "workflow_error":
                  set({
                    workflowStatus: "error",
                    streamError: update.error || "Workflow error",
                  });
                  break;
              }
            },
          );

          // Store the event source for cleanup
          set({ eventSource });
        } catch (error) {
          console.error("Failed to connect streaming:", error);
          set({
            isStreaming: false,
            streamError:
              error instanceof Error
                ? error.message
                : "Failed to connect streaming",
          });
          throw error;
        }
      },

      disconnectStreaming: () => {
        const { eventSource } = get();
        if (eventSource) {
          eventSource.close();
          set({ isStreaming: false, eventSource: undefined });
        }
      },

      setWorkflowStatus: (status) => set({ workflowStatus: status }),

      setStreamError: (error) => set({ streamError: error }),

      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: "design-agents-project",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Persist project data
        project: state.project,
        problemStatement: state.problemStatement,
        processRequirements: state.processRequirements,
        researchConcepts: state.researchConcepts,
        researchRatingResults: state.researchRatingResults,
        selectedConceptName: state.selectedConceptName,
        selectedConceptDetails: state.selectedConceptDetails,
        selectedConceptEvaluation: state.selectedConceptEvaluation,
        componentList: state.componentList,
        designBasis: state.designBasis,
        flowsheetDescription: state.flowsheetDescription,
        equipmentListTemplate: state.equipmentListTemplate,
        equipmentListResults: state.equipmentListResults,
        streamListTemplate: state.streamListTemplate,
        streamListResults: state.streamListResults,
        safetyRiskAnalystReport: state.safetyRiskAnalystReport,
        projectManagerReport: state.projectManagerReport,
        projectApproval: state.projectApproval,
        // Persist step statuses
        currentStep: state.currentStep,
        stepStatuses: state.stepStatuses,
        outputStatuses: state.outputStatuses,
        // Persist LLM settings
        llmQuickProvider: state.llmQuickProvider,
        llmQuickModel: state.llmQuickModel,
        llmQuickTemperature: state.llmQuickTemperature,
        llmQuickApiKey: state.llmQuickApiKey,
        llmQuickUseStructured: state.llmQuickUseStructured,
        llmDeepProvider: state.llmDeepProvider,
        llmDeepModel: state.llmDeepModel,
        llmDeepTemperature: state.llmDeepTemperature,
        llmDeepApiKey: state.llmDeepApiKey,
        llmDeepUseStructured: state.llmDeepUseStructured,
        // Persist message transcript
        messages: state.messages,
        // Exclude: activeTab (UI state)
      }),
    },
  ),
);

// Helper function to map output keys to step indices
// Uses centralized stepConfig mapping
export function getStepIndexForKeyStore(key: keyof DesignState): number {
  return getStepIndexForKey(key as string);
}
