import type { components } from "@eng-suite/types";
import type { RequestFn } from "../client";

type DesignAgentSession = components["schemas"]["DesignAgentSessionResponse"];
type DesignAgentSessionCreate = components["schemas"]["DesignAgentSessionCreate"];
type DesignAgentSessionUpdate = components["schemas"]["DesignAgentSessionUpdate"];
type AgentResponse = components["schemas"]["AgentResponse"];

export function createDesignAgentsModule(req: RequestFn) {
  return {
    // --- Existing endpoints ---
    health(): Promise<{ status: string; modules_loaded: boolean }> {
      return req("/design-agents/health");
    },

    process(prompt: string, context: Record<string, unknown> = {}): Promise<AgentResponse> {
      return req<AgentResponse>("/design-agents/process", {
        method: "POST",
        body: JSON.stringify({ prompt, context }),
      });
    },

    // --- Session CRUD ---
    listSessions(params?: { ownerId?: string }): Promise<DesignAgentSession[]> {
      const qs = new URLSearchParams();
      if (params?.ownerId) qs.set("ownerId", params.ownerId);
      const query = qs.toString() ? `?${qs}` : "";
      return req<DesignAgentSession[]>(`/design-agents/sessions${query}`);
    },

    getSession(id: string): Promise<DesignAgentSession> {
      return req<DesignAgentSession>(`/design-agents/sessions/${id}`);
    },

    createSession(data: DesignAgentSessionCreate): Promise<DesignAgentSession> {
      return req<DesignAgentSession>("/design-agents/sessions", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    updateSession(id: string, data: DesignAgentSessionUpdate): Promise<DesignAgentSession> {
      return req<DesignAgentSession>(`/design-agents/sessions/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    deleteSession(id: string): Promise<void> {
      return req<void>(`/design-agents/sessions/${id}`, { method: "DELETE" });
    },
  };
}
