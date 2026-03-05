import type {
  VesselCalculationRecord,
  VesselCalculationSavePayload,
} from '../types/persistence';

const STORAGE_KEY = 'pes:vessel:calculations:v1';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readRecords(): VesselCalculationRecord[] {
  if (!isBrowser()) {
    return [];
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((row): row is VesselCalculationRecord => typeof row === 'object' && row !== null);
  } catch {
    return [];
  }
}

function writeRecords(records: VesselCalculationRecord[]): void {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `vessel-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

export function listVesselCalculations(includeDeleted = false): VesselCalculationRecord[] {
  const items = readRecords();
  const filtered = includeDeleted ? items : items.filter((item) => item.isActive !== false);
  return filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getVesselCalculation(id: string): VesselCalculationRecord | undefined {
  return readRecords().find((item) => item.id === id);
}

export interface SaveVesselCalculationOptions {
  overwriteId?: string;
  overwriteByName?: boolean;
}

export function saveVesselCalculation(
  payload: VesselCalculationSavePayload,
  options: SaveVesselCalculationOptions = {},
): VesselCalculationRecord {
  const name = payload.name.trim();
  if (!name) {
    throw new Error('Calculation name is required');
  }

  const now = new Date().toISOString();
  const items = readRecords();

  let targetIndex = -1;
  if (options.overwriteId) {
    targetIndex = items.findIndex((item) => item.id === options.overwriteId);
  } else if (options.overwriteByName) {
    const normalized = normalizeName(name);
    targetIndex = items.findIndex((item) => normalizeName(item.name) === normalized && item.isActive !== false);
  }

  if (targetIndex >= 0) {
    const existing = items[targetIndex];
    const updated: VesselCalculationRecord = {
      ...existing,
      name,
      description: payload.description,
      equipmentId: payload.equipmentId ?? null,
      equipmentTag: payload.equipmentTag ?? null,
      metadata: payload.metadata,
      revisionHistory: payload.revisionHistory ?? [],
      inputs: payload.inputs,
      results: payload.results,
      updatedAt: now,
      isActive: true,
    };
    items[targetIndex] = updated;
    writeRecords(items);
    return updated;
  }

  const created: VesselCalculationRecord = {
    id: makeId(),
    name,
    description: payload.description,
    equipmentId: payload.equipmentId ?? null,
    equipmentTag: payload.equipmentTag ?? null,
    metadata: payload.metadata,
    revisionHistory: payload.revisionHistory ?? [],
    inputs: payload.inputs,
    results: payload.results,
    createdAt: now,
    updatedAt: now,
    isActive: true,
  };

  writeRecords([created, ...items]);
  return created;
}

export function deleteVesselCalculation(id: string): void {
  const items = readRecords();
  const next = items.map((item) => {
    if (item.id !== id) {
      return item;
    }
    return {
      ...item,
      isActive: false,
      updatedAt: new Date().toISOString(),
    };
  });
  writeRecords(next);
}

export function restoreVesselCalculation(id: string): void {
  const items = readRecords();
  const next = items.map((item) => {
    if (item.id !== id) {
      return item;
    }
    return {
      ...item,
      isActive: true,
      updatedAt: new Date().toISOString(),
    };
  });
  writeRecords(next);
}
