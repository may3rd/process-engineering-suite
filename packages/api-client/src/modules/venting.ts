import type { components } from "@eng-suite/types";
import type { RequestFn } from "../client";

type VentingCalculation = components["schemas"]["VentingCalculationResponse"];
type VentingCalculationCreate = components["schemas"]["VentingCalculationCreate"];
type VentingCalculationUpdate = components["schemas"]["VentingCalculationUpdate"];

export function createVentingModule(req: RequestFn) {
  return {
    list(params?: {
      areaId?: string;
      equipmentId?: string;
      includeDeleted?: boolean;
    }): Promise<VentingCalculation[]> {
      const qs = new URLSearchParams();
      if (params?.areaId) qs.set("areaId", params.areaId);
      if (params?.equipmentId) qs.set("equipmentId", params.equipmentId);
      if (params?.includeDeleted) qs.set("includeDeleted", "true");
      const query = qs.toString() ? `?${qs}` : "";
      return req<VentingCalculation[]>(`/venting${query}`);
    },

    get(id: string): Promise<VentingCalculation> {
      return req<VentingCalculation>(`/venting/${id}`);
    },

    create(data: VentingCalculationCreate): Promise<VentingCalculation> {
      return req<VentingCalculation>("/venting", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    update(id: string, data: VentingCalculationUpdate): Promise<VentingCalculation> {
      return req<VentingCalculation>(`/venting/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    delete(id: string): Promise<void> {
      return req<void>(`/venting/${id}`, { method: "DELETE" });
    },

    restore(id: string): Promise<VentingCalculation> {
      return req<VentingCalculation>(`/venting/${id}/restore`, { method: "POST" });
    },
  };
}
