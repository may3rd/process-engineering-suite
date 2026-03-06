import type { components } from "@eng-suite/types";
import type { RequestFn } from "../client";

type Equipment = components["schemas"]["EquipmentResponse"];
type EquipmentUpdate = components["schemas"]["EquipmentUpdate"];

/**
 * Compatibility wrapper around legacy `/equipment` endpoints.
 *
 * @deprecated Prefer `apiClient.engineeringObjects` for new development.
 */
export function createEquipmentModule(req: RequestFn) {
  return {
    /**
     * List equipment through the legacy compatibility endpoint.
     *
     * @deprecated Prefer `engineeringObjects.list()` for new development.
     */
    list(params?: { areaId?: string; type?: string }): Promise<Equipment[]> {
      const qs = new URLSearchParams();
      if (params?.areaId) qs.set("area_id", params.areaId);
      if (params?.type) qs.set("type", params.type);
      const query = qs.toString() ? `?${qs}` : "";
      return req<Equipment[]>(`/equipment${query}`);
    },

    /**
     * Get one equipment item through the legacy compatibility endpoint.
     *
     * @deprecated Prefer `engineeringObjects.get()` or `/engineering-objects/by-id/{id}`.
     */
    get(id: string): Promise<Equipment> {
      return req<Equipment>(`/equipment/${id}`);
    },

    /**
     * Update equipment through the legacy compatibility endpoint.
     *
     * @deprecated Prefer `engineeringObjects.upsert()` or the by-id engineering object route.
     */
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

    /**
     * Legacy endpoint does not expose a distinct create-by-id path here.
     *
     * @deprecated Prefer `engineeringObjects.upsert(tag, payload)`.
     */
  };
}
