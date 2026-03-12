/**
 * VesselReport — @react-pdf/renderer document.
 *
 * Separate render tree from the DOM. Uses @react-pdf/renderer primitives only.
 * All unit conversion is done at render time using convertUnit from @eng-suite/physics.
 */

import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Svg,
  Path,
  Rect,
  Line,
  Circle,
  G,
  Defs,
  ClipPath,
} from '@react-pdf/renderer'
import { convertUnit } from '@eng-suite/physics'
import { BASE_UNITS, UOM_LABEL, type VesselUomCategory } from '@/lib/uom'
import { buildVesselSchematicModel, type VesselSchematicAnnotation, type VesselSchematicLevel } from '@/lib/schematics/vesselSchematicModel'
import {
  EquipmentMode,
  TankRoofType,
  TankType,
  type CalculationInput,
  type CalculationResult,
  type CalculationMetadata,
  type RevisionRecord,
} from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VesselReportProps {
  input: CalculationInput
  result: CalculationResult
  metadata: CalculationMetadata
  revisions: RevisionRecord[]
  units: Record<VesselUomCategory, string>
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    padding: 36,
    color: '#111827',
    lineHeight: 1.4,
  },
  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  appTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1d4ed8' },
  appSubtitle: { fontSize: 8, color: '#6b7280', marginTop: 2 },
  tagText: { fontSize: 20, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  tagLabel: { fontSize: 7, color: '#6b7280', textAlign: 'right' },
  // Metadata grid
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12, gap: 4 },
  metaCell: { width: '33%', paddingRight: 8 },
  metaLabel: { fontSize: 6.5, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4 },
  metaValue: { fontSize: 8 },
  // Section
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    backgroundColor: '#1d4ed8',
    color: '#ffffff',
    padding: '3 6',
    marginBottom: 0,
    marginTop: 10,
  },
  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#bfdbfe',
    padding: '3 6',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    padding: '2.5 6',
  },
  tableRowBold: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#bfdbfe',
    padding: '2.5 6',
    backgroundColor: '#f0f9ff',
  },
  colLabel: { flex: 3 },
  colValue: { flex: 2, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  colUnit: { flex: 1.5, textAlign: 'right', color: '#6b7280' },
  headerText: { fontSize: 7, color: '#374151', fontFamily: 'Helvetica-Bold' },
  cellText: { fontSize: 7.5 },
  cellBold: { fontSize: 7.5, fontFamily: 'Helvetica-Bold' },
  cellMuted: { fontSize: 7, color: '#6b7280' },
  // Divider
  divider: { borderBottomWidth: 0.5, borderBottomColor: '#d1d5db', marginVertical: 6 },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#d1d5db',
    paddingTop: 4,
  },
  footerText: { fontSize: 6.5, color: '#9ca3af' },
  // Revision table
  revHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 0.5,
    borderBottomColor: '#d1d5db',
    padding: '3 4',
  },
  revRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    padding: '2.5 4',
  },
  revCell: { flex: 1, fontSize: 7 },
  revHeaderCell: { flex: 1, fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#374151' },
  schematicWrap: {
    borderWidth: 0.5,
    borderColor: '#d1d5db',
    padding: 8,
    marginTop: 2,
    alignItems: 'center',
    minHeight: 400,
  },
  schematicSvg: {
    alignSelf: 'center',
  },
  schematicCaption: {
    marginTop: 4,
    fontSize: 6.5,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  schematicLegend: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: 16,
    rowGap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendLabel: {
    fontSize: 7,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginLeft: 4,
  },
  legendSwatchLiquid: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#bfdbfe',
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  legendSwatchOutline: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#6b7280',
  },
  legendSwatchBoot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#6b7280',
  },
  legendLine: {
    width: 16,
    height: 0,
    borderTopWidth: 1,
    borderTopColor: '#6b7280',
    borderStyle: 'dashed',
  },
  legendLineHll: {
    width: 16,
    height: 0,
    borderTopWidth: 1,
    borderTopColor: '#22c55e',
    borderStyle: 'dashed',
  },
  legendLineLll: {
    width: 16,
    height: 0,
    borderTopWidth: 1,
    borderTopColor: '#f59e0b',
    borderStyle: 'dashed',
  },
  legendLineOfl: {
    width: 16,
    height: 0,
    borderTopWidth: 1,
    borderTopColor: '#ef4444',
    borderStyle: 'dashed',
  },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(
  value: number | null | undefined,
  baseUnit: string,
  displayUnit: string,
  decimals = 4,
): string {
  if (value == null || !isFinite(value)) return '—'
  return convertUnit(value, baseUnit, displayUnit).toFixed(decimals)
}

function unitLabel(unit: string): string {
  return UOM_LABEL[unit] ?? unit
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <View style={S.metaCell}>
      <Text style={S.metaLabel}>{label}</Text>
      <Text style={S.metaValue}>{value || '—'}</Text>
    </View>
  )
}

function TableRow({
  label,
  value,
  unit,
  bold,
  indent,
}: {
  label: string
  value: string
  unit: string
  bold?: boolean
  indent?: boolean
}) {
  const rowStyle = bold ? S.tableRowBold : S.tableRow
  const labelStyle = [S.cellText, indent ? { paddingLeft: 10 } : {}] as const
  return (
    <View style={rowStyle}>
      <Text style={[...(indent ? [S.cellText, { paddingLeft: 8 }] : [S.cellText]), S.colLabel]}>
        {label}
      </Text>
      <Text style={[bold ? S.cellBold : S.cellText, S.colValue]}>{value}</Text>
      <Text style={[S.cellMuted, S.colUnit]}>{unit}</Text>
    </View>
  )
}

function SchematicFigure({ input }: { input: CalculationInput }) {
  const equipmentMode = input.equipmentMode ?? EquipmentMode.VESSEL
  const width = 420
  const height = 220
  const pad = 26
  const stroke = '#111827'
  const guide = '#6b7280'
  const fill = '#bfdbfe'

  if (equipmentMode === EquipmentMode.TANK) {
    if (input.tankType === TankType.SPHERICAL) {
      const d = Math.max(input.insideDiameter, 1)
      const rMm = d / 2
      const clMm = input.bottomHeight && input.bottomHeight > 0 ? input.bottomHeight : d * 0.25
      const scale = Math.min((width - pad * 2) / d, (height - pad * 2) / (rMm + clMm))
      const r = rMm * scale
      const cx = width / 2
      const cy = pad + r
      const groundY = cy + clMm * scale
      const liquidY = input.liquidLevel != null ? clamp(cy + r - input.liquidLevel * scale, cy - r, cy + r) : undefined

      return (
        <View style={S.schematicWrap}>
          <Svg viewBox={`0 0 ${width} ${height}`} width={460} height={372} style={S.schematicSvg}>
            {liquidY != null && (
              <>
                <Rect x={cx - r} y={liquidY} width={r * 2} height={cy + r - liquidY} fill={fill} />
                <Circle cx={cx} cy={cy} r={r} stroke={stroke} strokeWidth={2} fill="none" />
              </>
            )}
            <Circle cx={cx} cy={cy} r={r} stroke={stroke} strokeWidth={2} fill="none" />
            <Line x1={cx - r} y1={cy} x2={cx - r} y2={groundY} stroke={stroke} strokeWidth={2} />
            <Line x1={cx + r} y1={cy} x2={cx + r} y2={groundY} stroke={stroke} strokeWidth={2} />
            <Line x1={cx - r - 28} y1={groundY} x2={cx + r + 28} y2={groundY} stroke={stroke} strokeWidth={1} strokeDasharray="5 4" />
          </Svg>
          <Text style={S.schematicCaption}>Spherical Tank Schematic</Text>
        </View>
      )
    }

    const d = Math.max(input.insideDiameter, 1)
    const shellH = Math.max(input.shellLength ?? 1, 1)
    const roofH = input.tankRoofType && input.tankRoofType !== TankRoofType.FLAT ? Math.max(input.roofHeight ?? 0, 0) : 0
    const scale = Math.min((width - pad * 2) / d, (height - pad * 2) / Math.max(shellH + roofH, 1))
    const bodyW = d * scale
    const bodyH = shellH * scale
    const roof = roofH * scale
    const x0 = (width - bodyW) / 2
    const y0 = (height - (bodyH + roof)) / 2 + roof
    const liquidY = input.liquidLevel != null
      ? clamp(y0 + bodyH - (input.liquidLevel / Math.max(shellH + roofH, 1)) * (bodyH + roof), y0 - roof, y0 + bodyH)
      : undefined
    const roofPath = input.tankRoofType === TankRoofType.CONE
      ? `M ${x0},${y0} L ${x0 + bodyW / 2},${y0 - roof} L ${x0 + bodyW},${y0}`
      : input.tankRoofType === TankRoofType.DOME
        ? `M ${x0},${y0} Q ${x0 + bodyW / 2},${y0 - roof * 1.4} ${x0 + bodyW},${y0}`
        : `M ${x0},${y0} L ${x0 + bodyW},${y0}`

    return (
      <View style={S.schematicWrap}>
        <Svg viewBox={`0 0 ${width} ${height}`} width={460} height={372} style={S.schematicSvg}>
          {liquidY != null && (
            <Rect x={x0} y={liquidY} width={bodyW} height={y0 + bodyH - liquidY} fill={fill} />
          )}
          <Path d={roofPath} stroke={stroke} strokeWidth={2} fill="none" />
          <Rect x={x0} y={y0} width={bodyW} height={bodyH} stroke={stroke} strokeWidth={2} fill="none" />
        </Svg>
        <Text style={S.schematicCaption}>Tank Schematic</Text>
      </View>
    )
  }

  const model = buildVesselSchematicModel({
    input,
    width: 520,
    height: 420,
    padding: 48,
  })

  if (!model) {
    return null
  }

  return (
    <View style={S.schematicWrap}>
      <Svg viewBox={`0 0 ${model.width} ${model.height}`} width={460} height={372} style={S.schematicSvg}>
        <Defs>
          <ClipPath id={model.clipPaths.vesselId}>
            <Path d={model.vesselPath} />
          </ClipPath>
          {model.bootPath && model.clipPaths.bootId && (
            <ClipPath id={model.clipPaths.bootId}>
              <Path d={model.bootPath} />
            </ClipPath>
          )}
        </Defs>

        {model.fills.vessel && (
          <Rect
            x={model.fills.vessel.x}
            y={model.fills.vessel.y}
            width={model.fills.vessel.width}
            height={model.fills.vessel.height}
            fill={fill}
            clipPath={`url(#${model.clipPaths.vesselId})`}
          />
        )}

        {model.breakMarker && (
          <G>
            <Rect
              x={model.breakMarker.background.x}
              y={model.breakMarker.background.y}
              width={model.breakMarker.background.width}
              height={model.breakMarker.background.height}
              fill="#ffffff"
            />
            {model.breakMarker.wallSegments.map((segment) => (
              <Line
                key={segment.key}
                x1={segment.x1}
                y1={segment.y1}
                x2={segment.x2}
                y2={segment.y2}
                stroke={stroke}
                strokeWidth={2}
              />
            ))}
            {model.breakMarker.zigzags.map((segment) => (
              <Path key={segment.key} d={segment.d} stroke={stroke} strokeWidth={1.5} fill="none" />
            ))}
          </G>
        )}

        {model.fills.boot && model.clipPaths.bootId && (
          <Rect
            x={model.fills.boot.x}
            y={model.fills.boot.y}
            width={model.fills.boot.width}
            height={model.fills.boot.height}
            fill={fill}
            clipPath={`url(#${model.clipPaths.bootId})`}
          />
        )}

        {model.outlines.map((outline) => (
          <Path key={outline.key} d={outline.d} stroke={stroke} strokeWidth={2} fill="none" />
        ))}

        {model.legs.map((legLine) => (
          <Line
            key={legLine.key}
            x1={legLine.x1}
            y1={legLine.y1}
            x2={legLine.x2}
            y2={legLine.y2}
            stroke={stroke}
            strokeWidth={2}
          />
        ))}

        <Line
          x1={model.groundLine.x1}
          y1={model.groundLine.y1}
          x2={model.groundLine.x2}
          y2={model.groundLine.y2}
          stroke={stroke}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={0.8}
        />

        {model.levels.map((level) => (
          <PdfLevelLine key={level.key} level={level} />
        ))}

        {model.guideLines.map((guideLine) => (
          <Line
            key={guideLine.key}
            x1={guideLine.x1}
            y1={guideLine.y1}
            x2={guideLine.x2}
            y2={guideLine.y2}
            stroke={guide}
            strokeWidth={0.75}
          />
        ))}

        {model.annotations.map((annotation) => (
          <PdfAnnotation key={annotation.key} annotation={annotation} color={guide} />
        ))}
      </Svg>
      <View style={S.schematicLegend}>
        <LegendItem swatchStyle={S.legendSwatchLiquid} label="Liquid" />
        {model.showLegs && <LegendItem swatchStyle={S.legendSwatchOutline} label="Legs" />}
        {model.hasBoot && <LegendItem swatchStyle={S.legendSwatchBoot} label="Boot" />}
        <LegendItem swatchStyle={S.legendLine} label="Ground" />
        {model.legend.showHll && <LegendItem swatchStyle={S.legendLineHll} label="HLL" />}
        {model.legend.showLll && <LegendItem swatchStyle={S.legendLineLll} label="LLL" />}
        {model.legend.showOfl && <LegendItem swatchStyle={S.legendLineOfl} label="OFL" />}
      </View>
    </View>
  )
}

function PdfLevelLine({ level }: { level: VesselSchematicLevel }) {
  return (
    <G>
      <Line
        x1={level.lineX1}
        y1={level.y}
        x2={level.lineX2}
        y2={level.y}
        stroke={level.color}
        strokeWidth={1.5}
        strokeDasharray={level.dashed ? '4 2' : undefined}
      />
      <Text
        x={level.textX}
        y={level.textY}
        fill={level.color}
        style={{ fontSize: 11 }}
      >
        {level.label}
      </Text>
    </G>
  )
}

function PdfAnnotation({
  annotation,
  color,
}: {
  annotation: VesselSchematicAnnotation
  color: string
}) {
  const cx = (annotation.x1 + annotation.x2) / 2
  const cy = (annotation.y1 + annotation.y2) / 2
  const verticalTextOffset = 8
  const textX = annotation.vertical
    ? cx + (annotation.labelSide === 'start' ? -verticalTextOffset : verticalTextOffset)
    : cx

  return (
    <G>
      <Line
        x1={annotation.x1}
        y1={annotation.y1}
        x2={annotation.x2}
        y2={annotation.y2}
        stroke={color}
        strokeWidth={1}
      />
      <Text
        x={textX}
        y={annotation.vertical ? cy + 3 : cy - 6}
        textAnchor={annotation.vertical ? (annotation.labelSide === 'start' ? 'end' : 'start') : 'middle'}
        fill={color}
        style={{ fontSize: 10 }}
      >
        {annotation.label}
      </Text>
    </G>
  )
}

function LegendItem({
  swatchStyle,
  label,
}: {
  swatchStyle: Record<string, string | number>
  label: string
}) {
  return (
    <View style={S.legendItem}>
      <View style={swatchStyle} />
      <Text style={S.legendLabel}>{label}</Text>
    </View>
  )
}

// ─── Document ─────────────────────────────────────────────────────────────────

export function VesselReport({ input, result, metadata, revisions, units }: VesselReportProps) {
  const vol = units.volume
  const area = units.area
  const mass = units.mass
  const len = units.length

  const { volumes: V, surfaceAreas: SA, masses: M, timing: T, headDepthUsed } = result

  return (
    <Document title={`Vessel Calculation — ${input.tag}`} author="Process Engineering Suite">
      <Page size="A4" style={S.page}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={S.headerRow}>
          <View>
            <Text style={S.appTitle}>Vessel Calculator</Text>
            <Text style={S.appSubtitle}>Process Engineering Suite · Volume &amp; Surface Area</Text>
          </View>
          <View>
            <Text style={S.tagLabel}>Equipment Tag</Text>
            <Text style={S.tagText}>{input.tag}</Text>
          </View>
        </View>

        <View style={S.divider} />

        {/* ── Metadata ───────────────────────────────────────────────────── */}
        <View style={S.metaGrid}>
          <MetaField label="Description" value={input.description ?? ''} />
          <MetaField label="Project Number" value={metadata.projectNumber} />
          <MetaField label="Document Number" value={metadata.documentNumber} />
          <MetaField label="Title" value={metadata.title} />
          <MetaField label="Project Name" value={metadata.projectName} />
          <MetaField label="Client" value={metadata.client} />
          <MetaField label="Orientation" value={input.orientation ?? ''} />
          <MetaField label="Head Type" value={input.headType ?? ''} />
          <MetaField label="Calculated At" value={new Date(result.calculatedAt).toLocaleString()} />
        </View>

        {/* ── Geometry inputs ────────────────────────────────────────────── */}
        <Text style={S.sectionTitle}>Geometry Inputs</Text>
        <View style={S.tableHeader}>
          <Text style={[S.headerText, S.colLabel]}>Parameter</Text>
          <Text style={[S.headerText, S.colValue]}>Value</Text>
          <Text style={[S.headerText, S.colUnit]}>Unit</Text>
        </View>
        <TableRow label="Inside Diameter" value={fmt(input.insideDiameter, 'mm', len)} unit={unitLabel(len)} />
        <TableRow label="Shell Length (TL–TL)" value={fmt(input.shellLength, 'mm', len)} unit={unitLabel(len)} />
        <TableRow label="Head Depth (used)" value={fmt(headDepthUsed, 'mm', len)} unit={unitLabel(len)} />
        <TableRow label="Boot Height" value={fmt(input.bootHeight, 'mm', len)} unit={unitLabel(len)} />
        <TableRow label="Wall Thickness" value={fmt(input.wallThickness, 'mm', len)} unit={unitLabel(len)} />
        <TableRow label="Vessel Material" value={input.material ?? "—"} unit="" />
        <TableRow label="Material Density" value={fmt(input.materialDensity, BASE_UNITS.density, units.density)} unit={unitLabel(units.density)} />

        {/* ── Level inputs ───────────────────────────────────────────────── */}
        <Text style={S.sectionTitle}>Level Inputs</Text>
        <View style={S.tableHeader}>
          <Text style={[S.headerText, S.colLabel]}>Level</Text>
          <Text style={[S.headerText, S.colValue]}>Value</Text>
          <Text style={[S.headerText, S.colUnit]}>Unit</Text>
        </View>
        <TableRow label="Liquid Level (LL)" value={fmt(input.liquidLevel, 'mm', len)} unit={unitLabel(len)} />
        <TableRow label="High Liquid Level (HLL)" value={fmt(input.hll, 'mm', len)} unit={unitLabel(len)} />
        <TableRow label="Low Liquid Level (LLL)" value={fmt(input.lll, 'mm', len)} unit={unitLabel(len)} />
        <TableRow label="Overflow Level (OFL)" value={fmt(input.ofl, 'mm', len)} unit={unitLabel(len)} />

        {/* ── Volumes ────────────────────────────────────────────────────── */}
        <Text style={S.sectionTitle}>Volume Results</Text>
        <View style={S.tableHeader}>
          <Text style={[S.headerText, S.colLabel]}>Volume</Text>
          <Text style={[S.headerText, S.colValue]}>{unitLabel(vol)}</Text>
          <Text style={[S.headerText, S.colUnit]} />
        </View>
        <TableRow label="Head Volume (both)" value={fmt(V.headVolume, BASE_UNITS.volume, vol)} unit={unitLabel(vol)} />
        <TableRow label="Shell Volume" value={fmt(V.shellVolume, BASE_UNITS.volume, vol)} unit={unitLabel(vol)} />
        <TableRow label="Total Volume" value={fmt(V.totalVolume, BASE_UNITS.volume, vol)} unit={unitLabel(vol)} bold />
        <TableRow label="Tangent Volume" value={fmt(V.tangentVolume, BASE_UNITS.volume, vol)} unit={unitLabel(vol)} indent />
        <TableRow label="Effective Volume" value={fmt(V.effectiveVolume, BASE_UNITS.volume, vol)} unit={unitLabel(vol)} />
        <TableRow label="Working Volume" value={fmt(V.workingVolume, BASE_UNITS.volume, vol)} unit={unitLabel(vol)} />
        <TableRow label="Overflow Volume" value={fmt(V.overflowVolume, BASE_UNITS.volume, vol)} unit={unitLabel(vol)} />
        <TableRow label="Partial Volume (at LL)" value={fmt(V.partialVolume, BASE_UNITS.volume, vol)} unit={unitLabel(vol)} />

        {/* ── Surface areas ──────────────────────────────────────────────── */}
        <Text style={S.sectionTitle}>Surface Area Results</Text>
        <View style={S.tableHeader}>
          <Text style={[S.headerText, S.colLabel]}>Surface Area</Text>
          <Text style={[S.headerText, S.colValue]}>{unitLabel(area)}</Text>
          <Text style={[S.headerText, S.colUnit]} />
        </View>
        <TableRow label="Head Surface Area (both)" value={fmt(SA.headSurfaceArea, BASE_UNITS.area, area)} unit={unitLabel(area)} />
        <TableRow label="Shell Surface Area" value={fmt(SA.shellSurfaceArea, BASE_UNITS.area, area)} unit={unitLabel(area)} />
        <TableRow label="Total Surface Area" value={fmt(SA.totalSurfaceArea, BASE_UNITS.area, area)} unit={unitLabel(area)} bold />
        <TableRow label="Wetted Surface Area (at LL)" value={fmt(SA.wettedSurfaceArea, BASE_UNITS.area, area)} unit={unitLabel(area)} />

        {/* ── Mass & Timing ──────────────────────────────────────────────── */}
        <Text style={S.sectionTitle}>Mass &amp; Timing Results</Text>
        <View style={S.tableHeader}>
          <Text style={[S.headerText, S.colLabel]}>Parameter</Text>
          <Text style={[S.headerText, S.colValue]}>Value</Text>
          <Text style={[S.headerText, S.colUnit]}>Unit</Text>
        </View>
        <TableRow label="Empty Vessel Mass" value={fmt(M.massEmpty, BASE_UNITS.mass, mass)} unit={unitLabel(mass)} />
        <TableRow label="Liquid Mass (at LL)" value={fmt(M.massLiquid, BASE_UNITS.mass, mass)} unit={unitLabel(mass)} />
        <TableRow label="Full Liquid Mass" value={fmt(M.massFull, BASE_UNITS.mass, mass)} unit={unitLabel(mass)} bold />
        <TableRow label="Surge Time (LLL→HLL)" value={T.surgeTime != null ? (T.surgeTime * 60).toFixed(2) : '—'} unit="min" />
        <TableRow label="Inventory Time (LL/OFL volume)" value={T.inventory != null ? (T.inventory * 60).toFixed(2) : '—'} unit="min" />

        {/* ── Revision table ─────────────────────────────────────────────── */}
        {revisions.length > 0 && (
          <>
            <Text style={[S.sectionTitle, { marginTop: 14 }]}>Revision History</Text>
            <View style={S.revHeader}>
              {['Rev', 'By', 'Date', 'Checked By', 'Approved By'].map((h) => (
                <Text key={h} style={S.revHeaderCell}>{h}</Text>
              ))}
            </View>
            {revisions.map((rev, i) => (
              <View key={i} style={S.revRow}>
                <Text style={S.revCell}>{rev.rev}</Text>
                <Text style={S.revCell}>{rev.by}</Text>
                <Text style={S.revCell}>{rev.byDate ?? '—'}</Text>
                <Text style={S.revCell}>{rev.checkedBy}</Text>
                <Text style={S.revCell}>{rev.approvedBy}</Text>
              </View>
            ))}
          </>
        )}

        <View wrap={false}>
          <Text style={S.sectionTitle}>Schematic</Text>
          <SchematicFigure input={input} />
        </View>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>Process Engineering Suite · Vessel Calculator</Text>
          <Text style={S.footerText} render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          } />
        </View>

      </Page>
    </Document>
  )
}
