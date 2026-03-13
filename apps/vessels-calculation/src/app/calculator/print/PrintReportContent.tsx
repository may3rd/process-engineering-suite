'use client'

import { FormProvider, useForm } from 'react-hook-form'
import { convertUnit } from '@eng-suite/physics'
import { SectionCard } from '../components/SectionCard'
import { TankSchematic } from '../components/TankSchematic'
import { VesselSchematic } from '../components/VesselSchematic'
import { BASE_UNITS, UOM_LABEL, type VesselUomCategory } from '@/lib/uom'
import type { VesselPrintReportPayload } from '@/lib/printReport'
import type { CalculationInput, CalculationResult } from '@/types'
import { EquipmentMode, TankRoofType, TankType } from '@/types'

interface PrintReportContentProps {
  payload: VesselPrintReportPayload
}

interface LabeledValue {
  label: string
  value: string
}

interface MetricItem {
  label: string
  value: string
  unit?: string
  emphasize?: boolean
}

export function PrintReportContent({ payload }: PrintReportContentProps) {
  const form = useForm<CalculationInput>({
    defaultValues: payload.input,
  })

  const equipmentMode = payload.input.equipmentMode ?? EquipmentMode.VESSEL
  const tankType = payload.input.tankType
  const volumeUnit = unitLabel(payload.units.volume)
  const areaUnit = unitLabel(payload.units.area)
  const massUnit = unitLabel(payload.units.mass)

  return (
    <FormProvider {...form}>
      <main
        data-testid="print-report-sheet"
        className="print-report-sheet mx-auto max-w-[794px] min-h-screen bg-white px-6 py-8 text-slate-900 sm:px-8 sm:py-10 print:min-h-0 print:max-w-none print:px-2 print:py-2"
      >
        <div
          data-testid="print-report-stack"
          className="mx-auto max-w-[794px] space-y-6 print:space-y-3"
        >
          <header className="border-b border-slate-200 pb-4 print:pb-2">
            <div className="flex items-start justify-between gap-6 print:gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight print:text-[1.05rem]">Vessel Calculator</h1>
                <p className="mt-1 text-sm text-slate-600 print:mt-0 print:text-[10px]">
                  Process Engineering Suite · Print Report
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 print:text-[9px]">Equipment Tag</p>
                <p className="mt-1 text-2xl font-semibold print:mt-0 print:text-base">{present(payload.input.tag)}</p>
              </div>
            </div>
          </header>

          <section
            data-testid="print-top-grid"
            className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-3 print:gap-1 print:p-2 print:text-[11px]"
          >
            <MetaItem label="Description" value={payload.input.description} />
            <MetaItem label="Project Number" value={payload.metadata.projectNumber} />
            <MetaItem label="Document Number" value={payload.metadata.documentNumber} />
            <MetaItem label="Title" value={payload.metadata.title} />
            <MetaItem label="Project Name" value={payload.metadata.projectName} />
            <MetaItem label="Client" value={payload.metadata.client} />
          </section>

          <section className="print:break-inside-avoid">
            <h2 className="mb-3 text-lg font-semibold tracking-tight print:mb-1.5 print:text-sm">Inputs</h2>
            <div
              data-testid="print-input-grid"
              className="grid gap-3 lg:grid-cols-2 print:grid-cols-2 print:gap-1.5"
            >
              <PrintDataCard
                title="Equipment"
                items={buildEquipmentItems(payload)}
              />
              <PrintDataCard
                title="Geometry"
                items={buildGeometryItems(payload)}
              />
              <PrintDataCard
                title="Levels"
                items={buildLevelItems(payload)}
              />
              <PrintDataCard
                title="Process"
                items={buildProcessItems(payload)}
              />
            </div>
          </section>

          <section className="print:break-inside-avoid">
            {equipmentMode === EquipmentMode.TANK ? (
              <div
                data-testid="print-schematic-section"
                className="print-report-schematic-wrap print:origin-top print:scale-[0.8]"
              >
                <TankSchematic showExpandAction={false} />
              </div>
            ) : (
              <div
                data-testid="print-schematic-section"
                className="print-report-schematic-wrap print:origin-top print:scale-[0.8]"
              >
                <VesselSchematic showExpandAction={false} />
              </div>
            )}
          </section>

          <section className="grid gap-3 xl:grid-cols-2 print:grid-cols-2 print:gap-1.5">
            <SectionCard title="Volume Results" className="print:break-inside-avoid">
              <div
                data-testid="print-volume-grid"
                className="grid gap-2 md:grid-cols-2 xl:grid-cols-2 print:grid-cols-2 print:gap-1"
              >
                {buildVolumeMetrics(payload.result, equipmentMode, tankType).map((item) => (
                  <MetricCard key={item.label} item={item} unit={volumeUnit} />
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Wetted Area Results" className="print:break-inside-avoid">
              <div
                data-testid="print-wetted-area-grid"
                className="grid gap-2 md:grid-cols-2 xl:grid-cols-2 print:grid-cols-2 print:gap-1"
              >
                {buildSurfaceAreaMetrics(payload.result, equipmentMode, tankType).map((item) => (
                  <MetricCard key={item.label} item={item} unit={areaUnit} />
                ))}
              </div>
            </SectionCard>
          </section>

          <section className="grid gap-3 xl:grid-cols-2 print:grid-cols-2 print:gap-1.5">
            <SectionCard title="Mass Results" className="print:break-inside-avoid">
              <div className="grid gap-2 md:grid-cols-2 print:grid-cols-2 print:gap-1">
                {buildMassMetrics(payload.result).map((item) => (
                  <MetricCard key={item.label} item={item} unit={massUnit} />
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Timing Results" className="print:break-inside-avoid">
              <div className="grid gap-2 md:grid-cols-2 print:grid-cols-2 print:gap-1">
                {buildTimingMetrics(payload.result, payload.units.length).map((item) => (
                  <MetricCard key={item.label} item={item} />
                ))}
              </div>
            </SectionCard>
          </section>
        </div>
      </main>
    </FormProvider>
  )
}

function buildEquipmentItems(payload: VesselPrintReportPayload): LabeledValue[] {
  const input = payload.input

  return [
    { label: 'Tag', value: present(input.tag) },
    { label: 'Description', value: present(input.description) },
    { label: 'Equipment Mode', value: present(input.equipmentMode) },
    {
      label: input.equipmentMode === EquipmentMode.TANK ? 'Tank Type' : 'Orientation',
      value: input.equipmentMode === EquipmentMode.TANK
        ? present(input.tankType)
        : present(input.orientation),
    },
    ...(input.equipmentMode === EquipmentMode.TANK
      ? [{ label: 'Roof Type', value: present(input.tankRoofType) }]
      : [{ label: 'Head Type', value: present(input.headType) }]),
    { label: 'Wall Thickness', value: formatUnitValue(input.wallThickness, 'length', payload.units.length) },
  ]
}

function buildGeometryItems(payload: VesselPrintReportPayload): LabeledValue[] {
  const input = payload.input
  const equipmentMode = input.equipmentMode ?? EquipmentMode.VESSEL
  const tankType = input.tankType

  return [
    { label: 'Inside Diameter', value: formatUnitValue(input.insideDiameter, 'length', payload.units.length) },
    {
      label: equipmentMode === EquipmentMode.TANK ? 'Shell Height' : 'Shell Length',
      value: formatUnitValue(input.shellLength, 'length', payload.units.length),
    },
    ...(equipmentMode === EquipmentMode.VESSEL
      ? [{ label: 'Head Depth Used', value: formatUnitValue(payload.result.headDepthUsed, 'length', payload.units.length) }]
      : []),
    ...(equipmentMode === EquipmentMode.TANK && tankType === TankType.TOP_ROOF && input.tankRoofType !== TankRoofType.FLAT
      ? [{ label: 'Roof Height', value: formatUnitValue(input.roofHeight, 'length', payload.units.length) }]
      : []),
    { label: 'Bottom Height', value: formatUnitValue(input.bottomHeight, 'length', payload.units.length) },
    { label: 'Boot Diameter', value: formatUnitValue(input.bootInsideDiameter, 'length', payload.units.length) },
    { label: 'Boot Height', value: formatUnitValue(input.bootHeight, 'length', payload.units.length) },
  ]
}

function buildLevelItems(payload: VesselPrintReportPayload): LabeledValue[] {
  const input = payload.input

  return [
    { label: 'Liquid Level', value: formatUnitValue(input.liquidLevel, 'length', payload.units.length) },
    { label: 'LLL', value: formatUnitValue(input.lll, 'length', payload.units.length) },
    { label: 'HLL', value: formatUnitValue(input.hll, 'length', payload.units.length) },
    { label: 'OFL', value: formatUnitValue(input.ofl, 'length', payload.units.length) },
  ]
}

function buildProcessItems(payload: VesselPrintReportPayload): LabeledValue[] {
  const input = payload.input
  const equipmentMode = input.equipmentMode ?? EquipmentMode.VESSEL

  return [
    { label: 'Liquid Density', value: formatUnitValue(input.density, 'density', payload.units.density) },
    { label: 'Flowrate', value: formatUnitValue(input.flowrate, 'volumeFlow', payload.units.volumeFlow) },
    ...(equipmentMode === EquipmentMode.TANK
      ? [{ label: 'Outlet Fitting Diameter', value: formatUnitValue(input.outletFittingDiameter, 'length', payload.units.length) }]
      : []),
    { label: 'Material Density', value: formatUnitValue(input.materialDensity, 'density', payload.units.density) },
    { label: 'Calculated At', value: formatTimestamp(payload.result.calculatedAt) },
  ]
}

function buildVolumeMetrics(
  result: CalculationResult,
  equipmentMode: EquipmentMode,
  tankType?: TankType,
): MetricItem[] {
  const isTank = equipmentMode === EquipmentMode.TANK
  const isSphericalTank = isTank && tankType === TankType.SPHERICAL

  if (isSphericalTank) {
    return [
      metric('Sphere Volume', result.volumes.totalVolume, true),
      metric('Effective Volume', result.volumes.effectiveVolume),
      metric('Working Volume', result.volumes.workingVolume),
      metric('Overflow Volume', result.volumes.overflowVolume),
      metric('Partial Volume', result.volumes.partialVolume),
    ]
  }

  if (isTank) {
    return [
      metric('Roof Volume', result.volumes.headVolume),
      metric('Shell Volume', result.volumes.shellVolume),
      metric('Total Tank Volume', result.volumes.totalVolume, true),
      metric('Shell Volume (cylindrical body)', result.volumes.tangentVolume),
      metric('Effective Volume', result.volumes.effectiveVolume),
      metric('Working Volume', result.volumes.workingVolume),
      metric('Overflow Volume', result.volumes.overflowVolume),
      metric('Partial Volume', result.volumes.partialVolume),
    ]
  }

  return [
    metric('Head Volume (2 heads)', result.volumes.headVolume),
    metric('Shell Volume', result.volumes.shellVolume),
    ...(result.volumes.bootVolume > 0 ? [metric('Boot Volume', result.volumes.bootVolume)] : []),
    metric(result.volumes.bootVolume > 0 ? 'Total Volume (incl. Boot)' : 'Total Volume', result.volumes.totalVolume, true),
    metric('Tangent Volume (shell only)', result.volumes.tangentVolume),
    metric('Effective Volume', result.volumes.effectiveVolume),
    metric('Working Volume', result.volumes.workingVolume),
    metric('Overflow Volume', result.volumes.overflowVolume),
    metric('Partial Volume', result.volumes.partialVolume),
  ]
}

function buildSurfaceAreaMetrics(
  result: CalculationResult,
  equipmentMode: EquipmentMode,
  tankType?: TankType,
): MetricItem[] {
  const isTank = equipmentMode === EquipmentMode.TANK
  const isSphericalTank = isTank && tankType === TankType.SPHERICAL

  if (isSphericalTank) {
    return [
      metric('Sphere Surface Area', result.surfaceAreas.totalSurfaceArea, true),
      metric('Wetted Surface Area', result.surfaceAreas.wettedSurfaceArea),
    ]
  }

  if (isTank) {
    return [
      metric('Roof + Bottom Surface Area', result.surfaceAreas.headSurfaceArea),
      metric('Shell Surface Area', result.surfaceAreas.shellSurfaceArea),
      metric('Total Tank Surface Area', result.surfaceAreas.totalSurfaceArea, true),
      metric('Wetted Surface Area', result.surfaceAreas.wettedSurfaceArea),
    ]
  }

  return [
    metric('Head Surface Area (2 heads)', result.surfaceAreas.headSurfaceArea),
    metric('Shell Surface Area', result.surfaceAreas.shellSurfaceArea),
    ...(result.surfaceAreas.bootSurfaceArea > 0 ? [metric('Boot Surface Area', result.surfaceAreas.bootSurfaceArea)] : []),
    metric(
      result.surfaceAreas.bootSurfaceArea > 0
        ? 'Total Surface Area (incl. Boot)'
        : 'Total Surface Area',
      result.surfaceAreas.totalSurfaceArea,
      true,
    ),
    metric('Wetted Surface Area', result.surfaceAreas.wettedSurfaceArea),
    ...(result.surfaceAreas.bootSurfaceArea > 0
      ? [metric('Boot Wetted Area', result.surfaceAreas.bootWettedArea)]
      : []),
  ]
}

function buildMassMetrics(result: CalculationResult): MetricItem[] {
  return [
    metric('Empty Vessel Mass', result.masses.massEmpty),
    metric('Liquid Mass at LL', result.masses.massLiquid),
    metric('Full Liquid Mass', result.masses.massFull, true),
  ]
}

function buildTimingMetrics(result: CalculationResult, lengthUnit: string): MetricItem[] {
  return [
    { label: 'Surge Time (LLL → HLL)', value: formatTime(result.timing.surgeTime), emphasize: true },
    { label: 'Inventory Time', value: formatTime(result.timing.inventory) },
    ...(result.vortexSubmergence != null
      ? [{
          label: 'Vortex Submergence',
          value: `${formatDecimal(convertUnit(result.vortexSubmergence, BASE_UNITS.length, lengthUnit))} ${unitLabel(lengthUnit)}`,
        }]
      : []),
  ]
}

function PrintDataCard({
  title,
  items,
}: {
  title: string
  items: LabeledValue[]
}) {
  return (
    <SectionCard title={title}>
      <div className="grid gap-2 sm:grid-cols-2 print:grid-cols-2 print:gap-1">
        {items.map((item) => (
          <div
            key={`${title}-${item.label}`}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 print:px-2 print:py-1.5"
          >
            <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500 print:text-[8px]">{item.label}</p>
            <p className="mt-0.5 text-sm font-medium text-slate-900 print:mt-0 print:text-[10px]">{item.value}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function MetricCard({
  item,
  unit,
}: {
  item: MetricItem
  unit?: string
}) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white px-3 py-2.5 print:px-2 print:py-1.5 ${
        item.emphasize ? 'border-slate-300 bg-slate-50' : ''
      }`}
    >
      <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500 print:text-[8px]">{item.label}</p>
      <p className="mt-0.5 text-base font-semibold tracking-tight text-slate-900 print:mt-0 print:text-[10px]">
        {item.value}
        {unit && item.value !== '—' ? (
          <span className="ml-1 text-[10px] font-medium text-slate-500 print:text-[8px]">{unit}</span>
        ) : null}
      </p>
    </div>
  )
}

function MetaItem({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 print:text-[8px]">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-900 print:mt-0 print:text-[10px]">{present(value)}</p>
    </div>
  )
}

function metric(label: string, value: number | null, emphasize = false): MetricItem {
  return {
    label,
    value: formatDecimal(value),
    emphasize,
  }
}

function formatUnitValue(
  value: number | null | undefined,
  category: VesselUomCategory,
  targetUnit: string,
): string {
  if (value == null || Number.isNaN(value)) {
    return '—'
  }

  const converted = convertUnit(value, BASE_UNITS[category], targetUnit)
  return `${formatDecimal(converted)} ${unitLabel(targetUnit)}`
}

function formatDecimal(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return '—'
  }

  return value.toFixed(Math.abs(value) >= 100 ? 1 : 3)
}

function formatTime(value: number | null): string {
  if (value == null || Number.isNaN(value)) {
    return '—'
  }

  return `${(value * 60).toFixed(1)} min`
}

function formatTimestamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function unitLabel(unit: string): string {
  return UOM_LABEL[unit] ?? unit
}

function present(value?: string): string {
  return value?.trim() || '—'
}
