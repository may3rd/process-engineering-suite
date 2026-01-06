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

export const TOTAL_STEPS = AGENT_STEPS.length;

export type StepIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export const STEP_OUTPUTS: Record<StepIndex, string[]> = {
    0: ['processRequirements'],
    1: ['researchConcepts'],
    2: ['researchRatingResults'],
    3: ['selectedConceptName', 'selectedConceptDetails', 'selectedConceptEvaluation'],
    4: ['componentList'],
    5: ['designBasis'],
    6: ['flowsheetDescription'],
    7: ['equipmentListTemplate', 'streamListTemplate'],
    8: ['streamListResults'],
    9: ['equipmentListResults'],
    10: ['safetyRiskAnalystReport'],
    11: ['projectManagerReport', 'projectApproval'],
};

export const OUTPUT_TO_STEP: Record<string, StepIndex> = Object.entries(STEP_OUTPUTS).reduce(
    (acc, [step, keys]) => {
        keys.forEach(key => {
            acc[key] = Number(step) as StepIndex;
        });
        return acc;
    },
    {} as Record<string, StepIndex>
);

export function getStepIndexForKey(key: string): StepIndex | -1 {
    return OUTPUT_TO_STEP[key] ?? -1;
}

export function getOutputsForStep(step: StepIndex): string[] {
    return STEP_OUTPUTS[step] ?? [];
}

export function getStepLabel(step: StepIndex): string {
    return AGENT_LABELS[AGENT_STEPS[step]];
}

export function getStepDescription(step: StepIndex): string {
    const descriptions: Record<StepIndex, string> = {
        0: 'Extract and structure process requirements from problem statement',
        1: 'Research innovative process concepts and technologies',
        2: 'Analyze feasibility of conservative/reliable approaches',
        3: 'Select and detail the preferred process concept',
        4: 'Identify key chemical components and their properties',
        5: 'Establish design basis parameters and constraints',
        6: 'Describe process flow and major equipment',
        7: 'Generate equipment and stream catalog templates',
        8: 'Estimate stream properties and compositions',
        9: 'Size equipment based on process requirements',
        10: 'Conduct safety and risk analysis',
        11: 'Final review and project approval',
    };
    return descriptions[step];
}
