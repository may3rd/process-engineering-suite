import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DesignState, StepStatus, OutputStatus, OutputMetadata, LLMMessage, AgentStep } from '@/data/types';
import { AGENT_STEPS, AGENT_LABELS, getStepIndexForKey, getOutputsForStep, StepIndex } from '@/data/stepConfig';
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
} from '@/data/mockData';

interface DesignStoreState extends DesignState {
    // Actions
    setProject: (project: DesignState['project']) => void;
    setProblemStatement: (value: string) => void;
    setStepOutput: (key: keyof DesignState, value: string) => void;
    setCurrentStep: (step: number) => void;
    setStepStatus: (step: number, status: StepStatus) => void;
    markStepEdited: (step: number) => void;
    markDownstreamOutdated: (fromStep: number) => void;
    triggerNextStep: () => Promise<void>;
    resetProject: () => void;
    startOver: () => void;

    // UI actions
    setActiveTab: (tab: DesignState['activeTab']) => void;

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
    addMessage: (message: Omit<LLMMessage, 'id' | 'timestamp'>) => void;
    clearMessages: () => void;
}

const initialState: DesignState = {
    project: mockProject,
    problemStatement: mockProblemStatement,
    processRequirements: mockProcessRequirements,
    researchConcepts: mockResearchConcepts,
    researchRatingResults: mockResearchRatingResults,
    selectedConceptName: 'Autothermal Reforming (ATR)',
    selectedConceptDetails: '',
    selectedConceptEvaluation: '',
    componentList: mockComponentList,
    designBasis: mockDesignBasis,
    flowsheetDescription: mockFlowsheetDescription,
    equipmentListTemplate: '',
    equipmentListResults: mockEquipmentList,
    streamListTemplate: '',
    streamListResults: mockStreamList,
    safetyRiskAnalystReport: mockSafetyReport,
    projectManagerReport: mockPMReport,
    projectApproval: 'Approved',
    currentStep: 11,
    stepStatuses: {
        0: 'complete',
        1: 'complete',
        2: 'complete',
        3: 'complete',
        4: 'complete',
        5: 'complete',
        6: 'complete',
        7: 'complete',
        8: 'complete',
        9: 'complete',
        10: 'complete',
        11: 'complete',
    },
    llmQuickProvider: 'openrouter',
    llmQuickModel: 'google/gemini-2.0-flash-exp',
    llmQuickTemperature: 0.5,
    llmQuickApiKey: '',
    llmQuickUseStructured: false,
    llmDeepProvider: 'openrouter',
    llmDeepModel: 'anthropic/claude-3.5-sonnet',
    llmDeepTemperature: 0.7,
    llmDeepApiKey: '',
    llmDeepUseStructured: false,
    activeTab: 'requirements',
    outputStatuses: {
        processRequirements: { status: 'needs_review', lastModified: new Date().toISOString(), modifiedBy: 'system', version: 1 },
        researchConcepts: { status: 'needs_review', lastModified: new Date().toISOString(), modifiedBy: 'system', version: 1 },
        researchRatingResults: { status: 'needs_review', lastModified: new Date().toISOString(), modifiedBy: 'system', version: 1 },
        selectedConceptName: { status: 'needs_review', lastModified: new Date().toISOString(), modifiedBy: 'system', version: 1 },
        componentList: { status: 'needs_review', lastModified: new Date().toISOString(), modifiedBy: 'system', version: 1 },
        designBasis: { status: 'needs_review', lastModified: new Date().toISOString(), modifiedBy: 'system', version: 1 },
        flowsheetDescription: { status: 'needs_review', lastModified: new Date().toISOString(), modifiedBy: 'system', version: 1 },
        equipmentListResults: { status: 'needs_review', lastModified: new Date().toISOString(), modifiedBy: 'system', version: 1 },
        streamListResults: { status: 'needs_review', lastModified: new Date().toISOString(), modifiedBy: 'system', version: 1 },
        safetyRiskAnalystReport: { status: 'needs_review', lastModified: new Date().toISOString(), modifiedBy: 'system', version: 1 },
        projectManagerReport: { status: 'needs_review', lastModified: new Date().toISOString(), modifiedBy: 'system', version: 1 },
    },
    messages: [],
};

export const useDesignStore = create<DesignStoreState>()(
    persist(
        (set, get) => ({
            ...initialState,

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
                setStepStatus(step, 'edited');
                markDownstreamOutdated(step);
            },

            markDownstreamOutdated: (fromStep) => {
                const { stepStatuses } = get();
                const updatedStatuses = { ...stepStatuses };

                // Mark all downstream steps as outdated
                for (let i = fromStep + 1; i < 12; i++) {
                    if (updatedStatuses[i] === 'complete' || updatedStatuses[i] === 'edited') {
                        updatedStatuses[i] = 'outdated';
                    }
                }

                set({ stepStatuses: updatedStatuses });
            },

            triggerNextStep: async () => {
                const { currentStep, setStepStatus, setStepOutput, setOutputStatus } = get();

                // Mark current step as running (shows spinner)
                setStepStatus(currentStep, 'running');

                // Simulate API call delay for the "agent"
                await new Promise((resolve) => setTimeout(resolve, 1500));

                const {
                    mockProcessRequirements,
                    mockResearchConcepts,
                    mockResearchRatingResults,
                    mockComponentList,
                    mockDesignBasis,
                    mockFlowsheetDescription,
                    mockEquipmentList,
                    mockStreamList,
                    mockSafetyReport,
                    mockPMReport
                } = await import('@/data/mockData');

                // Populate output based on which step just "ran" and set status
                switch (currentStep) {
                    case 0:
                        setStepOutput('processRequirements', mockProcessRequirements);
                        setOutputStatus('processRequirements', 'needs_review');
                        break;
                    case 1:
                        setStepOutput('researchConcepts', mockResearchConcepts);
                        setOutputStatus('researchConcepts', 'needs_review');
                        break;
                    case 2:
                        setStepOutput('researchRatingResults', mockResearchRatingResults);
                        setOutputStatus('researchRatingResults', 'needs_review');
                        break;
                    case 3:
                        // Generate detailed description of the selected concept
                        setStepOutput('selectedConceptDetails', `# Autothermal Reforming (ATR) Process Details

## Process Description
Autothermal Reforming combines partial oxidation and steam reforming in a single reactor. The process operates at temperatures of 900-1100°C and pressures of 20-40 bar.

## Key Process Parameters
- **Reformer Outlet Temperature**: 950-1050°C
- **Steam-to-Carbon Ratio**: 0.5-0.7
- **Oxygen-to-Carbon Ratio**: 0.55-0.65
- **Operating Pressure**: 25-35 bar

## Main Equipment
1. ATR Reactor with oxygen burner
2. Feed gas preheater
3. Steam drum and superheater
4. Syngas cooler and waste heat recovery

## Advantages
- Suitable H₂/CO ratio for methanol synthesis
- No external heat source required
- Compact design compared to SMR
- Good for large-scale applications

## Considerations
- Requires air separation unit (ASU)
- Higher operating pressure than SMR
- Careful oxygen/steam ratio control required`);
                        setOutputStatus('selectedConceptDetails', 'needs_review');
                        break;
                    case 4:
                        setStepOutput('componentList', mockComponentList);
                        setOutputStatus('componentList', 'needs_review');
                        break;
                    case 5:
                        setStepOutput('designBasis', mockDesignBasis);
                        setOutputStatus('designBasis', 'needs_review');
                        break;
                    case 6:
                        setStepOutput('flowsheetDescription', mockFlowsheetDescription);
                        setOutputStatus('flowsheetDescription', 'needs_review');
                        break;
                    case 7:
                        setStepOutput('equipmentListResults', mockEquipmentList);
                        setStepOutput('streamListResults', mockStreamList);
                        setOutputStatus('equipmentListResults', 'needs_review');
                        setOutputStatus('streamListResults', 'needs_review');
                        break;
                    case 10:
                        setStepOutput('safetyRiskAnalystReport', mockSafetyReport);
                        setOutputStatus('safetyRiskAnalystReport', 'needs_review');
                        break;
                    case 11:
                        setStepOutput('projectManagerReport', mockPMReport);
                        setStepOutput('projectApproval', 'Approved');
                        setOutputStatus('projectManagerReport', 'needs_review');
                        break;
                }

                // Mark step as needs_review - user must approve before it's complete
                // Don't advance to next step - that happens in the approval handler
                setStepStatus(currentStep, 'needs_review');
            },

            resetProject: () => set(initialState),

            startOver: () => set((state) => ({
                // Keep project metadata but reset content
                project: { ...state.project, name: 'New Project', lastModified: new Date().toISOString() },
                // Clear all inputs and outputs
                problemStatement: '',
                processRequirements: '',
                researchConcepts: '[]',
                researchRatingResults: '[]',
                selectedConceptName: '',
                selectedConceptDetails: '',
                selectedConceptEvaluation: '',
                componentList: '',
                designBasis: '',
                flowsheetDescription: '',
                equipmentListTemplate: '',
                equipmentListResults: '[]',
                streamListTemplate: '',
                streamListResults: '[]',
                safetyRiskAnalystReport: '',
                projectManagerReport: '',
                projectApproval: '',
                // Reset workflow state
                currentStep: 0,
                stepStatuses: {
                    0: 'pending',
                    1: 'pending',
                    2: 'pending',
                    3: 'pending',
                    4: 'pending',
                    5: 'pending',
                    6: 'pending',
                    7: 'pending',
                    8: 'pending',
                    9: 'pending',
                    10: 'pending',
                    11: 'pending',
                },
                outputStatuses: {},
                // Reset to requirements tab
                activeTab: 'requirements',
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
                            modifiedBy: 'user',
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
                            status: 'needs_review',
                            lastModified: new Date().toISOString(),
                            modifiedBy: 'user',
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
            setLLMQuickTemperature: (temperature) => set({ llmQuickTemperature: temperature }),
            setLLMQuickApiKey: (apiKey) => set({ llmQuickApiKey: apiKey }),
            setLLMQuickUseStructured: (useStructured) => set({ llmQuickUseStructured: useStructured }),

            // Deep Thinking model setters
            setLLMDeepProvider: (provider) => set({ llmDeepProvider: provider }),
            setLLMDeepModel: (model) => set({ llmDeepModel: model }),
            setLLMDeepTemperature: (temperature) => set({ llmDeepTemperature: temperature }),
            setLLMDeepApiKey: (apiKey) => set({ llmDeepApiKey: apiKey }),
            setLLMDeepUseStructured: (useStructured) => set({ llmDeepUseStructured: useStructured }),

            // Message transcript actions
            addMessage: (message) => set((state) => ({
                messages: [...state.messages, {
                    ...message,
                    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    timestamp: new Date().toISOString(),
                }],
            })),
            clearMessages: () => set({ messages: [] }),
        }),
        {
            name: 'design-agents-project',
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
        }
    )
);

// Helper function to map output keys to step indices
// Uses centralized stepConfig mapping
export function getStepIndexForKeyStore(key: keyof DesignState): number {
    return getStepIndexForKey(key as string);
}
