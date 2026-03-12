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
} from '@react-pdf/renderer'
import { convertUnit } from '@eng-suite/physics'
import { BASE_UNITS, UOM_LABEL, type VesselUomCategory } from '@/lib/uom'
import { autoHeadDepth } from '@/lib/calculations/vesselGeometry'
import {
  EquipmentMode,
  HeadType,
  TankRoofType,
  TankType,
  VesselOrientation,
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
    minHeight: 190,
  },
  schematicSvg: {
    width: '100%',
    height: 170,
  },
  schematicCaption: {
    marginTop: 4,
    fontSize: 6.5,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
  const guide = '#9ca3af'
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
          <Svg width={width} height={height} style={S.schematicSvg}>
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
        <Svg width={width} height={height} style={S.schematicSvg}>
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

  const d        = Math.max(input.insideDiameter, 1)
  const length   = Math.max(input.shellLength ?? 1, 1)
  const headType = input.headType ?? HeadType.ELLIPSOIDAL_2_1
  const isVertical = (input.orientation ?? VesselOrientation.VERTICAL) === VesselOrientation.VERTICAL

  // Head depth — use autoHeadDepth for accuracy (same as DOM component)
  const headDepth = input.headDepth ?? (autoHeadDepth(headType, d) ?? d / 4)

  const bootID    = input.bootInsideDiameter ?? 0
  const bootCylH  = input.bootHeight ?? 0
  const legHeight = input.bottomHeight ?? 0
  const hasBoot   = bootID > 0 && bootCylH > 0

  // Boot head depth — same logic as DOM VesselSchematic
  const bootHeadDepth = hasBoot
    ? headType === HeadType.CONICAL
      ? bootID * (headDepth / Math.max(d, 1))
      : (autoHeadDepth(headType, bootID) ?? 0)
    : 0

  // Cap drawn length at 4×D for very tall vertical vessels
  const drawnLength = isVertical && d > 0 && length / d > 4 ? 4 * d : length
  const isTruncated = drawnLength < length

  const totalW = isVertical ? d : length + 2 * headDepth
  const totalH = isVertical
    ? drawnLength + headDepth + Math.max(headDepth + (hasBoot ? bootCylH + bootHeadDepth : 0), legHeight)
    : d + Math.max(legHeight, bootCylH + bootHeadDepth)

  const scale          = Math.min((width - pad * 2) / Math.max(totalW, 1), (height - pad * 2) / Math.max(totalH, 1))
  const vW             = (isVertical ? d : length) * scale
  const vH             = (isVertical ? drawnLength : d) * scale
  const vHD            = headDepth * scale
  const leg            = Math.max(0, legHeight) * scale
  const bootCylScaledW = hasBoot ? Math.max(8, Math.min(bootID * scale, vW * 0.5)) : 0
  const bootCylScaledH = hasBoot ? bootCylH * scale : 0
  const bootVHD        = bootHeadDepth * scale

  // Centre the drawing inside the viewport (mirrors DOM component)
  const fullW = isVertical ? vW : vW + 2 * vHD
  const fullH = isVertical
    ? vH + vHD + Math.max(hasBoot ? vHD + bootCylScaledH + bootVHD : vHD, leg)
    : vH + Math.max(leg, bootCylScaledH + bootVHD)
  const x0 = isVertical ? (width - fullW) / 2 : (width - fullW) / 2 + vHD
  const y0 = isVertical ? (height - fullH) / 2 + vHD : (height - fullH) / 2

  const liquidY = input.liquidLevel != null
    ? isVertical
      ? y0 + vH + vHD - input.liquidLevel * scale
      : y0 + vH - input.liquidLevel * scale
    : undefined

  // ── Vessel shell + heads ──
  let vesselPath = ''
  if (isVertical) {
    vesselPath = `M ${x0},${y0} L ${x0+vW},${y0} L ${x0+vW},${y0+vH} L ${x0},${y0+vH} Z`
    if (headType === HeadType.HEMISPHERICAL) {
      vesselPath += ` M ${x0+vW},${y0} A ${vW/2},${vW/2} 0 0 0 ${x0},${y0}`
      vesselPath += ` M ${x0},${y0+vH} A ${vW/2},${vW/2} 0 0 0 ${x0+vW},${y0+vH}`
    } else if (headType === HeadType.CONICAL) {
      vesselPath += ` M ${x0+vW},${y0} L ${x0+vW/2},${y0-vHD} L ${x0},${y0}`
      vesselPath += ` M ${x0},${y0+vH} L ${x0+vW/2},${y0+vH+vHD} L ${x0+vW},${y0+vH}`
    } else {
      vesselPath += ` M ${x0+vW},${y0} A ${vW/2},${vHD} 0 0 0 ${x0},${y0}`
      vesselPath += ` M ${x0},${y0+vH} A ${vW/2},${vHD} 0 0 0 ${x0+vW},${y0+vH}`
    }
  } else {
    vesselPath = `M ${x0},${y0} L ${x0+vW},${y0} L ${x0+vW},${y0+vH} L ${x0},${y0+vH} Z`
    if (headType === HeadType.HEMISPHERICAL) {
      vesselPath += ` M ${x0},${y0+vH} A ${vH/2},${vH/2} 0 0 1 ${x0},${y0}`
      vesselPath += ` M ${x0+vW},${y0} A ${vH/2},${vH/2} 0 0 1 ${x0+vW},${y0+vH}`
    } else if (headType === HeadType.CONICAL) {
      vesselPath += ` M ${x0},${y0+vH} L ${x0-vHD},${y0+vH/2} L ${x0},${y0}`
      vesselPath += ` M ${x0+vW},${y0} L ${x0+vW+vHD},${y0+vH/2} L ${x0+vW},${y0+vH}`
    } else {
      vesselPath += ` M ${x0},${y0+vH} A ${vHD},${vH/2} 0 0 1 ${x0},${y0}`
      vesselPath += ` M ${x0+vW},${y0} A ${vHD},${vH/2} 0 0 1 ${x0+vW},${y0+vH}`
    }
  }

  // ── Vertical boot path ──
  const bootTopY   = y0 + vH + vHD
  const bootX      = x0 + vW / 2 - bootCylScaledW / 2
  const bootBotY   = bootTopY + bootCylScaledH
  const bootApexY  = bootBotY + bootVHD
  const vBootPath = !hasBoot ? '' : (() => {
    let p = `M ${bootX},${bootTopY} L ${bootX},${bootBotY}`
    if (headType === HeadType.HEMISPHERICAL)
      p += ` A ${bootCylScaledW/2},${bootCylScaledW/2} 0 0 0 ${bootX+bootCylScaledW},${bootBotY}`
    else if (headType === HeadType.CONICAL) {
      p += ` L ${bootX+bootCylScaledW/2},${bootApexY}`
      p += ` L ${bootX+bootCylScaledW},${bootBotY}`
    } else
      p += ` A ${bootCylScaledW/2},${bootVHD} 0 0 0 ${bootX+bootCylScaledW},${bootBotY}`
    p += ` L ${bootX+bootCylScaledW},${bootTopY}`
    return p
  })()

  // ── Horizontal boot path ──
  const hBootX        = x0 + vW * 0.15 - bootCylScaledW / 2 - 10
  const hBootTopY     = y0 + vH
  const hBootBodyBotY = hBootTopY + bootCylScaledH
  const hBootBotY     = hBootBodyBotY + bootVHD
  const hBootPath = !hasBoot ? '' : (() => {
    let p = `M ${hBootX},${hBootTopY} L ${hBootX},${hBootBodyBotY}`
    if (headType === HeadType.HEMISPHERICAL)
      p += ` A ${bootCylScaledW/2},${bootCylScaledW/2} 0 0 0 ${hBootX+bootCylScaledW},${hBootBodyBotY}`
    else if (headType === HeadType.CONICAL) {
      p += ` L ${hBootX+bootCylScaledW/2},${hBootBodyBotY+bootVHD}`
      p += ` L ${hBootX+bootCylScaledW},${hBootBodyBotY}`
    } else
      p += ` A ${bootCylScaledW/2},${bootVHD} 0 0 0 ${hBootX+bootCylScaledW},${hBootBodyBotY}`
    p += ` L ${hBootX+bootCylScaledW},${hBootTopY}`
    return p
  })()

  // ── Caption text ──
  const fmtM = (v: number) => `${(v / 1000).toFixed(2)}m`
  const captionParts: string[] = [
    `T-T: ${fmtM(length)}`,
    `D: ${fmtM(d)}`,
    ...(isTruncated ? ['(truncated in drawing)'] : []),
    ...(leg > 0 ? [`Btm: ${fmtM(legHeight)}`] : []),
    ...(hasBoot ? [`BH: ${fmtM(bootCylH)}  BD: ${fmtM(bootID)}`] : []),
  ]

  return (
    <View style={S.schematicWrap}>
      <Svg width={width} height={height} style={S.schematicSvg}>
        {/* Liquid fill — unclipped rect (no clipPath in @react-pdf) */}
        {liquidY != null && (
          <Rect x={x0} y={liquidY} width={vW} height={y0 + vH - liquidY} fill={fill} />
        )}

        {/* Vessel shell + heads */}
        <Path d={vesselPath} stroke={stroke} strokeWidth={2} fill="none" />

        {/* Break mark for truncated tall vertical vessels */}
        {isVertical && isTruncated && (() => {
          const a = 5, gap = 8
          const cx = x0 + vW / 2
          const yb = y0 + vH * 0.5
          const y1L = yb - a - gap / 2;  const y1R = yb + a - gap / 2
          const y2L = yb - a + gap / 2;  const y2R = yb + a + gap / 2
          const zTop = y1L - 1;          const zBot = y2R + 1
          return (
            <G>
              <Rect x={x0 - 1} y={zTop} width={vW + 2} height={zBot - zTop} fill="white" />
              {/* Left wall split */}
              <Line x1={x0} y1={zTop} x2={x0} y2={y1L} stroke={stroke} strokeWidth={2} />
              <Line x1={x0} y1={y2L} x2={x0} y2={zBot} stroke={stroke} strokeWidth={2} />
              {/* Right wall split */}
              <Line x1={x0 + vW} y1={zTop} x2={x0 + vW} y2={y1R} stroke={stroke} strokeWidth={2} />
              <Line x1={x0 + vW} y1={y2R} x2={x0 + vW} y2={zBot} stroke={stroke} strokeWidth={2} />
              {/* Zigzag break line 1 — use L not H (H unsupported in @react-pdf) */}
              <Path d={`M ${x0},${y1L} L ${cx - a},${y1L} L ${cx + a},${y1R} L ${x0 + vW},${y1R}`}
                    stroke={stroke} strokeWidth={1.5} fill="none" />
              {/* Zigzag break line 2 */}
              <Path d={`M ${x0},${y2L} L ${cx - a},${y2L} L ${cx + a},${y2R} L ${x0 + vW},${y2R}`}
                    stroke={stroke} strokeWidth={1.5} fill="none" />
            </G>
          )
        })()}

        {/* Vertical legs */}
        {isVertical && leg > 0 && (
          <G>
            <Line x1={x0}      y1={y0 + vH} x2={x0}      y2={y0 + vH + leg} stroke={stroke} strokeWidth={2} />
            <Line x1={x0 + vW} y1={y0 + vH} x2={x0 + vW} y2={y0 + vH + leg} stroke={stroke} strokeWidth={2} />
            <Line x1={x0 - vHD - 24} y1={y0 + vH + leg} x2={x0 + vW + vHD + 24} y2={y0 + vH + leg}
                  stroke={stroke} strokeWidth={1} strokeDasharray="5 4" />
          </G>
        )}

        {/* Horizontal legs */}
        {!isVertical && leg > 0 && (
          <G>
            <Line x1={x0 + vW * 0.18} y1={y0 + vH} x2={x0 + vW * 0.18} y2={y0 + vH + leg} stroke={stroke} strokeWidth={2} />
            <Line x1={x0 + vW * 0.82} y1={y0 + vH} x2={x0 + vW * 0.82} y2={y0 + vH + leg} stroke={stroke} strokeWidth={2} />
            <Line x1={x0 - vHD - 24} y1={y0 + vH + leg} x2={x0 + vW + vHD + 24} y2={y0 + vH + leg}
                  stroke={stroke} strokeWidth={1} strokeDasharray="5 4" />
          </G>
        )}

        {/* Ground line (when no legs) */}
        {leg === 0 && (
          <Line x1={x0 - vHD - 24} y1={y0 + vH} x2={x0 + vW + vHD + 24} y2={y0 + vH}
                stroke={guide} strokeWidth={1} strokeDasharray="5 4" />
        )}

        {/* Vertical boot */}
        {isVertical && hasBoot && (
          <Path d={vBootPath} stroke={stroke} strokeWidth={2} fill="none" />
        )}

        {/* Horizontal boot */}
        {!isVertical && hasBoot && (
          <Path d={hBootPath} stroke={stroke} strokeWidth={2} fill="none" />
        )}
      </Svg>
      <Text style={S.schematicCaption}>{captionParts.join('  •  ')}</Text>
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

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>Process Engineering Suite · Vessel Calculator</Text>
          <Text style={S.footerText} render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          } />
        </View>

      </Page>

      <Page size="A4" style={S.page}>
        <View style={S.headerRow}>
          <View>
            <Text style={S.appTitle}>Vessel Calculator</Text>
            <Text style={S.appSubtitle}>Process Engineering Suite · Schematic</Text>
          </View>
          <View>
            <Text style={S.tagLabel}>Equipment Tag</Text>
            <Text style={S.tagText}>{input.tag}</Text>
          </View>
        </View>

        <View style={S.divider} />

        <Text style={S.sectionTitle}>Schematic</Text>
        <SchematicFigure input={input} />

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
