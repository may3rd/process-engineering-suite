import type { RequestFn } from "../client";

// Simplified types for hydraulics (full schemas are in @eng-suite/types)
export interface PipeSectionRequest {
  id: string;
  name?: string;
  length?: number;
  pipeDiameter?: number;
  [key: string]: unknown;
}

export interface CalculationResponse {
  edgeId: string;
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

export interface NetworkPressureDropRequest {
  name: string;
  sections: PipeSectionRequest[];
  fluid: Record<string, unknown>;
  [key: string]: unknown;
}

export interface NetworkPressureDropResponse {
  success: boolean;
  totalPressureDrop?: number;
  results: CalculationResponse[];
  error?: string;
}

export interface InletValidationResponse {
  success: boolean;
  isValid: boolean;
  inletPressureDropPercent: number;
  message: string;
  severity: string;
  [key: string]: unknown;
}

export function createHydraulicsModule(req: RequestFn) {
  return {
    health(): Promise<{ status: string; database: string }> {
      return req("/health");
    },

    calculateEdge(edgeId: string, data: PipeSectionRequest): Promise<CalculationResponse> {
      return req<CalculationResponse>(`/hydraulics/edge/${edgeId}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    calculateNetwork(data: NetworkPressureDropRequest): Promise<NetworkPressureDropResponse> {
      return req<NetworkPressureDropResponse>("/hydraulics/network/pressure-drop", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    validateInlet(data: Record<string, unknown>): Promise<InletValidationResponse> {
      return req<InletValidationResponse>("/hydraulics/validate-inlet", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    solveLength(data: Record<string, unknown>): Promise<{ pipeId: string; estimatedLength?: number; success: boolean }> {
      return req("/hydraulics/solve-length", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  };
}
