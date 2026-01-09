/**
 * TypeScript types mirroring Python DesignState and agent schemas
 */

import { AgentStep, AGENT_STEPS, AGENT_LABELS } from './stepConfig';

export type { AgentStep };
export { AGENT_STEPS, AGENT_LABELS };

export type StepStatus = 'pending' | 'running' | 'needs_review' | 'complete' | 'edited' | 'outdated';

export type OutputStatus = 'draft' | 'needs_review' | 'approved' | 'needs_rerun' | 'outdated';

export interface OutputMetadata {
    status: OutputStatus;
    lastModified: string;
    modifiedBy: 'user' | 'ai' | 'system';
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
    
    // Live activity monitoring
    activityLogs: ActivityLog[];
}

/**
 * Activity Log entry for live monitoring
 */
export interface ActivityLog {
    id: string;
    timestamp: string;
    stepIndex?: number;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
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
