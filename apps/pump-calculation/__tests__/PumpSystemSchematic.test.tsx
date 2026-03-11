import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormProvider, useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { PumpSystemSchematic } from '@/app/calculator/components/PumpSystemSchematic'
import { EquipmentType, PumpType } from '@/types'
import type { CalculationInput, PumpCalculationResult } from '@/types'

const baseInput: CalculationInput = {
  tag: 'P-101A',
  description: 'Charge pump',
  metadata: {
    projectNumber: 'PRJ-001',
    documentNumber: 'DOC-001',
    title: 'Pump sizing',
    projectName: 'Demo',
    client: 'GCME',
  },
  fluidName: 'Water',
  flowDesign: 120,
  temperature: 30,
  sg: 1,
  vapourPressure: 4,
  viscosity: 1,
  suctionSourcePressure: 180,
  suctionElevation: 4,
  suctionLineLoss: 8,
  suctionStrainerLoss: 3,
  suctionOtherLoss: 1,
  dischargeDestPressure: 520,
  dischargeElevation: 18,
  dischargeEquipmentDp: 60,
  dischargeLineLoss: 24,
  dischargeFlowElementDp: 12,
  dischargeControlValveDp: 30,
  dischargeDesignMargin: 20,
  isExistingSystem: false,
  pumpType: PumpType.CENTRIFUGAL,
  wearMarginPct: 5,
  efficiency: 75,
  calculateAccelHead: false,
  showOrifice: false,
  showControlValve: true,
  showMinFlow: false,
  showShutoff: false,
  suctionSourceType: EquipmentType.VESSEL,
  dischargeDestType: EquipmentType.HEADER,
}

const baseResult: PumpCalculationResult = {
  suctionPressureKpa: 207.2,
  dischargePressureKpa: 692.6,
  differentialPressureKpa: 485.4,
  differentialHead: 49.5,
  staticHead: 14,
  frictionHead: 35.5,
  npsha: 20.7,
  hydraulicPowerKw: 16.2,
  shaftPowerKw: 22.7,
  apiMinMotorKw: 30,
  recommendedMotorKw: 30,
  recommendedCvDeltaPKpa: 30,
}

function renderSchematic(
  values: CalculationInput = baseInput,
  result: PumpCalculationResult | null = baseResult,
) {
  function Wrapper() {
    const form = useForm<CalculationInput>({ defaultValues: values })
    return (
      <FormProvider {...form}>
        <PumpSystemSchematic result={result} />
      </FormProvider>
    )
  }

  return render(<Wrapper />)
}

describe('PumpSystemSchematic', () => {
  it('renders grouped operating summary labels for the live schematic', () => {
    renderSchematic()

    expect(screen.getByText('System Schematic')).toBeInTheDocument()
    expect(screen.getByText('SUCTION DATA')).toBeInTheDocument()
    expect(screen.getByText('OPERATING DATA')).toBeInTheDocument()
    expect(screen.getByText('DISCHARGE DATA')).toBeInTheDocument()
    expect(screen.getByText('NOT TO SCALE')).toBeInTheDocument()
  })

  it('keeps rendering when elevation inputs are NaN during empty form edits', () => {
    renderSchematic({
      ...baseInput,
      suctionElevation: Number.NaN,
      dischargeElevation: Number.NaN,
    })

    expect(screen.getByText('OPERATING DATA')).toBeInTheDocument()
    expect(screen.getByText('SUCTION DATA')).toBeInTheDocument()
    expect(screen.getByText('DISCHARGE DATA')).toBeInTheDocument()
  })

  it('renders a visible straight discharge run when destination elevation is flat', () => {
    const { container } = renderSchematic({
      ...baseInput,
      dischargeDestType: EquipmentType.VESSEL,
      dischargeElevation: 0,
    })

    const dischargePolyline = container.querySelector('[data-testid="discharge-line"]')

    expect(dischargePolyline).toHaveAttribute('points', '438,220 556.5,220 556.5,150 675,150')
    expect(dischargePolyline).toHaveAttribute('stroke', 'currentColor')
    expect(dischargePolyline).toHaveAttribute('stroke-opacity', '0.92')
  })

  it('routes source and destination manifolds above the pump with stepped line runs', () => {
    const { container } = renderSchematic({
      ...baseInput,
      suctionSourceType: EquipmentType.HEADER,
      dischargeDestType: EquipmentType.HEADER,
      suctionElevation: 0,
      dischargeElevation: 0,
    })

    const suctionPolyline = container.querySelector('[data-testid="suction-line"]')
    const dischargePolyline = container.querySelector('[data-testid="discharge-line"]')

    expect(suctionPolyline).toHaveAttribute('points', '90,150 112,150 112,220 362,220')
    expect(dischargePolyline).toHaveAttribute('points', '438,220 688,220 688,150 710,150')
  })

  it('opens a popup dialog for a larger schematic view', async () => {
    const user = userEvent.setup()

    renderSchematic()

    await user.click(screen.getByRole('button', { name: 'Open larger schematic' }))

    expect(screen.getByText('Expanded System Schematic')).toBeInTheDocument()
    expect(screen.getAllByText('OPERATING DATA')).toHaveLength(2)
  })

  it('renders the centrifugal pump with a single-ring wedge symbol', () => {
    const { container } = renderSchematic()

    const pumpGroup = container.querySelector('[data-testid="pump-symbol"]')
    const circles = pumpGroup?.querySelectorAll('circle')
    const polygon = pumpGroup?.querySelector('polygon')

    expect(circles).toHaveLength(1)
    expect(polygon).toBeInTheDocument()
  })

  it('keeps the source vessel at a fixed schematic level even for large elevations', () => {
    const lowElevation = renderSchematic({
      ...baseInput,
      suctionSourceType: EquipmentType.VESSEL,
      suctionElevation: 4,
    })
    const lowPoints = lowElevation.container.querySelector('[data-testid="suction-line"]')?.getAttribute('points')
    lowElevation.unmount()

    const highElevation = renderSchematic({
      ...baseInput,
      suctionSourceType: EquipmentType.VESSEL,
      suctionElevation: 100,
    })
    const highPoints = highElevation.container.querySelector('[data-testid="suction-line"]')?.getAttribute('points')

    expect(highPoints).toBe(lowPoints)
  })

  it('positions the report table in the lower schematic band', () => {
    const { container } = renderSchematic()

    const suctionCard = container.querySelector('[data-testid="data-table-suction"] rect')
    const operatingCard = container.querySelector('[data-testid="data-table-operating"] rect')
    const dischargeCard = container.querySelector('[data-testid="data-table-discharge"] rect')

    expect(suctionCard).toHaveAttribute('y', '292')
    expect(operatingCard).toHaveAttribute('y', '292')
    expect(dischargeCard).toHaveAttribute('y', '292')
  })
})
