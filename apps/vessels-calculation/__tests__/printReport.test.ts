import { describe, expect, it } from 'vitest'

import {
  buildPrintReportHref,
  createPrintReportStorageKey,
  readPrintReportPayload,
  writePrintReportPayload,
  type VesselPrintReportPayload,
} from '@/lib/printReport'
import { EquipmentMode, HeadType, VesselOrientation } from '@/types'

function makePayload(): VesselPrintReportPayload {
  return {
    input: {
      tag: 'V-101',
      equipmentMode: EquipmentMode.VESSEL,
      orientation: VesselOrientation.VERTICAL,
      headType: HeadType.ELLIPSOIDAL_2_1,
      insideDiameter: 1500,
      shellLength: 3000,
      metadata: {
        projectNumber: '',
        documentNumber: '',
        title: '',
        projectName: '',
        client: '',
      },
    },
    result: {
      volumes: {
        headVolume: 0,
        shellVolume: 0,
        bootVolume: 0,
        totalVolume: 0,
        tangentVolume: 0,
        effectiveVolume: 0,
        workingVolume: 0,
        overflowVolume: 0,
        partialVolume: null,
      },
      surfaceAreas: {
        headSurfaceArea: 0,
        shellSurfaceArea: 0,
        bootSurfaceArea: 0,
        totalSurfaceArea: 0,
        wettedSurfaceArea: 0,
        bootWettedArea: 0,
      },
      masses: {
        massEmpty: null,
        massLiquid: null,
        massFull: null,
      },
      timing: {
        surgeTime: null,
        inventory: null,
      },
      headDepthUsed: 375,
      calculatedAt: '2026-03-12T00:00:00.000Z',
    },
    metadata: {
      projectNumber: 'P-1',
      documentNumber: 'D-1',
      title: 'Report',
      projectName: 'Project',
      client: 'Client',
    },
    revisions: [],
    units: {
      length: 'mm',
      density: 'kg/m3',
      volumeFlow: 'm3/h',
      volume: 'm3',
      area: 'm2',
      mass: 'kg',
    },
  }
}

describe('printReport helpers', () => {
  it('stores, reads, and links print payloads through local storage', () => {
    const storage = new Map<string, string>()
    const key = createPrintReportStorageKey()
    const payload = makePayload()

    writePrintReportPayload(
      {
        setItem: (storageKey, value) => storage.set(storageKey, value),
      },
      key,
      payload,
    )

    expect(buildPrintReportHref(key, '/vessels-calculation')).toBe(
      `/vessels-calculation/calculator/print?key=${encodeURIComponent(key)}`,
    )

    const readBack = readPrintReportPayload(
      {
        getItem: (storageKey) => storage.get(storageKey) ?? null,
      },
      key,
    )

    expect(readBack).toEqual(payload)
  })
})
