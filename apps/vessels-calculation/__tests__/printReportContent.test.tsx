import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/store/uomStore', () => ({
  useUomStore: () => ({
    units: {
      length: 'mm',
      density: 'kg/m3',
      volumeFlow: 'm3/h',
      volume: 'm3',
      area: 'm2',
      mass: 'kg',
    },
  }),
}))

vi.mock('@eng-suite/physics', () => ({
  convertUnit: (value: number) => value,
}))

import { PrintReportContent } from '@/app/calculator/print/PrintReportContent'
import type { VesselPrintReportPayload } from '@/lib/printReport'
import { EquipmentMode, HeadType, VesselOrientation } from '@/types'

const PAYLOAD: VesselPrintReportPayload = {
  input: {
    tag: 'V-101',
    description: 'Vertical drum',
    equipmentMode: EquipmentMode.VESSEL,
    orientation: VesselOrientation.VERTICAL,
    headType: HeadType.ELLIPSOIDAL_2_1,
    insideDiameter: 1500,
    shellLength: 3000,
    wallThickness: 12,
    bottomHeight: 2000,
    density: 900,
    flowrate: 25,
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
      headVolume: 1.1,
      shellVolume: 2.2,
      bootVolume: 0,
      totalVolume: 3.3,
      tangentVolume: 2.2,
      effectiveVolume: 3.1,
      workingVolume: 1.2,
      overflowVolume: 0.1,
      partialVolume: 2.4,
    },
    surfaceAreas: {
      headSurfaceArea: 4.1,
      shellSurfaceArea: 5.2,
      bootSurfaceArea: 0,
      totalSurfaceArea: 9.3,
      wettedSurfaceArea: 6.4,
      bootWettedArea: 0,
    },
    masses: {
      massEmpty: 100,
      massLiquid: 200,
      massFull: 300,
    },
    timing: {
      surgeTime: 0.5,
      inventory: 0.8,
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

describe('PrintReportContent', () => {
  it('shows input cards and multi-column result summaries for print', () => {
    render(<PrintReportContent payload={PAYLOAD} />)

    expect(screen.getByTestId('print-report-sheet').className).toContain('max-w-[794px]')
    expect(screen.getByTestId('print-report-sheet').className).toContain('print:py-2')
    expect(screen.getByTestId('print-report-stack').className).toContain('print:space-y-3')
    expect(screen.getByTestId('print-top-grid').className).toContain('print:grid-cols-[1.15fr_0.85fr]')
    expect(screen.getByTestId('print-schematic-section').className).toContain('print:scale-[0.8]')
    expect(screen.getByText('Inputs')).toBeTruthy()
    expect(screen.getByText('Inside Diameter')).toBeTruthy()
    expect(screen.getByText('Shell Length')).toBeTruthy()
    expect(screen.getByText('Volume Results')).toBeTruthy()
    expect(screen.getByText('Wetted Area Results')).toBeTruthy()
    expect(screen.queryByText(/View larger/i)).toBeNull()
    expect(screen.getByTestId('print-input-grid').className).toContain('lg:grid-cols-2')
    expect(screen.getByTestId('print-volume-grid').className).toContain('xl:grid-cols-2')
    expect(screen.getByTestId('print-wetted-area-grid').className).toContain('xl:grid-cols-2')
  })
})
