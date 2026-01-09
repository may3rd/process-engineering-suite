import { useDesignStore } from '../store/useDesignStore';

const API_URL = 'http://localhost:8000';

export async function checkHealth() {
  const res = await fetch(`${API_URL}/design-agents/health`);
  return res.json();
}

export async function runAgent(agentId: string, payload: any) {
  // Get latest settings from store
  const { designState } = useDesignStore.getState();
  const llmConfig = designState.llmSettings;

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
  if (!res.ok) throw new Error('Agent failed');
  return res.json();
}
