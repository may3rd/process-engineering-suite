import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormProvider, useForm } from 'react-hook-form'
import { ActionMenu } from '@/app/calculator/components/ActionMenu'
import { TankConfiguration, type CalculationInput, type CalculationResult, type DerivedGeometry } from '@/types'

const pdfMock = vi.fn(() => ({
  toBlob: vi.fn(async () => new Blob(['pdf'], { type: 'application/pdf' })),
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

vi.mock('@/app/calculator/components/LinkTankButton', () => ({
  LinkTankButton: () => null,
}))

vi.mock('@/app/calculator/components/LoadCalculationButton', () => ({
  LoadCalculationButton: () => null,
}))

vi.mock('@/app/calculator/components/SaveCalculationButton', () => ({
  SaveCalculationButton: () => null,
}))

vi.mock('@react-pdf/renderer', () => ({
  pdf: pdfMock,
  StyleSheet: { create: (styles: unknown) => styles },
  Document: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Page: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  View: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Text: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}))

const MOCK_RESULT: CalculationResult = {
  derived: {
    maxTankVolume: 7916.8,
    shellSurfaceArea: 1319.5,
    coneRoofArea: 0,
    totalSurfaceArea: 1319.5,
    wettedArea: 689.4,
    reductionFactor: 1,
  },
  normalVenting: {
    outbreathing: {
      processFlowrate: 0,
      yFactor: 0.32,
      reductionFactor: 1,
      thermalOutbreathing: 1032.4,
      total: 1032.4,
    },
    inbreathing: {
      processFlowrate: 368.9,
      cFactor: 6.5,
      reductionFactor: 1,
      thermalInbreathing: 1482.6,
      total: 1851.5,
    },
  },
  emergencyVenting: {
    heatInput: 5741539,
    environmentalFactor: 1,
    emergencyVentRequired: 28452,
    coefficients: { a: 1, n: 1 },
    referenceFluid: 'Hexane',
  },
  drainInbreathing: undefined,
  summary: {
    designOutbreathing: 1032.4,
    designInbreathing: 1851.5,
    emergencyVenting: 28452,
  },
  warnings: {},
  apiEdition: '7TH',
  calculatedAt: '2026-03-13T00:00:00.000Z',
}

const DERIVED_GEOMETRY: DerivedGeometry = {
  maxTankVolume: 7916.8,
  shellSurfaceArea: 1319.5,
  coneRoofArea: 0,
  totalSurfaceArea: 1319.5,
  wettedArea: 689.4,
  reductionFactor: 1,
}

function renderActionMenu() {
  function Wrapper() {
    const form = useForm<CalculationInput>({
      defaultValues: {
        tankNumber: 'T-3110',
        description: 'Industrial Water Tank',
        diameter: 24000,
        height: 17500,
        latitude: 12.7,
        designPressure: 101.3,
        tankConfiguration: TankConfiguration.BARE_METAL,
        avgStorageTemp: 35,
        flashBoilingPointType: 'FP',
        incomingStreams: [],
        outgoingStreams: [],
        apiEdition: '7TH',
      },
    })

    return (
      <FormProvider {...form}>
        <ActionMenu
          onTankLinked={vi.fn()}
          linkedTag={null}
          linkedEquipmentId={null}
          clearToken={0}
          onClear={vi.fn()}
          calculationMetadata={{
            projectNumber: '244X0',
            documentNumber: '2440X-CAL-PR-0002',
            title: 'Venting Calculation',
            projectName: 'Project',
            client: 'PTT',
          }}
          revisionHistory={[]}
          onCalculationLoaded={vi.fn()}
          calculationResult={MOCK_RESULT}
          derivedGeometry={DERIVED_GEOMETRY}
        />
      </FormProvider>
    )
  }

  return render(<Wrapper />)
}

describe('ActionMenu export', () => {
  beforeEach(() => {
    pdfMock.mockClear()

    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:mock'),
      configurable: true,
    })

    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      configurable: true,
    })
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
