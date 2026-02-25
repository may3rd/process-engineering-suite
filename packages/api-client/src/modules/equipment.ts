import type { components } from "@eng-suite/types";
import type { RequestFn } from "../client";

type Equipment = components["schemas"]["EquipmentResponse"];

export function createEquipmentModule(req: RequestFn) {
  return {
    /**
     * List equipment, optionally filtered by area and/or type.
     * Pass `type: "tank"` to get only tanks from the equipment register.
     */
    list(params?: { areaId?: string; type?: string }): Promise<Equipment[]> {
      const qs = new URLSearchParams();
      if (params?.areaId) qs.set("area_id", params.areaId);
      if (params?.type) qs.set("type", params.type);
      const query = qs.toString() ? `?${qs}` : "";
      return req<Equipment[]>(`/equipment${query}`);
    },

    get(id: string): Promise<Equipment> {
      return req<Equipment>(`/equipment/${id}`);
    },
  };
}
