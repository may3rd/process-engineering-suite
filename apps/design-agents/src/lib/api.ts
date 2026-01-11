import { useLogStore } from '../store/useLogStore';
import { useDesignStore } from '../store/useDesignStore';

// When running in the monorepo via Next.js proxy (apps/web), calls to /design-agents/api/.. 
// should be routed to the backend. 
// However, the Vite app is served at /design-agents/ (base).
// The backend is at localhost:8000.
// If we are standalone, we might want localhost:8000.
// But the issue reported is "offline". 
// Let's assume we want to hit the backend directly for now to fix the offline issue, 
// OR fix the proxy config.
// Since the user said "api is running", and previously it was 8000.
// If we are in the browser, localhost:8000 might be blocked if mixed content or network error.
// BUT, if we are running via `apps/web` (port 3000), we should probably use the proxy if configured.
// But `apps/web` proxy config was:
// source: "/design-agents/:path*", destination: "http://localhost:3004/design-agents/:path*"
// This proxies the FRONTEND assets. It does NOT proxy the API calls made BY the frontend.
// The frontend (running in browser) makes the fetch.
// If `API_URL` is `http://localhost:8000`, the browser hits port 8000.
// If that fails, it might be because the browser is on 3000 and 8000 doesn't have CORS for 3000?
// Wait, `apps/api/main.py` HAS CORS for 3000, 3001, 3002, 3003, 3004.
// So direct call should work.

// HOWEVER, maybe the browser interprets "localhost" as IPv6 (::1) and the server listens on IPv4 (127.0.0.1).
// Let's try 127.0.0.1 to be safe.

const API_URL = 'http://127.0.0.1:8000';

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