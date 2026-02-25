import type { components } from "@eng-suite/types";
import type { RequestFn } from "../client";

type NetworkDesign = components["schemas"]["NetworkDesignResponse"];
type NetworkDesignCreate = components["schemas"]["NetworkDesignCreate"];
type NetworkDesignUpdate = components["schemas"]["NetworkDesignUpdate"];

export function createNetworkModule(req: RequestFn) {
  return {
    list(params?: { areaId?: string }): Promise<NetworkDesign[]> {
      const qs = new URLSearchParams();
      if (params?.areaId) qs.set("areaId", params.areaId);
      const query = qs.toString() ? `?${qs}` : "";
      return req<NetworkDesign[]>(`/network-designs${query}`);
    },

    get(id: string): Promise<NetworkDesign> {
      return req<NetworkDesign>(`/network-designs/${id}`);
    },

    create(data: NetworkDesignCreate): Promise<NetworkDesign> {
      return req<NetworkDesign>("/network-designs", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    update(id: string, data: NetworkDesignUpdate): Promise<NetworkDesign> {
      return req<NetworkDesign>(`/network-designs/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    delete(id: string): Promise<void> {
      return req<void>(`/network-designs/${id}`, { method: "DELETE" });
    },
  };
}
