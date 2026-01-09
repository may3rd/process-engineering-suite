const API_BASE = 'http://localhost:3000'; // Proxy redirects to 8000 usually, or direct to 8000 if no proxy. 
// Wait, we configured CORS on port 8000 (API). We should hit 8000 directly or via Next.js rewrites.
// Since this is Vite (Port 3004), we likely need to hit http://localhost:8000 directly.

const API_URL = 'http://localhost:8000';

export async function checkHealth() {
  const res = await fetch(`${API_URL}/health`);
  return res.json();
}

export async function runAgent(agentId: string, payload: any) {
  const res = await fetch(`${API_URL}/design-agents/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: payload.prompt, context: { agentId, ...payload } }),
  });
  if (!res.ok) throw new Error('Agent failed');
  return res.json();
}
