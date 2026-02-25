import type { RequestFn } from "../client";

// Use simple inline types for hierarchy (OpenAPI schemas are complex unions)
export interface HierarchyItem {
  id: string;
  name: string;
  code?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function createHierarchyModule(req: RequestFn) {
  return {
    getCustomers(): Promise<HierarchyItem[]> {
      return req<HierarchyItem[]>("/hierarchy/customers");
    },

    getPlants(customerId: string): Promise<HierarchyItem[]> {
      return req<HierarchyItem[]>(`/hierarchy/plants?customerId=${customerId}`);
    },

    getUnits(plantId: string): Promise<HierarchyItem[]> {
      return req<HierarchyItem[]>(`/hierarchy/units?plantId=${plantId}`);
    },

    getAreas(unitId: string): Promise<HierarchyItem[]> {
      return req<HierarchyItem[]>(`/hierarchy/areas?unitId=${unitId}`);
    },

    getProjects(areaId: string): Promise<HierarchyItem[]> {
      return req<HierarchyItem[]>(`/hierarchy/projects?areaId=${areaId}`);
    },
  };
}
