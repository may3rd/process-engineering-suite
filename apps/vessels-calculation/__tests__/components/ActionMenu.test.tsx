import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormProvider, useForm } from 'react-hook-form'

const pdfMock = vi.fn(() => ({
  toBlob: vi.fn(async () => new Blob(['pdf'], { type: 'application/pdf' })),
}))

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

vi.mock('@/lib/apiClient', () => ({
  apiClient: {
    engineeringObjects: {
      list: vi.fn(async () => []),
      get: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

vi.mock('@/app/calculator/components/SaveCalculationButton', () => ({
  SaveCalculationButton: () => null,
}))

vi.mock('@/app/calculator/components/LoadCalculationButton', () => ({
  LoadCalculationButton: () => null,
}))

vi.mock('@/app/calculator/components/EquipmentLinkButton', () => ({
  EquipmentLinkButton: () => null,
}))

vi.mock('@react-pdf/renderer', () => ({
  pdf: pdfMock,
  StyleSheet: { create: (styles: unknown) => styles },
  Document: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Page: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  View: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Text: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Svg: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Path: () => null,
  Rect: () => null,
  Line: () => null,
  Circle: () => null,
  Polygon: () => null,
  G: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Defs: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  ClipPath: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}))

import { ActionMenu } from '@/app/calculator/components/ActionMenu'
import { EquipmentMode, HeadType, VesselOrientation, type CalculationInput, type CalculationResult } from '@/types'

const MOCK_RESULT: CalculationResult = {
  volumes: {
    headVolume: 0.131,
    shellVolume: 1.571,
    bootVolume: 0,
    totalVolume: 1.833,
    tangentVolume: 1.571,
    effectiveVolume: 1.833,
    workingVolume: 0.5,
    overflowVolume: 0,
    partialVolume: 0.9,
  },
  surfaceAreas: {
    headSurfaceArea: 1.571,
    shellSurfaceArea: 6.283,
    bootSurfaceArea: 0,
    totalSurfaceArea: 7.854,
    wettedSurfaceArea: 3.8,
    bootWettedArea: 0,
  },
  masses: {
    massEmpty: null,
    massLiquid: 765,
    massFull: 1558,
  },
  timing: {
    surgeTime: 0.05,
    inventory: 0.05,
  },
  vortexSubmergence: null,
  headDepthUsed: 250,
  calculatedAt: '2026-03-12T00:00:00.000Z',
}

function renderActionMenu() {
  function Wrapper() {
    const form = useForm<CalculationInput>({
      defaultValues: {
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
    })

    return (
      <FormProvider {...form}>
        <ActionMenu
          onClear={vi.fn()}
          calculationMetadata={{
            projectNumber: 'P-1',
            documentNumber: 'D-1',
            title: 'Report',
            projectName: 'Project',
            client: 'Client',
          }}
          revisionHistory={[]}
          onCalculationLoaded={vi.fn()}
          calculationResult={MOCK_RESULT}
          linkedEquipmentId={null}
          linkedEquipmentTag={null}
          onEquipmentLinked={vi.fn()}
        />
      </FormProvider>
    )
  }

  return render(<Wrapper />)
}

describe('ActionMenu export', () => {
  beforeEach(() => {
    pdfMock.mockClear()

    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    }

    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
    })

    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:mock'),
      configurable: true,
    })

    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      configurable: true,
    })
  })

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('downloads the generated PDF blob', async () => {
    const user = userEvent.setup()
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    renderActionMenu()

    await user.click(screen.getByRole('button', { name: /actions/i }))
    await user.click(screen.getByText(/Export PDF/i))

    await waitFor(() => expect(pdfMock).toHaveBeenCalledTimes(1))
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })
})
