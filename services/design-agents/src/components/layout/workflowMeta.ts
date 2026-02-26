import { AgentStep, DesignState } from '../../types';

interface ReadinessCheck {
  label: string;
  ready: boolean;
}

interface WorkflowStepGuide {
  objective: string;
  deliverables: string[];
  checks: (state: DesignState) => ReadinessCheck[];
}

interface WorkflowPhase {
  id: string;
  title: string;
  subtitle: string;
  stepIds: string[];
}

const hasText = (value?: string) => Boolean(value?.trim());

const safeParse = (value?: string) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const hasCatalogTemplate = (state: DesignState) => {
  const parsed = safeParse(state.catalog_template);
  if (!parsed) return false;
  return Array.isArray(parsed.streams) && Array.isArray(parsed.equipments);
};

const hasSimulationResults = (state: DesignState) => {
  const parsed = safeParse(state.simulation_results);
  return Boolean(parsed?.streams && Array.isArray(parsed.streams));
};

const hasSizingResults = (state: DesignState) => {
  const parsed = safeParse(state.sizing_results);
  return Array.isArray(parsed?.equipments) && parsed.equipments.length > 0;
};

const hasReviewMemo = (state: DesignState) => hasText(state.project_manager_report);

export const WORKFLOW_PHASES: WorkflowPhase[] = [
  {
    id: 'discover',
    title: 'Discovery',
    subtitle: 'Define the technical direction',
    stepIds: ['requirements', 'research', 'synthesis'],
  },
  {
    id: 'engineer',
    title: 'Engineering',
    subtitle: 'Generate and quantify the process',
    stepIds: ['pfd', 'catalog', 'simulation', 'sizing'],
  },
  {
    id: 'assurance',
    title: 'Assurance',
    subtitle: 'Validate viability and package decisions',
    stepIds: ['cost', 'safety', 'review', 'report'],
  },
];

export const WORKFLOW_STEP_GUIDE: Record<string, WorkflowStepGuide> = {
  requirements: {
    objective: 'Capture the problem framing and produce a rigorous design basis.',
    deliverables: ['Problem statement', 'Process requirements brief'],
    checks: (state) => [
      { label: 'Problem statement entered', ready: hasText(state.problem_statement) },
      { label: 'Design basis generated', ready: hasText(state.process_requirements) },
    ],
  },
  research: {
    objective: 'Explore alternatives and commit to a viable technology path.',
    deliverables: ['Concept options', 'Selected concept'],
    checks: (state) => [
      { label: 'Requirements available', ready: hasText(state.process_requirements) },
      {
        label: 'Concept list generated',
        ready: Array.isArray(state.research_concepts?.concepts) && state.research_concepts.concepts.length > 0,
      },
      { label: 'Concept selected', ready: Boolean(state.selected_concept) },
    ],
  },
  synthesis: {
    objective: 'Transform selected concept into an actionable technical basis.',
    deliverables: ['Detailed design basis'],
    checks: (state) => [
      { label: 'Selected concept available', ready: Boolean(state.selected_concept) },
      { label: 'Detailed basis generated', ready: hasText(state.selected_concept_details) },
    ],
  },
  pfd: {
    objective: 'Structure the process path into a complete flowsheet narrative.',
    deliverables: ['Flowsheet description'],
    checks: (state) => [
      { label: 'Detailed basis available', ready: hasText(state.selected_concept_details) },
      { label: 'Flowsheet generated', ready: hasText(state.flowsheet_description) },
    ],
  },
  catalog: {
    objective: 'Build stream and equipment templates for simulation.',
    deliverables: ['Stream template JSON', 'Equipment template JSON'],
    checks: (state) => [
      { label: 'Flowsheet available', ready: hasText(state.flowsheet_description) },
      { label: 'Catalog template generated', ready: hasCatalogTemplate(state) },
    ],
  },
  simulation: {
    objective: 'Run mass and energy balance and validate process performance.',
    deliverables: ['Stream properties', 'Equipment operating data'],
    checks: (state) => [
      { label: 'Catalog template ready', ready: hasCatalogTemplate(state) },
      { label: 'Simulation results generated', ready: hasSimulationResults(state) },
    ],
  },
  sizing: {
    objective: 'Calculate key equipment design parameters.',
    deliverables: ['Equipment sizing package', 'Design metadata'],
    checks: (state) => [
      { label: 'Simulation results ready', ready: hasSimulationResults(state) },
      { label: 'Sizing report generated', ready: hasSizingResults(state) },
    ],
  },
  cost: {
    objective: 'Estimate early-phase CAPEX/OPEX from process scope.',
    deliverables: ['Class 5 cost estimate'],
    checks: (state) => [
      { label: 'Sizing results available', ready: hasSizingResults(state) || hasText(state.sizing_results) },
      { label: 'Cost estimate generated', ready: hasText(state.cost_estimation_report) },
    ],
  },
  safety: {
    objective: 'Perform preliminary risk evaluation and mitigation planning.',
    deliverables: ['Safety and risk assessment memo'],
    checks: (state) => [
      { label: 'Flowsheet available', ready: hasText(state.flowsheet_description) },
      { label: 'Safety report generated', ready: hasText(state.safety_report) },
    ],
  },
  review: {
    objective: 'Consolidate technical, safety, and financial outcomes into a gate decision.',
    deliverables: ['Project manager approval memo', 'Approval status'],
    checks: (state) => [
      { label: 'Safety report available', ready: hasText(state.safety_report) },
      { label: 'Review memo generated', ready: hasReviewMemo(state) },
      { label: 'Approval status assigned', ready: hasText(state.project_approval_status) },
    ],
  },
  report: {
    objective: 'Assemble the full dossier for downstream FEED/EPC handoff.',
    deliverables: ['Consolidated markdown report', 'Export-ready document'],
    checks: (state) => [
      { label: 'Requirements complete', ready: hasText(state.process_requirements) },
      { label: 'Engineering package complete', ready: hasSizingResults(state) },
      { label: 'Review memo complete', ready: hasReviewMemo(state) },
    ],
  },
  settings: {
    objective: 'Configure model provider and runtime behavior.',
    deliverables: ['Provider settings', 'Model settings'],
    checks: (state) => [
      { label: 'Provider selected', ready: Boolean(state.llmSettings?.provider) },
      { label: 'Quick model selected', ready: Boolean(state.llmSettings?.quickModel) },
      { label: 'Deep model selected', ready: Boolean(state.llmSettings?.deepModel) },
    ],
  },
};

export const getStepGuide = (stepId: string): WorkflowStepGuide => {
  const fallback: WorkflowStepGuide = {
    objective: 'Run this workflow stage and capture its output.',
    deliverables: ['Stage output'],
    checks: () => [],
  };
  return WORKFLOW_STEP_GUIDE[stepId] ?? fallback;
};

export const getStepReadiness = (stepId: string, state: DesignState): ReadinessCheck[] => {
  return getStepGuide(stepId).checks(state);
};

export const getWorkflowProgress = (steps: AgentStep[]) => {
  const total = steps.length;
  const completed = steps.filter((step) => step.status === 'completed').length;
  const running = steps.filter((step) => step.status === 'running').length;
  const failed = steps.filter((step) => step.status === 'failed').length;
  const ratio = total === 0 ? 0 : completed / total;

  return { total, completed, running, failed, ratio };
};

export const getPhaseByStep = (stepId: string) => {
  return WORKFLOW_PHASES.find((phase) => phase.stepIds.includes(stepId));
};
