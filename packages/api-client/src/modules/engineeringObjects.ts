import type { RequestFn } from '../client';

export interface EngineeringObject {
  id?: string | null;
  tag: string;
  object_type: string;
  properties: Record<string, unknown>;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface EngineeringObjectUpsertPayload {
  object_type: string;
  properties: Record<string, unknown>;
  status?: string | null;
}

export interface ListEngineeringObjectsParams {
  objectType?: string;
  includeInactive?: boolean;
  q?: string;
}

export function createEngineeringObjectsModule(req: RequestFn) {
  return {
    list(params?: ListEngineeringObjectsParams): Promise<EngineeringObject[]> {
      const qs = new URLSearchParams();
      if (params?.objectType) qs.set('object_type', params.objectType);
      if (params?.includeInactive) qs.set('include_inactive', 'true');
      if (params?.q) qs.set('q', params.q);
      const query = qs.toString() ? `?${qs.toString()}` : '';
      return req<EngineeringObject[]>(`/engineering-objects${query}`);
    },

    get(tag: string): Promise<EngineeringObject> {
      return req<EngineeringObject>(`/engineering-objects/${encodeURIComponent(tag)}`);
    },

    upsert(tag: string, payload: EngineeringObjectUpsertPayload): Promise<EngineeringObject> {
      return req<EngineeringObject>(`/engineering-objects/${encodeURIComponent(tag)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
  };
}
