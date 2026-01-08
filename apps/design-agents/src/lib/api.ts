/**
 * API client for FastAPI backend - ProcessDesignAgents workflow integration
 */

// Backend API interfaces
export interface WorkflowConfig {
  llm_provider?: string;
  quick_think_model?: string;
  deep_think_model?: string;
  temperature?: number;
  resume_from_last?: boolean;
}

export interface WorkflowRequest {
  problem_statement: string;
  config?: WorkflowConfig;
}

export interface WorkflowResponse {
  workflow_id: string;
  status: string;
  message?: string;
}

export interface WorkflowStatus {
  workflow_id: string;
  status: string;
  current_step: number | null;
  step_statuses: Record<number, string>;
  outputs: Record<string, any>;
  error_message?: string;
  created_at: string;
  updated_at: string;
  problem_statement: string;
  config: Record<string, any>;
}

export interface StepExecutionRequest {
  step_index: number;
}

export interface StepExecutionResponse {
  success: boolean;
  step_index: number;
  status: string;
  message: string;
  next_step_available: boolean;
  error_message?: string;
}

export interface StreamUpdate {
  type: string;
  step_index?: number;
  step_name?: string;
  message?: string;
  outputs?: Record<string, any>;
  error?: string;
  timestamp?: string;
}

// Frontend-compatible interfaces (for backward compatibility)
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
  private currentWorkflowId: string | null = null;

  constructor(baseUrl: string = "http://localhost:8000") {
    this.baseUrl = baseUrl;
  }

  // Workflow management methods
  async createWorkflow(
    request: WorkflowRequest,
    preserveExistingResults = false,
  ): Promise<WorkflowResponse> {
    const response = await fetch(
      `${this.baseUrl}/design-agents/workflows?preserve_existing_results=${preserveExistingResults}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to create workflow: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    this.currentWorkflowId = data.workflow_id;
    return data;
  }

  async getWorkflowStatus(workflowId?: string): Promise<WorkflowStatus> {
    const id = workflowId || this.currentWorkflowId;
    if (!id) {
      throw new Error("No workflow ID available. Create a workflow first.");
    }

    const response = await fetch(
      `${this.baseUrl}/design-agents/workflows/${id}`,
    );

    if (!response.ok) {
      throw new Error(
        `Failed to get workflow status: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  async executeWorkflowStep(
    stepIndex: number,
    workflowId?: string,
  ): Promise<StepExecutionResponse> {
    const id = workflowId || this.currentWorkflowId;
    if (!id) {
      throw new Error("No workflow ID available. Create a workflow first.");
    }

    const request: StepExecutionRequest = { step_index: stepIndex };

    const response = await fetch(
      `${this.baseUrl}/design-agents/workflows/${id}/execute/${stepIndex}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to execute step: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    return await response.json();
  }

  async streamWorkflowUpdates(
    workflowId?: string,
    onUpdate?: (update: StreamUpdate) => void,
  ): Promise<EventSource> {
    const id = workflowId || this.currentWorkflowId;
    if (!id) {
      throw new Error("No workflow ID available. Create a workflow first.");
    }

    const eventSource = new EventSource(
      `${this.baseUrl}/design-agents/workflows/${id}/stream`,
    );

    eventSource.onmessage = (event) => {
      try {
        const update: StreamUpdate = JSON.parse(event.data);
        if (onUpdate) {
          onUpdate(update);
        }
      } catch (error) {
        console.error("Failed to parse stream update:", event.data, error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("Stream error:", error);
    };

    return eventSource;
  }

  async deleteWorkflow(workflowId?: string): Promise<void> {
    const id = workflowId || this.currentWorkflowId;
    if (!id) {
      throw new Error("No workflow ID available.");
    }

    const response = await fetch(
      `${this.baseUrl}/design-agents/workflows/${id}`,
      {
        method: "DELETE",
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to delete workflow: ${response.status} ${response.statusText}`,
      );
    }

    if (this.currentWorkflowId === id) {
      this.currentWorkflowId = null;
    }
  }

  // Legacy methods for backward compatibility
  async executeAgent(
    request: AgentExecutionRequest,
  ): Promise<AgentExecutionResponse> {
    // Convert legacy request to workflow execution
    console.warn(
      "executeAgent is deprecated. Use workflow-based methods instead.",
    );

    try {
      // For now, return a mock response to maintain compatibility
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            output: {
              [request.agentName]: `Mock output from ${request.agentName} (legacy API)`,
            },
          });
        }, 1000);
      });
    } catch (error) {
      return {
        success: false,
        output: {},
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async streamAgentExecution(
    request: AgentExecutionRequest,
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    // Legacy streaming - not implemented
    console.warn(
      "streamAgentExecution is deprecated. Use streamWorkflowUpdates instead.",
    );
    console.log("Streaming not implemented for legacy API", request, onChunk);
  }

  // Utility methods
  getCurrentWorkflowId(): string | null {
    return this.currentWorkflowId;
  }

  setCurrentWorkflowId(workflowId: string): void {
    this.currentWorkflowId = workflowId;
  }
}

export const api = new DesignAgentsAPI();
