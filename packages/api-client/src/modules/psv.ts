import type { components } from "@eng-suite/types";
import type { RequestFn } from "../client";

type ProtectiveSystem = components["schemas"]["ProtectiveSystemResponse"];
type ProtectiveSystemCreate = components["schemas"]["ProtectiveSystemCreate"];
type ProtectiveSystemUpdate = components["schemas"]["ProtectiveSystemUpdate"];

export function createPsvModule(req: RequestFn) {
  return {
    list(params?: { areaId?: string; includeDeleted?: boolean }): Promise<ProtectiveSystem[]> {
      const qs = new URLSearchParams();
      if (params?.areaId) qs.set("areaId", params.areaId);
      if (params?.includeDeleted) qs.set("includeDeleted", "true");
      const query = qs.toString() ? `?${qs}` : "";
      return req<ProtectiveSystem[]>(`/psv${query}`);
    },

    get(id: string): Promise<ProtectiveSystem> {
      return req<ProtectiveSystem>(`/psv/${id}`);
    },

    create(data: ProtectiveSystemCreate): Promise<ProtectiveSystem> {
      return req<ProtectiveSystem>("/psv", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    update(id: string, data: ProtectiveSystemUpdate): Promise<ProtectiveSystem> {
      return req<ProtectiveSystem>(`/psv/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    delete(id: string): Promise<void> {
      return req<void>(`/psv/${id}`, { method: "DELETE" });
    },

    restore(id: string): Promise<ProtectiveSystem> {
      return req<ProtectiveSystem>(`/psv/${id}/restore`, { method: "POST" });
    },
  };
}
