import type { components } from "@eng-suite/types";
import type { RequestFn } from "../client";

type Equipment = components["schemas"]["EquipmentResponse"];
type EquipmentUpdate = components["schemas"]["EquipmentUpdate"];

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

    async update(id: string, data: EquipmentUpdate): Promise<Equipment> {
      try {
        return await req<Equipment>(`/equipment/${id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message.toLowerCase() : "";
        const isMethodNotAllowed =
          message.includes("method not allowed") || message.includes("http 405");
        if (!isMethodNotAllowed) {
          throw err;
        }

        return req<Equipment>(`/equipment/${id}/update`, {
          method: "POST",
          body: JSON.stringify(data),
        });
      }
    },
  };
}
