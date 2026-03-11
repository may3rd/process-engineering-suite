/**
 * Save/load round-trip tests.
 * Exercises the localStorage serialization logic directly (no React needed).
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { VesselOrientation, HeadType } from '../src/types'
import type { CalculationInput, CalculationMetadata, RevisionRecord } from '../src/types'

// ─── Inline the storage helpers from SaveCalculationButton / LoadCalculationButton
// (mirrors the component logic so we test the same code path without a browser)

const STORAGE_KEY = 'vessel-calculations'

interface SavedCalculation {
  id: string
  name: string
  inputs: CalculationInput
  metadata: CalculationMetadata
  revisions: RevisionRecord[]
  savedAt: string
}

function loadAll(): SavedCalculation[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch { return [] }
}

function saveAll(items: SavedCalculation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function save(entry: SavedCalculation, forceOverwrite = false): 'saved' | 'duplicate' {
  const items = loadAll()
  const existing = items.find(
    (i) => i.name.trim().toLowerCase() === entry.name.trim().toLowerCase(),
  )
  if (existing && !forceOverwrite) return 'duplicate'
  const updated = existing
    ? items.map((i) => (i.id === existing.id ? { ...entry, id: existing.id } : i))
    : [...items, entry]
  saveAll(updated)
  return 'saved'
}

function normalizeInput(raw: Record<string, unknown>): Partial<CalculationInput> {
  const toNum = (v: unknown) => {
    const n = Number(v)
    return isNaN(n) ? undefined : n
  }
  return {
    tag: (raw.tag as string) ?? '',
    description: (raw.description as string) ?? '',
    orientation: Object.values(VesselOrientation).includes(raw.orientation as VesselOrientation)
      ? (raw.orientation as VesselOrientation)
      : VesselOrientation.VERTICAL,
    headType: Object.values(HeadType).includes(raw.headType as HeadType)
      ? (raw.headType as HeadType)
      : HeadType.ELLIPSOIDAL_2_1,
    insideDiameter: toNum(raw.insideDiameter),
    shellLength: toNum(raw.shellLength),
    wallThickness: toNum(raw.wallThickness),
    headDepth: toNum(raw.headDepth),
    liquidLevel: toNum(raw.liquidLevel),
    hll: toNum(raw.hll),
    lll: toNum(raw.lll),
    ofl: toNum(raw.ofl),
    density: toNum(raw.density),
    flowrate: toNum(raw.flowrate),
    metadata: (raw.metadata as CalculationMetadata) ?? {},
  }
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const METADATA: CalculationMetadata = {
  projectNumber: 'P-001',
  documentNumber: 'DOC-42',
  title: 'Test Vessel',
  projectName: 'Unit Test Project',
  client: 'Acme Corp',
}

const REVISIONS: RevisionRecord[] = [
  {
    rev: '0',
    by: 'Engineer A',
    checkedBy: 'Engineer B',
    approvedBy: 'Manager C',
    byDate: '2025-01-01',
  },
]

const INPUTS: CalculationInput = {
  tag: 'V-201',
  description: 'Test vessel',
  orientation: VesselOrientation.HORIZONTAL,
  headType: HeadType.HEMISPHERICAL,
  insideDiameter: 1500,
  shellLength: 3000,
  wallThickness: 12,
  liquidLevel: 750,
  hll: 1400,
  lll: 200,
  ofl: 1450,
  density: 900,
  flowrate: 20,
  metadata: METADATA,
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear()
})

describe('save and load round-trip', () => {
  it('saves and loads a calculation by name', () => {
    const entry: SavedCalculation = {
      id: crypto.randomUUID(),
      name: 'V-201 Base Case',
      inputs: INPUTS,
      metadata: METADATA,
      revisions: REVISIONS,
      savedAt: new Date().toISOString(),
    }
    save(entry)

    const loaded = loadAll()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].name).toBe('V-201 Base Case')
    expect(loaded[0].inputs.tag).toBe('V-201')
    expect(loaded[0].inputs.orientation).toBe(VesselOrientation.HORIZONTAL)
    expect(loaded[0].inputs.headType).toBe(HeadType.HEMISPHERICAL)
  })

  it('all numeric fields round-trip through JSON without precision loss', () => {
    const entry: SavedCalculation = {
      id: crypto.randomUUID(),
      name: 'numeric round-trip',
      inputs: INPUTS,
      metadata: METADATA,
      revisions: [],
      savedAt: new Date().toISOString(),
    }
    save(entry)

    const loaded = loadAll()[0]
    expect(loaded.inputs.insideDiameter).toBe(INPUTS.insideDiameter)
    expect(loaded.inputs.shellLength).toBe(INPUTS.shellLength)
    expect(loaded.inputs.wallThickness).toBe(INPUTS.wallThickness)
    expect(loaded.inputs.liquidLevel).toBe(INPUTS.liquidLevel)
    expect(loaded.inputs.density).toBe(INPUTS.density)
    expect(loaded.inputs.flowrate).toBe(INPUTS.flowrate)
  })

  it('metadata round-trips fully', () => {
    const entry: SavedCalculation = {
      id: crypto.randomUUID(),
      name: 'meta test',
      inputs: INPUTS,
      metadata: METADATA,
      revisions: REVISIONS,
      savedAt: new Date().toISOString(),
    }
    save(entry)

    const loaded = loadAll()[0]
    expect(loaded.metadata).toEqual(METADATA)
    expect(loaded.revisions).toEqual(REVISIONS)
  })

  it('multiple saves are stored independently', () => {
    for (let i = 0; i < 3; i++) {
      save({
        id: crypto.randomUUID(),
        name: `Case ${i}`,
        inputs: { ...INPUTS, tag: `V-${i}` },
        metadata: METADATA,
        revisions: [],
        savedAt: new Date().toISOString(),
      })
    }
    expect(loadAll()).toHaveLength(3)
  })
})

describe('duplicate detection and overwrite', () => {
  it('returns "duplicate" when name already exists', () => {
    const entry: SavedCalculation = {
      id: crypto.randomUUID(),
      name: 'My Calc',
      inputs: INPUTS,
      metadata: METADATA,
      revisions: [],
      savedAt: new Date().toISOString(),
    }
    save(entry)
    const result = save({ ...entry, id: crypto.randomUUID() })
    expect(result).toBe('duplicate')
    expect(loadAll()).toHaveLength(1)
  })

  it('overwrites existing entry when forceOverwrite = true', () => {
    const id = crypto.randomUUID()
    save({ id, name: 'My Calc', inputs: INPUTS, metadata: METADATA, revisions: [], savedAt: '' })

    const updated = { ...INPUTS, insideDiameter: 2000 }
    save({
      id: crypto.randomUUID(),
      name: 'My Calc',
      inputs: updated,
      metadata: METADATA,
      revisions: [],
      savedAt: new Date().toISOString(),
    }, true)

    const items = loadAll()
    expect(items).toHaveLength(1)
    expect(items[0].inputs.insideDiameter).toBe(2000)
    expect(items[0].id).toBe(id)  // id preserved from original
  })

  it('name match is case-insensitive', () => {
    save({ id: crypto.randomUUID(), name: 'my calc', inputs: INPUTS, metadata: METADATA, revisions: [], savedAt: '' })
    const result = save({ id: crypto.randomUUID(), name: 'MY CALC', inputs: INPUTS, metadata: METADATA, revisions: [], savedAt: '' })
    expect(result).toBe('duplicate')
  })
})

describe('normalizeInput', () => {
  it('handles string numbers', () => {
    const norm = normalizeInput({ insideDiameter: '1500', shellLength: '3000' } as any)
    expect(norm.insideDiameter).toBe(1500)
    expect(norm.shellLength).toBe(3000)
  })

  it('converts non-numeric strings to undefined', () => {
    // 'N/A' → NaN → undefined. Note: '' → 0 (Number('') = 0), which is a valid number.
    const norm = normalizeInput({ density: 'N/A', flowrate: 'n/a' } as any)
    expect(norm.density).toBeUndefined()
    expect(norm.flowrate).toBeUndefined()
  })

  it('falls back to default enum values for unknown orientation / headType', () => {
    const norm = normalizeInput({ orientation: 'UNKNOWN', headType: 'BOGUS' } as any)
    expect(norm.orientation).toBe(VesselOrientation.VERTICAL)
    expect(norm.headType).toBe(HeadType.ELLIPSOIDAL_2_1)
  })

  it('preserves valid enum values', () => {
    const norm = normalizeInput({
      orientation: VesselOrientation.HORIZONTAL,
      headType: HeadType.CONICAL,
    } as any)
    expect(norm.orientation).toBe(VesselOrientation.HORIZONTAL)
    expect(norm.headType).toBe(HeadType.CONICAL)
  })
})
