/**
 * TypeScript types mirroring Python DesignState and agent schemas
 */

export type AgentStep =
    | 'process_requirements_analyst'
    | 'innovative_researcher'
    | 'conservative_researcher'
    | 'concept_detailer'
    | 'component_list_researcher'
    | 'design_basis_analyst'
    | 'flowsheet_design_agent'
    | 'equipment_stream_catalog_agent'
    | 'stream_property_estimation_agent'
    | 'equipment_sizing_agent'
    | 'safety_risk_analyst'
    | 'project_manager';

export type StepStatus = 'pending' | 'running' | 'complete' | 'edited' | 'outdated';

export type OutputStatus = 'draft' | 'needs_review' | 'approved' | 'needs_rerun' | 'outdated';

export interface OutputMetadata {
    status: OutputStatus;
    lastModified: string;
    modifiedBy: 'user' | 'ai';
    version: number;
}

export interface ResearchConcept {
    name: string;
    description: string;
    maturity: 'Proven' | 'Emerging' | 'Experimental';
    key_features: string[];
}

export interface ConceptEvaluation {
    concept_name: string;
    feasibility_score: number;
    risks: string[];
    recommendations: string[];
}

export interface EquipmentItem {
    tag: string;
    type: string;
    description: string;
    duty?: number;
    duty_unit?: string;
    size?: string;
    notes?: string;
}

export interface StreamItem {
    tag: string;
    from: string;
    to: string;
    phase?: 'Gas' | 'Liquid' | 'Two-Phase' | 'Steam';
    temperature?: number;
    temperature_unit?: string;
    pressure?: number;
    pressure_unit?: string;
    mass_flow?: number;
    mass_flow_unit?: string;
    composition?: Record<string, number>;
}

export interface DesignProject {
    id: string;
    name: string;
    createdAt: string;
    lastModified: string;
    status: 'draft' | 'in_progress' | 'complete';
}

/**
 * Main state interface mirroring Python DesignState
 */
export interface DesignState {
    // Project metadata
    project: DesignProject | null;

    // Agent outputs (strings, matching Python)
    problemStatement: string;
    processRequirements: string;
    researchConcepts: string; // JSON string
    researchRatingResults: string; // JSON string
    selectedConceptName: string;
    selectedConceptDetails: string;
    selectedConceptEvaluation: string; // JSON of chosen concept's evaluation
    componentList: string;
    designBasis: string;
    flowsheetDescription: string;
    equipmentListTemplate: string;
    equipmentListResults: string;
    streamListTemplate: string;
    streamListResults: string;
    safetyRiskAnalystReport: string;
    projectManagerReport: string;
    projectApproval: string;

    // UI state
    currentStep: number;
    stepStatuses: Record<number, StepStatus>;
    activeTab: 'requirements' | 'research' | 'components' | 'design' | 'spreadsheet' | 'approval' | 'settings' | 'storage' | 'export' | 'transcript';
    outputStatuses: Record<string, OutputMetadata>;

    // LLM configuration - Quick model (for fast responses)
    llmQuickProvider: string;
    llmQuickModel: string;
    llmQuickTemperature: number;
    llmQuickApiKey: string;
    llmQuickUseStructured: boolean;

    // LLM configuration - Deep Thinking model (for complex reasoning)
    llmDeepProvider: string;
    llmDeepModel: string;
    llmDeepTemperature: number;
    llmDeepApiKey: string;
    llmDeepUseStructured: boolean;

    // LLM message transcript for debugging
    messages: LLMMessage[];
}

/**
 * LLM Message for transcript tracking
 */
export interface LLMMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    agentStep?: AgentStep;
    model?: string;
    tokenCount?: number;
}

export const AGENT_STEPS: AgentStep[] = [
    'process_requirements_analyst',
    'innovative_researcher',
    'conservative_researcher',
    'concept_detailer',
    'component_list_researcher',
    'design_basis_analyst',
    'flowsheet_design_agent',
    'equipment_stream_catalog_agent',
    'stream_property_estimation_agent',
    'equipment_sizing_agent',
    'safety_risk_analyst',
    'project_manager',
];

export const AGENT_LABELS: Record<AgentStep, string> = {
    process_requirements_analyst: 'Process Requirements',
    innovative_researcher: 'Innovative Research',
    conservative_researcher: 'Conservative Research',
    concept_detailer: 'Concept Selection',
    component_list_researcher: 'Component List',
    design_basis_analyst: 'Design Basis',
    flowsheet_design_agent: 'Flowsheet Design',
    equipment_stream_catalog_agent: 'Equipment & Stream Catalog',
    stream_property_estimation_agent: 'Stream Properties',
    equipment_sizing_agent: 'Equipment Sizing',
    safety_risk_analyst: 'Safety & Risk',
    project_manager: 'Project Approval',
};
