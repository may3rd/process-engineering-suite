import { DESIGN_STEPS } from '../types';
import { useDesignStore } from '../store/useDesignStore';
import { useLogStore } from '../store/useLogStore';
import { runAgent } from './api';

type TurboResult = {
  status: 'completed' | 'failed';
  failedStepId?: string;
  error?: string;
};

const getDesignState = () => useDesignStore.getState().designState;

const setActiveStep = (stepId: string) => {
  useDesignStore.getState().setActiveStep(stepId);
};

const updateStepStatus = (stepId: string, status: 'pending' | 'running' | 'completed' | 'failed' | 'outdated') => {
  useDesignStore.getState().updateStepStatus(stepId, status);
};

const updateDesignState = (partial: Partial<ReturnType<typeof getDesignState>>) => {
  useDesignStore.getState().updateDesignState(partial);
};

const addLog = (message: string) => {
  useLogStore.getState().addLog(message, 'process');
};

const setTurboActive = (active: boolean) => {
  useLogStore.getState().setActive(active);
};

const clearTurboLogs = () => {
  useLogStore.getState().clearLogs();
};

const parseAgentJson = (value: unknown) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};

const chooseBestConcept = (rawConcepts: unknown) => {
  const parsed = parseAgentJson(rawConcepts) as { concepts?: Array<Record<string, unknown>> } | null;
  const concepts = Array.isArray(parsed?.concepts) ? parsed.concepts : [];
  if (concepts.length === 0) {
    return { concepts: [], selected: null };
  }

  const ranked = [...concepts].sort((a, b) => {
    const scoreA = typeof a.feasibility_score === 'number' ? a.feasibility_score : -1;
    const scoreB = typeof b.feasibility_score === 'number' ? b.feasibility_score : -1;
    return scoreB - scoreA;
  });

  return { concepts, selected: ranked[0] ?? concepts[0] ?? null };
};

const runRequirements = async () => {
  const designState = getDesignState();
  const prompt = designState.problem_statement?.trim();
  if (!prompt) {
    throw new Error('Problem statement is required.');
  }

  const result = await runAgent('requirements_agent', { prompt });
  if (result.status === 'completed' && result.data?.output) {
    updateDesignState({ process_requirements: result.data.output });
    return;
  }
  throw new Error(result.message || 'Requirements analysis failed.');
};

const runResearch = async () => {
  const designState = getDesignState();
  const prompt = designState.process_requirements || designState.problem_statement || '';
  if (!prompt.trim()) {
    throw new Error('Requirements input is required.');
  }

  const result = await runAgent('research_agent', { prompt });
  if (result.status === 'completed' && result.data?.output) {
    const { concepts, selected } = chooseBestConcept(result.data.output);
    if (concepts.length === 0 || !selected) {
      throw new Error('No concepts were returned by research agent.');
    }
    updateDesignState({
      research_concepts: { concepts: concepts as any[] },
      selected_concept: selected as any,
    });
    return;
  }
  throw new Error(result.message || 'Research failed.');
};

const runSynthesis = async () => {
  const designState = getDesignState();
  if (!designState.selected_concept) throw new Error('No concept selected.');

  const result = await runAgent('synthesis_agent', { 
    prompt: designState.process_requirements || '',
    selected_concept: designState.selected_concept
  });

  if (result.status === 'completed' && result.data?.output) {
    updateDesignState({ selected_concept_details: result.data.output });
    return;
  }
  throw new Error(result.message || 'Synthesis failed.');
};

const runPfd = async () => {
  const designState = getDesignState();
  if (!designState.selected_concept_details) throw new Error('No design basis available.');

  const result = await runAgent('pfd_agent', { 
    prompt: designState.process_requirements || 'Generate PFD',
    requirements: designState.process_requirements,
    concept_name: designState.selected_concept?.name,
    concept_details: designState.selected_concept_details
  });

  if (result.status === 'completed' && result.data?.output) {
    updateDesignState({ flowsheet_description: result.data.output });
    return;
  }
  throw new Error(result.message || 'PFD generation failed.');
};

const runCatalog = async () => {
  const designState = getDesignState();

  if (!designState.flowsheet_description || !designState.selected_concept_details) {
    throw new Error('Missing flowsheet or design basis.');
  }

  const catalogResult = await runAgent('catalog_agent', { 
    prompt: 'Generate Catalog',
    flowsheet: designState.flowsheet_description,
    design_basis: designState.selected_concept_details,
    requirements: designState.process_requirements,
    concept_details: designState.selected_concept_details
  });

  if (catalogResult.status === 'completed' && catalogResult.data?.output) {
    updateDesignState({ catalog_template: catalogResult.data.output });
  } else {
    throw new Error(catalogResult.message || 'Catalog generation failed.');
  }
};

const runSimulation = async () => {
  const designState = getDesignState();
  if (!designState.catalog_template) throw new Error('No catalog template available.');

  const simulationResult = await runAgent('simulation_agent', { 
    prompt: 'Run Simulation',
    flowsheet: getDesignState().flowsheet_description,
    design_basis: getDesignState().selected_concept_details,
    catalog_template: getDesignState().catalog_template
  });

  if (simulationResult.status === 'completed' && simulationResult.data?.output) {
    updateDesignState({ 
      simulation_results: simulationResult.data.output,
      full_simulation_results: simulationResult.data.full_results
    });
    return;
  }
  throw new Error(simulationResult.message || 'Simulation failed.');
};

const runSizing = async () => {
  const designState = getDesignState();
  if (!designState.full_simulation_results) throw new Error('No simulation results available.');

  const result = await runAgent('sizing_agent', { 
    prompt: 'Run Equipment Sizing',
    flowsheet: designState.flowsheet_description,
    design_basis: designState.selected_concept_details,
    full_simulation_results: designState.full_simulation_results
  });

  if (result.status === 'completed' && result.data?.output) {
    updateDesignState({ sizing_results: result.data.output });
    return;
  }
  throw new Error(result.message || 'Sizing failed.');
};

const runCost = async () => {
  const designState = getDesignState();
  if (!designState.sizing_results) throw new Error('No sizing results available.');

  const result = await runAgent('cost_agent', { 
    design_basis: designState.selected_concept_details,
    flowsheet: designState.flowsheet_description,
    equipment_list: designState.sizing_results || designState.equipment_list_results,
    full_results: designState.full_simulation_results
  });

  if (result.status === 'completed' && result.data?.output) {
    updateDesignState({ cost_estimation_report: result.data.output });
    return;
  }
  throw new Error(result.message || 'Costing failed.');
};

const runSafety = async () => {
  const designState = getDesignState();
  if (!designState.flowsheet_description) throw new Error('No flowsheet available.');

  const result = await runAgent('safety_agent', { 
    prompt: 'Run Preliminary HAZOP',
    requirements: designState.process_requirements,
    design_basis: designState.selected_concept_details,
    flowsheet: designState.flowsheet_description,
    full_results: designState.sizing_results || designState.full_simulation_results
  });

  if (result.status === 'completed' && result.data?.output) {
    updateDesignState({ safety_report: result.data.output });
    return;
  }
  throw new Error(result.message || 'Safety assessment failed.');
};

const runReview = async () => {
  const designState = getDesignState();
  if (!designState.safety_report) throw new Error('No safety report available.');

  const result = await runAgent('manager_agent', { 
    prompt: 'Perform Final Design Review',
    requirements: designState.process_requirements,
    design_basis: designState.selected_concept_details,
    flowsheet: designState.flowsheet_description,
    full_results: designState.sizing_results || designState.full_simulation_results,
    safety_report: designState.safety_report
  });

  if (result.status === 'completed' && result.data?.output) {
    updateDesignState({ 
      project_manager_report: result.data.output,
      project_approval_status: result.data.status
    });
    return;
  }
  throw new Error(result.message || 'Review failed.');
};

const runReport = async () => {
  const designState = getDesignState();
  const sections = [
    { title: '1. Process Requirements', content: designState.process_requirements },
    { title: '2. Selected Concept', content: designState.selected_concept ? `**${designState.selected_concept.name}**\n\n${designState.selected_concept.description}` : '*No concept selected*' },
    { title: '3. Detailed Design Basis', content: designState.selected_concept_details },
    { title: '4. Flowsheet Description', content: designState.flowsheet_description },
    { title: '5. Class 5 Cost Estimate', content: designState.cost_estimation_report },
    { title: '6. Safety Assessment', content: designState.safety_report },
    { title: '7. Executive Approval Memo', content: designState.project_manager_report }
  ];
  const fullReport = sections.map((s) => `# ${s.title}\n\n${s.content || '*Section incomplete*'}`).join('\n\n---\n\n');
  updateDesignState({ final_report: fullReport });
};

const runStep = async (stepId: string) => {
  switch (stepId) {
    case 'requirements':
      await runRequirements();
      return;
    case 'research':
      await runResearch();
      return;
    case 'synthesis':
      await runSynthesis();
      return;
    case 'pfd':
      await runPfd();
      return;
    case 'catalog':
      await runCatalog();
      return;
    case 'simulation':
      await runSimulation();
      return;
    case 'sizing':
      await runSizing();
      return;
    case 'cost':
      await runCost();
      return;
    case 'safety':
      await runSafety();
      return;
    case 'review':
      await runReview();
      return;
    case 'report':
      await runReport();
      return;
    default:
      return;
  }
};

export const runTurboPipeline = async (startStepId: string): Promise<TurboResult> => {
  const startIndex = DESIGN_STEPS.findIndex((s) => s.id === startStepId);
  if (startIndex === -1) {
    return { status: 'failed', error: 'Invalid step.' };
  }

  clearTurboLogs();
  setTurboActive(true);
  addLog('Turbo pipeline started.');

  try {
    for (let i = startIndex; i < DESIGN_STEPS.length; i += 1) {
      const step = DESIGN_STEPS[i]!;
      setActiveStep(step.id);
      updateStepStatus(step.id, 'running');
      addLog(`Turbo: ${step.label}`);
      try {
        await runStep(step.id);
        updateStepStatus(step.id, 'completed');
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        updateStepStatus(step.id, 'failed');
        addLog(`Turbo failed at ${step.label}: ${message}`);
        return { status: 'failed', failedStepId: step.id, error: message };
      }
    }

    addLog('Turbo pipeline completed.');
    return { status: 'completed' };
  } finally {
    setTurboActive(false);
  }
};
