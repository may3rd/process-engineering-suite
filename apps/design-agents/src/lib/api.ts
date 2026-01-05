/**
 * API client for FastAPI backend (stubbed for now)
 */

export interface AgentExecutionRequest {
    problemStatement: string;
    currentState: Record<string, string>;
    agentName: string;
}

export interface AgentExecutionResponse {
    success: boolean;
    output: Record<string, string>;
    error?: string;
}

export class DesignAgentsAPI {
    private baseUrl: string;

    constructor(baseUrl: string = 'http://localhost:8000') {
        this.baseUrl = baseUrl;
    }

    async executeAgent(request: AgentExecutionRequest): Promise<AgentExecutionResponse> {
        // TODO: Implement actual API call
        // For now, return mock response
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    output: {
                        [request.agentName]: `Mock output from ${request.agentName}`,
                    },
                });
            }, 1000);
        });
    }

    async streamAgentExecution(
        request: AgentExecutionRequest,
        onChunk: (chunk: string) => void
    ): Promise<void> {
        // TODO: Implement SSE/WebSocket streaming
        console.log('Streaming not implemented yet', request, onChunk);
    }
}

export const api = new DesignAgentsAPI();
