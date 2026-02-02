import { useLogStore } from '../store/useLogStore';
import { useDesignStore } from '../store/useDesignStore';
import { getApiUrl } from '@eng-suite/api-std/config';

const API_URL = getApiUrl();

export async function checkHealth() {
  const res = await fetch(`${API_URL}/design-agents/health`);
  return res.json();
}

export async function runAgent(agentId: string, payload: any) {
  const { addLog, setActive } = useLogStore.getState();
  const { designState } = useDesignStore.getState();
  const llmConfig = designState.llmSettings;

  setActive(true);
  addLog(`Initializing ${agentId}...`, 'info');

  try {
    // Simulate thinking steps for UX (since real stream isn't implemented yet)
    // In a real implementation, we would consume a streamed response.
    const steps = getMockSteps(agentId);
    let stepIndex = 0;
    
    const interval = setInterval(() => {
        if (stepIndex < steps.length) {
            addLog(steps[stepIndex]!, 'process');
            stepIndex++;
        }
    }, 1500);

    const res = await fetch(`${API_URL}/design-agents/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: payload.prompt || "Run Agent", 
        context: { 
          agentId, 
          ...payload,
          llm_config: llmConfig 
        } 
      }),
    });

    clearInterval(interval);

    if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
            // Try to get detail from server first
            try {
                const errData = await res.json();
                if (errData.detail) throw new Error(errData.detail);
            } catch (e) {
                if (e instanceof Error && (e.message.includes('API KEY') || e.message.includes('API Error'))) throw e;
            }
            throw new Error('API Error: Please check your API key.');
        }
        if (res.status === 500) {
            // Try to read error details if available
            try {
                const errData = await res.json();
                if (errData.detail) throw new Error(`Server Error: ${errData.detail}`);
            } catch (jsonError) {
                // If JSON parsing fails, just throw generic
            }
            throw new Error('Agent failed (Server Error 500)');
        }
        throw new Error(`Agent failed with status ${res.status}`);
    }
    const data = await res.json();
    
    addLog(`Agent completed successfully.`, 'success');
    return data;
  } catch (e) {
    addLog(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`, 'info'); // Using 'info' style for error to avoid red flash if handled
    throw e;
  } finally {
    setActive(false);
  }
}

// Mock steps to make it feel alive while waiting for the monolithic response
function getMockSteps(agentId: string): string[] {
    switch (agentId) {
        case 'requirements_agent':
            return [
                "Parsing problem statement...",
                "Identifying key constraints...",
                "Extracting design parameters...",
                "Formatting design basis..."
            ];
        case 'research_agent':
            return [
                "Scanning technology database...",
                "Evaluating conventional pathways...",
                "Brainstorming innovative solutions...",
                "Structuring concept cards..."
            ];
        case 'synthesis_agent':
            return [
                "Loading selected concept context...",
                "Calculating operational envelope...",
                "Identifying major equipment...",
                "Drafting process narrative..."
            ];
        case 'pfd_agent':
            return [
                "Mapping stream connectivity...",
                "Defining unit operations...",
                "Assigning stream IDs...",
                "Optimizing flow layout..."
            ];
        case 'catalog_agent':
            return [
                "Parsing PFD structure...",
                "Initializing equipment template...",
                "Creating stream placeholders...",
                "Validating schema integrity..."
            ];
        case 'simulation_agent':
            return [
                "Loading thermodynamic models (CoolProp)...",
                "Solving mass balance equations...",
                "Performing energy balance checks...",
                "Reconciling stream properties..."
            ];
        case 'sizing_agent':
            return [
                "Retrieving design codes (ASME/API)...",
                "Calculating heat transfer coefficients...",
                "Estimating vessel dimensions...",
                "Determining pump hydraulic power..."
            ];
        case 'cost_agent':
            return [
                "Analyzing equipment scope...",
                "Applying installation factors...",
                "Benchmarking against cost curves...",
                "Generating Class 5 Estimate..."
            ];
        case 'safety_agent':
            return [
                "Initializing HAZOP matrix...",
                "Analyzing deviation scenarios...",
                "Assessing risk severity and likelihood...",
                "Proposing mitigation strategies..."
            ];
        case 'manager_agent':
            return [
                "Aggregating project data...",
                "Calculating CAPEX/OPEX estimates...",
                "Evaluating project feasibility...",
                "Drafting approval memo..."
            ];
        default:
            return ["Processing request...", "Analyzing data...", "Finalizing output..."];
    }
}