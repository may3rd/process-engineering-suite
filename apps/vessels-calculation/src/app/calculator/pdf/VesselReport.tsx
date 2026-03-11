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
} from '@react-pdf/renderer'
import { convertUnit } from '@eng-suite/physics'
import { BASE_UNITS, UOM_LABEL, type VesselUomCategory } from '@/lib/uom'
import type { CalculationInput, CalculationResult, CalculationMetadata, RevisionRecord } from '@/types'

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
    </Document>
  )
}
