import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'
import type {
  CalculationInput,
  CalculationMetadata,
  CalculationResult,
  HorizontalTankInput,
  HorizontalTankResult,
  HorizontalTankSurfaceSnap,
  PerSurfaceResult,
  PipeCalculationInput,
  PipeCalculationResult,
  RevisionRecord,
} from '@/types'

export type ReportInput = CalculationInput | PipeCalculationInput | HorizontalTankInput
export type ReportResult = CalculationResult | PipeCalculationResult | HorizontalTankResult

export interface CalculationReportProps {
  input: ReportInput
  result: ReportResult
  metadata: CalculationMetadata
  revisions: RevisionRecord[]
}

const NAVY = '#1f3864'
const BLACK = '#000000'
const ROW_ALT = '#f8fafc'
const ROW_WHITE = '#ffffff'

const DISCLAIMER =
  'This document is confidential proprietary and/or legally privileged, intended to be used within GCME Co.,Ltd. Unintended recipients are not allowed to distribute, copy, modify, retransmit, disseminate or use this document and/or information.'

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8.5,
    padding: 0,
    color: '#0f172a',
  },
  pageOuterFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 8,
    borderColor: NAVY,
  },
  outerBorder: {
    flex: 1,
    marginTop: 8,
    marginRight: 8,
    marginBottom: 8,
    marginLeft: 18,
    borderWidth: 1,
    borderColor: BLACK,
    padding: 22,
  },
  disclaimerWrap: {
    position: 'absolute',
    left: 7,
    top: 62,
    bottom: 74,
    width: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimerText: {
    width: 800,
    fontSize: 5.6,
    color: '#dc2626',
    textAlign: 'center',
    transform: 'rotate(-90deg)',
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: NAVY,
    paddingBottom: 10,
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 9,
    color: '#64748b',
  },
  section: {
    marginTop: 11,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  sectionHeader: {
    backgroundColor: NAVY,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  sectionHeaderText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
  },
  table: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    minHeight: 22,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  firstRow: {
    borderTopWidth: 0,
  },
  rowAlt: {
    backgroundColor: ROW_ALT,
  },
  rowWhite: {
    backgroundColor: ROW_WHITE,
  },
  cell: {
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    justifyContent: 'center',
  },
  cellLast: {
    borderRightWidth: 0,
  },
  labelCell: {
    width: '32%',
    color: '#475569',
    fontFamily: 'Helvetica-Bold',
  },
  valueCell: {
    width: '68%',
    color: '#0f172a',
  },
  halfLabelCell: {
    width: '23%',
    color: '#475569',
    fontFamily: 'Helvetica-Bold',
  },
  halfValueCell: {
    width: '27%',
  },
  groupRow: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
  },
  groupText: {
    color: NAVY,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    minHeight: 22,
  },
  headerCell: {
    paddingHorizontal: 5,
    paddingVertical: 5,
    borderRightWidth: 1,
    borderRightColor: '#cbd5e1',
    color: NAVY,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  numericCell: {
    textAlign: 'right',
  },
  note: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 7.5,
    lineHeight: 1.35,
  },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 40,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#64748b',
    fontSize: 7,
  },
})

function present(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim() || '—'
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '—'
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  return '—'
}

function formatNumber(value: unknown, digits = 2): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  if (value === 0) return '0'
  const abs = Math.abs(value)
  if (abs < 0.001) return value.toExponential(2)
  const fixed = value.toFixed(digits)
  return fixed.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
}

function valueWithUnit(value: unknown, unit: string, digits = 2): string {
  const formatted = formatNumber(value, digits)
  return formatted === '—' ? formatted : `${formatted} ${unit}`
}

function latestRevision(revisions: RevisionRecord[]): RevisionRecord | undefined {
  return revisions.at(-1) ?? revisions[0]
}

function valueOf(input: ReportInput, key: string): unknown {
  return (input as unknown as Record<string, unknown>)[key]
}

function isPipeResult(result: ReportResult): result is PipeCalculationResult {
  return 'surfaceArea' in result && 'outletTemp' in result
}

function isHorizontalTankResult(result: ReportResult): result is HorizontalTankResult {
  return 'dryHead' in result && 'wetHead' in result
}

function isVerticalTankResult(result: ReportResult): result is CalculationResult {
  return 'roof' in result && 'floor' in result
}

type ReportMode = 'vertical' | 'pipe' | 'horizontal'

function detectMode(input: ReportInput, result: ReportResult): ReportMode {
  const explicitMode = valueOf(input, 'mode')
  if (explicitMode === 'pipe') return 'pipe'
  if (explicitMode === 'horizontal') return 'horizontal'
  if (explicitMode === 'vertical' || explicitMode === 'tank' || explicitMode === 'storage-tank') return 'vertical'

  if (isPipeResult(result)) return 'pipe'
  if (isHorizontalTankResult(result)) return 'horizontal'
  return 'vertical'
}

type KeyValueRow = { label: string; value: string }
type InputGroup = { title: string; rows: KeyValueRow[] }

function compactRows(rows: KeyValueRow[]): KeyValueRow[] {
  return rows.filter((row) => row.value !== '—')
}

function buildInputGroups(input: ReportInput, mode: ReportMode): InputGroup[] {
  if (mode === 'pipe') {
    return [
      {
        title: 'Geometry',
        rows: compactRows([
          { label: 'Pipe / duct type', value: present(valueOf(input, 'pipeType')) },
          { label: 'Orientation', value: present(valueOf(input, 'pipeOrientation')) },
          { label: 'Pipe length', value: valueWithUnit(valueOf(input, 'pipeLength'), 'm', 2) },
          { label: 'Inside diameter', value: valueWithUnit(valueOf(input, 'insideDiameter'), 'mm', 2) },
          { label: 'Outside diameter', value: valueWithUnit(valueOf(input, 'outsideDiameter'), 'mm', 2) },
          { label: 'Side A', value: valueWithUnit(valueOf(input, 'sideA'), 'mm', 2) },
          { label: 'Side B', value: valueWithUnit(valueOf(input, 'sideB'), 'mm', 2) },
        ]),
      },
      {
        title: 'Operating Conditions',
        rows: compactRows([
          { label: 'Flow rate', value: valueWithUnit(valueOf(input, 'flowRate'), 'kg/h', 2) },
          { label: 'Inlet temperature', value: valueWithUnit(valueOf(input, 'inletTemp'), '°C', 2) },
          { label: 'Ambient temperature', value: valueWithUnit(valueOf(input, 'ambientTemp'), '°C', 2) },
          { label: 'Wind speed', value: valueWithUnit(valueOf(input, 'windSpeed'), 'm/s', 2) },
          { label: 'Pressure', value: valueWithUnit(valueOf(input, 'pressure'), 'barg', 2) },
        ]),
      },
      {
        title: 'Construction & Fluid Properties',
        rows: compactRows([
          { label: 'Wall thickness', value: valueWithUnit(valueOf(input, 'wallThickness'), 'mm', 2) },
          { label: 'Wall conductivity', value: valueWithUnit(valueOf(input, 'wallConductivity'), 'W/m·K', 3) },
          { label: 'Insulation thickness', value: valueWithUnit(valueOf(input, 'insulationThickness'), 'mm', 2) },
          { label: 'Insulation conductivity', value: valueWithUnit(valueOf(input, 'insulationConductivity'), 'W/m·K', 4) },
          { label: 'Fluid density', value: valueWithUnit(valueOf(input, 'fluidDensity'), 'kg/m³', 2) },
          { label: 'Fluid specific heat', value: valueWithUnit(valueOf(input, 'fluidSpecificHeat'), 'J/kg·K', 2) },
          { label: 'Fluid viscosity', value: valueWithUnit(valueOf(input, 'fluidViscosity'), 'Pa·s', 6) },
          { label: 'Fluid thermal conductivity', value: valueWithUnit(valueOf(input, 'fluidThermalConductivity'), 'W/m·K', 4) },
          { label: 'Surface emissivity', value: formatNumber(valueOf(input, 'surfaceEmissivity'), 3) },
          { label: 'Wind enhancement', value: formatNumber(valueOf(input, 'windEnhancement'), 3) },
        ]),
      },
    ]
  }

  if (mode === 'horizontal') {
    return [
      {
        title: 'Geometry',
        rows: compactRows([
          { label: 'Inside diameter', value: valueWithUnit(valueOf(input, 'insideDiameter'), 'mm', 2) },
          { label: 'Tank length', value: valueWithUnit(valueOf(input, 'tankLength'), 'mm', 2) },
          { label: 'Head type', value: present(valueOf(input, 'headType')) },
          { label: 'Head depth', value: valueWithUnit(valueOf(input, 'headDepth'), 'mm', 2) },
          { label: 'Flange width', value: valueWithUnit(valueOf(input, 'flangeWidth'), 'mm', 2) },
          { label: 'Liquid level', value: valueWithUnit(valueOf(input, 'liquidLevel'), 'mm', 2) },
        ]),
      },
      {
        title: 'Operating Conditions',
        rows: compactRows([
          { label: 'Fluid temperature', value: valueWithUnit(valueOf(input, 'fluidTemp'), '°C', 2) },
          { label: 'Vapor temperature', value: valueWithUnit(valueOf(input, 'vaporTemp'), '°C', 2) },
          { label: 'Ambient temperature', value: valueWithUnit(valueOf(input, 'ambientTemp'), '°C', 2) },
          { label: 'Wind speed', value: valueWithUnit(valueOf(input, 'windSpeed'), 'm/s', 2) },
          { label: 'Ground temperature', value: valueWithUnit(valueOf(input, 'groundTemp'), '°C', 2) },
        ]),
      },
      {
        title: 'Construction & Properties',
        rows: compactRows([
          { label: 'Wall thickness', value: valueWithUnit(valueOf(input, 'wallThickness'), 'mm', 2) },
          { label: 'Wall conductivity', value: valueWithUnit(valueOf(input, 'wallConductivity'), 'W/m·K', 3) },
          { label: 'Insulation thickness', value: valueWithUnit(valueOf(input, 'insulationThickness'), 'mm', 2) },
          { label: 'Insulation conductivity', value: valueWithUnit(valueOf(input, 'insulationConductivity'), 'W/m·K', 4) },
          { label: 'Fluid density', value: valueWithUnit(valueOf(input, 'fluidDensity'), 'kg/m³', 2) },
          { label: 'Fluid specific heat', value: valueWithUnit(valueOf(input, 'fluidSpecificHeat'), 'J/kg·K', 2) },
          { label: 'Fluid viscosity', value: valueWithUnit(valueOf(input, 'fluidViscosity'), 'Pa·s', 6) },
          { label: 'Fluid thermal conductivity', value: valueWithUnit(valueOf(input, 'fluidThermalConductivity'), 'W/m·K', 4) },
          { label: 'Fluid expansion coefficient', value: valueWithUnit(valueOf(input, 'fluidExpansionCoeff'), '1/K', 6) },
          { label: 'Surface emissivity', value: formatNumber(valueOf(input, 'surfaceEmissivity'), 3) },
          { label: 'Wind enhancement', value: formatNumber(valueOf(input, 'windEnhancement'), 3) },
        ]),
      },
    ]
  }

  return [
    {
      title: 'Geometry',
      rows: compactRows([
        { label: 'Tank diameter', value: valueWithUnit(valueOf(input, 'tankDiameter'), 'mm', 2) },
        { label: 'Tank height', value: valueWithUnit(valueOf(input, 'tankHeight'), 'mm', 2) },
        { label: 'Liquid level', value: valueWithUnit(valueOf(input, 'liquidLevel'), 'mm', 2) },
        { label: 'Roof type', value: present(valueOf(input, 'tankRoofType')) },
        { label: 'Roof height', value: valueWithUnit(valueOf(input, 'roofHeight'), 'mm', 2) },
      ]),
    },
    {
      title: 'Operating Conditions',
      rows: compactRows([
        { label: 'Fluid temperature', value: valueWithUnit(valueOf(input, 'fluidTemp'), '°C', 2) },
        { label: 'Vapor temperature', value: valueWithUnit(valueOf(input, 'vaporTemp'), '°C', 2) },
        { label: 'Ambient temperature', value: valueWithUnit(valueOf(input, 'ambientTemp'), '°C', 2) },
        { label: 'Wind speed', value: valueWithUnit(valueOf(input, 'windSpeed'), 'm/s', 2) },
        { label: 'Ground temperature', value: valueWithUnit(valueOf(input, 'groundTemp'), '°C', 2) },
      ]),
    },
    {
      title: 'Construction & Properties',
      rows: compactRows([
        { label: 'Wall thickness', value: valueWithUnit(valueOf(input, 'wallThickness'), 'mm', 2) },
        { label: 'Wall conductivity', value: valueWithUnit(valueOf(input, 'wallConductivity'), 'W/m·K', 3) },
        { label: 'Insulation thickness', value: valueWithUnit(valueOf(input, 'insulationThickness'), 'mm', 2) },
        { label: 'Insulation conductivity', value: valueWithUnit(valueOf(input, 'insulationConductivity'), 'W/m·K', 4) },
        { label: 'Fluid density', value: valueWithUnit(valueOf(input, 'fluidDensity'), 'kg/m³', 2) },
        { label: 'Fluid specific heat', value: valueWithUnit(valueOf(input, 'fluidSpecificHeat'), 'J/kg·K', 2) },
        { label: 'Fluid viscosity', value: valueWithUnit(valueOf(input, 'fluidViscosity'), 'Pa·s', 6) },
        { label: 'Fluid thermal conductivity', value: valueWithUnit(valueOf(input, 'fluidThermalConductivity'), 'W/m·K', 4) },
        { label: 'Fluid expansion coefficient', value: valueWithUnit(valueOf(input, 'fluidExpansionCoeff'), '1/K', 6) },
        { label: 'Surface emissivity', value: formatNumber(valueOf(input, 'surfaceEmissivity'), 3) },
        { label: 'Roof emissivity', value: formatNumber(valueOf(input, 'roofEmissivity'), 3) },
        { label: 'Wind enhancement', value: formatNumber(valueOf(input, 'windEnhancement'), 3) },
      ]),
    },
  ]
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={S.section}>
      <View style={S.sectionHeader}>
        <Text style={S.sectionHeaderText}>{title}</Text>
      </View>
      {children}
    </View>
  )
}

function FramedPage({ children, pageNumber }: { children: React.ReactNode; pageNumber: number }) {
  return (
    <Page size="A4" style={S.page}>
      <View style={S.pageOuterFrame} fixed />
      <View style={S.disclaimerWrap} fixed>
        <Text style={S.disclaimerText}>{DISCLAIMER}</Text>
      </View>
      <View style={S.outerBorder}>{children}</View>
      <View style={S.footer} fixed>
        <Text>Heat Transfer Calculation Report</Text>
        <Text>Page {pageNumber}</Text>
      </View>
    </Page>
  )
}

function ReportHeader({ mode, tag }: { mode: ReportMode; tag: string }) {
  const subtitle = mode === 'pipe'
    ? 'Pipe / duct heat-loss calculation'
    : mode === 'horizontal'
      ? 'Horizontal tank heat-loss calculation'
      : 'Vertical storage tank heat-loss calculation'

  return (
    <View style={S.header}>
      <Text style={S.title}>Heat Transfer Calculation Report</Text>
      <Text style={S.subtitle}>{subtitle} · Tag: {present(tag)}</Text>
    </View>
  )
}

function KeyValueTable({ rows }: { rows: KeyValueRow[] }) {
  return (
    <View style={S.table}>
      {rows.map((row, index) => (
        <View
          key={`${row.label}-${index}`}
          style={[S.row, index === 0 ? S.firstRow : {}, index % 2 === 0 ? S.rowWhite : S.rowAlt]}
        >
          <View style={[S.cell, S.labelCell]}><Text>{row.label}</Text></View>
          <View style={[S.cell, S.valueCell, S.cellLast]}><Text>{row.value}</Text></View>
        </View>
      ))}
    </View>
  )
}

function TwoColumnInputTable({ groups }: { groups: InputGroup[] }) {
  return (
    <View style={S.table}>
      {groups.map((group) => (
        <View key={group.title}>
          <View style={S.groupRow}><Text style={S.groupText}>{group.title}</Text></View>
          {Array.from({ length: Math.ceil(group.rows.length / 2) }, (_, rowIndex) => {
            const left = group.rows[rowIndex * 2]
            const right = group.rows[rowIndex * 2 + 1]
            return (
              <View
                key={`${group.title}-${rowIndex}`}
                style={[S.row, rowIndex % 2 === 0 ? S.rowWhite : S.rowAlt]}
              >
                <View style={[S.cell, S.halfLabelCell]}><Text>{left?.label ?? ''}</Text></View>
                <View style={[S.cell, S.halfValueCell]}><Text>{left?.value ?? ''}</Text></View>
                <View style={[S.cell, S.halfLabelCell]}><Text>{right?.label ?? ''}</Text></View>
                <View style={[S.cell, S.halfValueCell, S.cellLast]}><Text>{right?.value ?? ''}</Text></View>
              </View>
            )
          })}
        </View>
      ))}
    </View>
  )
}

function ResultHeader({ columns }: { columns: { label: string; width: string; numeric?: boolean }[] }) {
  return (
    <View style={S.headerRow}>
      {columns.map((column, index) => (
        <Text
          key={column.label}
          style={[
            S.headerCell,
            { width: column.width },
            index === columns.length - 1 ? S.cellLast : {},
            column.numeric ? S.numericCell : {},
          ]}
        >
          {column.label}
        </Text>
      ))}
    </View>
  )
}

function SurfaceResultsTable({ rows }: { rows: { name: string; surface: PerSurfaceResult | HorizontalTankSurfaceSnap }[] }) {
  const columns = [
    { label: 'Surface', width: '22%' },
    { label: 'U (W/m²·K)', width: '16%', numeric: true },
    { label: 'Q (W)', width: '16%', numeric: true },
    { label: 'T_wall in/out (°C)', width: '26%', numeric: true },
    { label: 'Area (m²)', width: '20%', numeric: true },
  ]

  return (
    <View style={S.table}>
      <ResultHeader columns={columns} />
      {rows.map((row, index) => (
        <View key={row.name} style={[S.row, index % 2 === 0 ? S.rowWhite : S.rowAlt]}>
          <View style={[S.cell, { width: '22%' }]}><Text>{row.name}</Text></View>
          <View style={[S.cell, { width: '16%' }]}><Text style={S.numericCell}>{formatNumber(row.surface.uOverall, 3)}</Text></View>
          <View style={[S.cell, { width: '16%' }]}><Text style={S.numericCell}>{formatNumber(row.surface.heatLoss, 2)}</Text></View>
          <View style={[S.cell, { width: '26%' }]}><Text style={S.numericCell}>{formatNumber(row.surface.twInside, 2)} / {formatNumber(row.surface.twOutside, 2)}</Text></View>
          <View style={[S.cell, { width: '20%' }, S.cellLast]}><Text style={S.numericCell}>{formatNumber(row.surface.area, 3)}</Text></View>
        </View>
      ))}
    </View>
  )
}

function PipeResultsTable({ result }: { result: PipeCalculationResult }) {
  const rows: KeyValueRow[] = [
    { label: 'Q heat loss', value: valueWithUnit(result.heatLoss, 'W', 2) },
    { label: 'Outlet temperature', value: valueWithUnit(result.outletTemp, '°C', 2) },
    { label: 'U overall', value: valueWithUnit(result.uOverall, 'W/m²·K', 3) },
    { label: 'Re_internal', value: formatNumber(result.reynoldsInternal, 0) },
    { label: 'Surface area', value: valueWithUnit(result.surfaceArea, 'm²', 3) },
    { label: 'h_internal', value: valueWithUnit(result.internalHTC, 'W/m²·K', 3) },
    { label: 'h_external', value: valueWithUnit(result.externalHTC, 'W/m²·K', 3) },
    { label: 'Radiation HTC', value: valueWithUnit(result.radiationHTC, 'W/m²·K', 3) },
    { label: 'Prandtl', value: formatNumber(result.prandtl, 3) },
    { label: 'T_wall in / out', value: `${formatNumber(result.twInside, 2)} / ${formatNumber(result.twOutside, 2)} °C` },
  ]

  return <KeyValueTable rows={rows} />
}

function ResultsSummary({ mode, result }: { mode: ReportMode; result: ReportResult }) {
  if (mode === 'pipe' && isPipeResult(result)) {
    return <PipeResultsTable result={result} />
  }

  if (mode === 'horizontal' && isHorizontalTankResult(result)) {
    return (
      <>
        <SurfaceResultsTable
          rows={[
            { name: 'Dry Wall', surface: result.dryWall },
            { name: 'Wet Wall', surface: result.wetWall },
            { name: 'Dry Head', surface: result.dryHead },
            { name: 'Wet Head', surface: result.wetHead },
          ]}
        />
        <Text style={S.note}>Total heat loss: {valueWithUnit(result.totalHeatLoss, 'W', 2)} · Total area: {valueWithUnit(result.totalArea, 'm²', 3)}</Text>
      </>
    )
  }

  if (isVerticalTankResult(result)) {
    return (
      <>
        <SurfaceResultsTable
          rows={[
            { name: 'Dry Wall', surface: result.dryWall },
            { name: 'Wet Wall', surface: result.wetWall },
            { name: 'Roof', surface: result.roof },
            { name: 'Floor', surface: result.floor },
          ]}
        />
        <Text style={S.note}>Total heat loss: {valueWithUnit(result.totalHeatLoss, 'W', 2)} · Total area: {valueWithUnit(result.totalArea, 'm²', 3)}</Text>
      </>
    )
  }

  return <KeyValueTable rows={[{ label: 'Status', value: present(result.status) }]} />
}

type IterationRow = {
  iteration: number
  uOverall: number
  heatLoss: number
  twSurface: number
}

function aggregateSurfaces(iteration: {
  iteration: number
  dryWall?: PerSurfaceResult | HorizontalTankSurfaceSnap
  wetWall?: PerSurfaceResult | HorizontalTankSurfaceSnap
  roof?: PerSurfaceResult
  floor?: PerSurfaceResult
  dryHead?: HorizontalTankSurfaceSnap
  wetHead?: HorizontalTankSurfaceSnap
}): IterationRow | null {
  const surfaces = [iteration.dryWall, iteration.wetWall, iteration.roof, iteration.floor, iteration.dryHead, iteration.wetHead]
    .filter((surface): surface is PerSurfaceResult | HorizontalTankSurfaceSnap => Boolean(surface))
  const area = surfaces.reduce((sum, surface) => sum + surface.area, 0)
  if (surfaces.length === 0 || area <= 0) return null

  return {
    iteration: iteration.iteration,
    uOverall: surfaces.reduce((sum, surface) => sum + surface.uOverall * surface.area, 0) / area,
    heatLoss: surfaces.reduce((sum, surface) => sum + surface.heatLoss, 0),
    twSurface: surfaces.reduce((sum, surface) => sum + surface.twOutside * surface.area, 0) / area,
  }
}

function firstFiveAndLast<T>(items: T[]): T[] {
  return items.length > 6 ? [...items.slice(0, 5), items[items.length - 1]] : items
}

function buildIterationRows(result: ReportResult): IterationRow[] {
  if (!result.iterations || result.iterations.length === 0) return []

  if (isPipeResult(result)) {
    return firstFiveAndLast(result.iterations).map((iteration) => ({
      iteration: iteration.iteration,
      uOverall: iteration.uOverall,
      heatLoss: iteration.heatLoss,
      twSurface: iteration.twOutside,
    }))
  }

  if (isHorizontalTankResult(result)) {
    return firstFiveAndLast(result.iterations)
      .map((iteration) => aggregateSurfaces(iteration))
      .filter((row): row is IterationRow => Boolean(row))
  }

  if (isVerticalTankResult(result)) {
    return firstFiveAndLast(result.iterations)
      .map((iteration) => aggregateSurfaces(iteration))
      .filter((row): row is IterationRow => Boolean(row))
  }

  return []
}

function IterationTable({ rows }: { rows: IterationRow[] }) {
  const columns = [
    { label: 'Iteration #', width: '20%', numeric: true },
    { label: 'U (W/m²·K)', width: '26%', numeric: true },
    { label: 'Q (W)', width: '26%', numeric: true },
    { label: 'Tws outside (°C)', width: '28%', numeric: true },
  ]

  return (
    <View style={S.table}>
      <ResultHeader columns={columns} />
      {rows.map((row, index) => (
        <View key={`${row.iteration}-${index}`} style={[S.row, index % 2 === 0 ? S.rowWhite : S.rowAlt]}>
          <View style={[S.cell, { width: '20%' }]}><Text style={S.numericCell}>{present(row.iteration)}</Text></View>
          <View style={[S.cell, { width: '26%' }]}><Text style={S.numericCell}>{formatNumber(row.uOverall, 4)}</Text></View>
          <View style={[S.cell, { width: '26%' }]}><Text style={S.numericCell}>{formatNumber(row.heatLoss, 2)}</Text></View>
          <View style={[S.cell, { width: '28%' }, S.cellLast]}><Text style={S.numericCell}>{formatNumber(row.twSurface, 2)}</Text></View>
        </View>
      ))}
    </View>
  )
}

export function CalculationReport({
  input,
  result,
  metadata,
  revisions,
}: CalculationReportProps) {
  const mode = detectMode(input, result)
  const revision = latestRevision(revisions)
  const inputGroups = buildInputGroups(input, mode)
  const iterationRows = buildIterationRows(result)
  const pageCount = iterationRows.length > 0 ? 3 : 2

  const metadataRows: KeyValueRow[] = [
    { label: 'Tag', value: present(valueOf(input, 'tag')) },
    { label: 'Description', value: present(valueOf(input, 'description')) },
    { label: 'Project Number', value: present(metadata.projectNumber) },
    { label: 'Document Number', value: present(metadata.documentNumber) },
    { label: 'Title', value: present(metadata.title) },
    { label: 'Project Name', value: present(metadata.projectName) },
    { label: 'Client', value: present(metadata.client) },
    { label: 'Revision', value: present(revision?.rev) },
    { label: 'Prepared By / Date', value: `${present(revision?.by)} / ${present(revision?.byDate)}` },
    { label: 'Checked By / Date', value: `${present(revision?.checkedBy)} / ${present(revision?.checkedDate)}` },
    { label: 'Approved By / Date', value: `${present(revision?.approvedBy)} / ${present(revision?.approvedDate)}` },
    { label: 'Calculated At', value: present(result.calculatedAt) },
  ]

  return (
    <Document title={`Heat Transfer Calculation Report - ${present(valueOf(input, 'tag'))}`}>
      <FramedPage pageNumber={1}>
        <ReportHeader mode={mode} tag={present(valueOf(input, 'tag'))} />

        <Section title="Metadata">
          <KeyValueTable rows={metadataRows} />
        </Section>

        <Section title="Input Summary">
          <TwoColumnInputTable groups={inputGroups} />
        </Section>
      </FramedPage>

      <FramedPage pageNumber={2}>
        <ReportHeader mode={mode} tag={present(valueOf(input, 'tag'))} />

        <Section title="Results Summary">
          <ResultsSummary mode={mode} result={result} />
        </Section>

        <Section title="Calculation Status">
          <KeyValueTable
            rows={[
              { label: 'Status', value: present(result.status) },
              { label: 'Result type', value: mode === 'pipe' ? 'Pipe' : mode === 'horizontal' ? 'Horizontal Tank' : 'Vertical Tank' },
              { label: 'Revision records', value: present(revisions.length) },
            ]}
          />
        </Section>
      </FramedPage>

      {iterationRows.length > 0 && (
        <FramedPage pageNumber={pageCount}>
          <ReportHeader mode={mode} tag={present(valueOf(input, 'tag'))} />

          <Section title="Iteration Details">
            <IterationTable rows={iterationRows} />
            <Text style={S.note}>
              Table shows the first five iterations and the final iteration when more than six iterations are available. Tank U and Tws values are area-weighted averages; Q is summed across surfaces.
            </Text>
          </Section>
        </FramedPage>
      )}
    </Document>
  )
}
