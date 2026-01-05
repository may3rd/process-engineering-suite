import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DesignState, StepStatus, OutputStatus, OutputMetadata } from '@/data/types';
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
    outputStatuses: {},
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
                const { currentStep, setStepStatus, setCurrentStep, setStepOutput, setOutputStatus } = get();

                // Mark current step as complete
                setStepStatus(currentStep, 'complete');

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
                        setStepOutput('selectedConceptName', 'Autothermal Reforming (ATR)');
                        setOutputStatus('selectedConceptName', 'needs_review');
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

                // Move to next step if not at the end
                if (currentStep < 11) {
                    const nextStep = currentStep + 1;
                    setCurrentStep(nextStep);
                    setStepStatus(nextStep, 'running');
                    // Mock completion of next step after a delay to show progress
                    setTimeout(() => setStepStatus(nextStep, 'complete'), 1000);
                }
            },

            resetProject: () => set(initialState),

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
                const currentStepForKey = getStepIndexForKey(key);

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
                    markDownstreamOutdated(currentStepForKey);
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
                // Exclude: activeTab (UI state)
            }),
        }
    )
);

// Helper function to map output keys to step indices
// Steps: 0-Process Req, 1-Innovative, 2-Conservative, 3-Concept Detailer, 4-Component List,
// 5-Design Basis, 6-Flowsheet, 7-Catalog, 8-Stream Estimation, 9-Equipment Sizing,
// 10-Safety, 11-Project Manager
function getStepIndexForKey(key: keyof DesignState): number {
    const keyToStepMap: Record<string, number> = {
        'processRequirements': 0,
        'researchConcepts': 1,
        'researchRatingResults': 2,
        'selectedConceptName': 3,
        'selectedConceptDetails': 3,
        'selectedConceptEvaluation': 3,
        'componentList': 4,
        'designBasis': 5,
        'flowsheetDescription': 6,
        'equipmentListTemplate': 7,
        'streamListTemplate': 7,
        'streamListResults': 8,
        'equipmentListResults': 9,
        'safetyRiskAnalystReport': 10,
        'projectManagerReport': 11,
    };
    return keyToStepMap[key] ?? -1;
}
