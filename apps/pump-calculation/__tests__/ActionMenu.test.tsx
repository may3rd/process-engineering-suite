import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormProvider, useForm } from 'react-hook-form'
import { ActionMenu } from '@/app/calculator/components/ActionMenu'
import { EquipmentType, PumpType, type CalculationInput, type PumpCalculationResult } from '@/types'

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
}))

const MOCK_RESULT: PumpCalculationResult = {
  suctionPressureKpa: 120,
  dischargePressureKpa: 320,
  differentialPressureKpa: 200,
  differentialHead: 22.4,
  staticHead: 8,
  frictionHead: 14.4,
  npsha: 4.2,
  hydraulicPowerKw: 2.9,
  shaftPowerKw: 4.1,
  apiMinMotorKw: 4.5,
  recommendedMotorKw: 5.5,
}

function renderActionMenu() {
  function Wrapper() {
    const form = useForm<CalculationInput>({
      defaultValues: {
        tag: 'P-101',
        description: 'Feed pump',
        metadata: {
          projectNumber: '',
          documentNumber: '',
          title: '',
          projectName: '',
          client: '',
        },
        fluidName: 'Water',
        flowDesign: 50,
        temperature: 25,
        sg: 1,
        vapourPressure: 3.2,
        viscosity: 1,
        suctionSourcePressure: 101.325,
        suctionElevation: 1,
        suctionLineLoss: 2,
        suctionStrainerLoss: 1,
        suctionOtherLoss: 0,
        dischargeDestPressure: 101.325,
        dischargeElevation: 15,
        dischargeEquipmentDp: 20,
        dischargeLineLoss: 10,
        dischargeFlowElementDp: 0,
        dischargeDesignMargin: 5,
        pumpType: PumpType.CENTRIFUGAL,
        wearMarginPct: 5,
        efficiency: 75,
        calculateAccelHead: false,
        showOrifice: false,
        showControlValve: false,
        showMinFlow: false,
        showShutoff: false,
        isExistingSystem: false,
        suctionSourceType: EquipmentType.VESSEL,
        dischargeDestType: EquipmentType.VESSEL,
      },
    })

    return (
      <FormProvider {...form}>
        <ActionMenu
          onClear={vi.fn()}
          calculationMetadata={{
            projectNumber: 'P-1',
            documentNumber: 'CAL-P-001',
            title: 'Pump Calculation',
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
