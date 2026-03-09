import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import type { CalculationInput, CalculationMetadata, RevisionRecord, PumpCalculationResult } from '@/types'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    padding: 20,
    color: '#000',
  },
  titleBlock: {
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 8,
  },
  titleHeader: {
    backgroundColor: '#1a3a5c',
    color: '#fff',
    padding: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleMain: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  titleSub: { fontSize: 8 },
  metaGrid: {
    flexDirection: 'row',
    padding: 4,
    gap: 8,
  },
  metaCell: { flex: 1 },
  metaLabel: { color: '#666', fontSize: 7 },
  metaValue: { fontSize: 8 },
  section: { marginBottom: 6 },
  sectionTitle: {
    backgroundColor: '#e8ecf0',
    padding: '3 4',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    marginBottom: 2,
  },
  table: { borderWidth: 1, borderColor: '#ccc' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee' },
  rowLast: { flexDirection: 'row' },
  cell: { flex: 1, padding: '2 4', fontSize: 7 },
  cellLabel: { color: '#555' },
  cellValue: { fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  highlight: { backgroundColor: '#dbeafe' },
  footer: {
    position: 'absolute',
    bottom: 12,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#ccc',
    paddingTop: 3,
    fontSize: 7,
    color: '#666',
  },
})

function TableRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={[styles.row, highlight ? styles.highlight : {}]}>
      <Text style={[styles.cell, styles.cellLabel]}>{label}</Text>
      <Text style={[styles.cell, styles.cellValue]}>{value}</Text>
    </View>
  )
}

interface Props {
  input: CalculationInput
  result: PumpCalculationResult
  metadata: CalculationMetadata
  revisions: RevisionRecord[]
}

export function PumpReport({ input, result, metadata, revisions }: Props) {
  const date = new Date().toISOString().slice(0, 10)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Title Block */}
        <View style={styles.titleBlock}>
          <View style={styles.titleHeader}>
            <View>
              <Text style={styles.titleMain}>GC MAINTENANCE & ENGINEERING COMPANY LIMITED</Text>
              <Text style={styles.titleSub}>CA-PR-1050.0301 – Pump Calculation Sheet  |  REV.1 – VALIDATION REPORT</Text>
            </View>
            <Text style={styles.titleSub}>Date: {date}</Text>
          </View>
          <View style={styles.metaGrid}>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Project No.</Text>
              <Text style={styles.metaValue}>{metadata.projectNumber || '—'}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Document No.</Text>
              <Text style={styles.metaValue}>{metadata.documentNumber || '—'}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Project</Text>
              <Text style={styles.metaValue}>{metadata.projectName || '—'}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Client</Text>
              <Text style={styles.metaValue}>{metadata.client || '—'}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Equipment Tag</Text>
              <Text style={styles.metaValue}>{input.tag || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Fluid Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fluid Data</Text>
          <View style={styles.table}>
            <TableRow label="Fluid Name" value={input.fluidName || '—'} />
            <TableRow label="Design Flow Rate" value={`${input.flowDesign} m³/h`} />
            <TableRow label="Operating Temperature" value={`${input.temperature} °C`} />
            <TableRow label="Specific Gravity (SG)" value={`${input.sg}`} />
            <TableRow label="Vapour Pressure" value={`${input.vapourPressure} kPaa`} />
            <TableRow label="Viscosity" value={`${input.viscosity} cP`} />
            <TableRow label="Pump Type" value={input.pumpType} />
          </View>
        </View>

        {/* Suction & Discharge */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suction Conditions</Text>
          <View style={styles.table}>
            <TableRow label="Source Vessel Pressure" value={`${input.suctionSourcePressure} kPaa`} />
            <TableRow label="Elevation Above Pump" value={`${input.suctionElevation} m`} />
            <TableRow label="Line & Fitting Losses" value={`${input.suctionLineLoss} kPa`} />
            <TableRow label="Strainer Loss" value={`${input.suctionStrainerLoss} kPa`} />
            <TableRow label="Suction Pressure at Pump Inlet" value={`${result.suctionPressureKpa.toFixed(1)} kPaa`} highlight />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discharge Conditions</Text>
          <View style={styles.table}>
            <TableRow label="Destination Vessel Pressure" value={`${input.dischargeDestPressure} kPaa`} />
            <TableRow label="Elevation Difference" value={`${input.dischargeElevation} m`} />
            <TableRow label="Equipment ΔP" value={`${input.dischargeEquipmentDp} kPa`} />
            <TableRow label="Line & Fitting Losses" value={`${input.dischargeLineLoss} kPa`} />
            <TableRow label="Flow Element ΔP" value={`${input.dischargeFlowElementDp} kPa`} />
            <TableRow label="Design Margin" value={`${input.dischargeDesignMargin} kPa`} />
            <TableRow label="Discharge Pressure at Pump" value={`${result.dischargePressureKpa.toFixed(1)} kPaa`} highlight />
          </View>
        </View>

        {/* Results */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pump Sizing Results</Text>
          <View style={styles.table}>
            <TableRow label="Differential Pressure" value={`${result.differentialPressureKpa.toFixed(1)} kPa`} />
            <TableRow label="Static Head" value={`${result.staticHead.toFixed(2)} m`} />
            <TableRow label="Friction Head" value={`${result.frictionHead.toFixed(2)} m`} />
            <TableRow label="Differential Head" value={`${result.differentialHead.toFixed(2)} m`} highlight />
            <TableRow label="NPSHa" value={`${result.npsha.toFixed(2)} m`} highlight />
            {result.accelHead != null && (
              <TableRow label="Acceleration Head (subtracted)" value={`${result.accelHead.toFixed(2)} m`} />
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Motor Sizing</Text>
          <View style={styles.table}>
            <TableRow label="Pump Efficiency" value={`${input.efficiency}%`} />
            <TableRow label="Wear/Mechanical Margin" value={`${input.wearMarginPct}%`} />
            <TableRow label="Hydraulic Power" value={`${result.hydraulicPowerKw.toFixed(2)} kW`} />
            <TableRow label="Shaft Power" value={`${result.shaftPowerKw.toFixed(2)} kW`} />
            <TableRow label="API 610 Min Motor" value={`${result.apiMinMotorKw.toFixed(2)} kW`} />
            <TableRow label="Recommended Standard Motor" value={`${result.recommendedMotorKw} kW`} highlight />
          </View>
        </View>

        {/* Optional sections */}
        {(result.orificeDeltaPKpa != null || result.recommendedCvDeltaPKpa != null ||
          result.minFlowM3h != null || result.shutoffPressureKpa != null) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Optional Results</Text>
            <View style={styles.table}>
              {result.orificeDeltaPKpa != null && (
                <TableRow label="Orifice Plate ΔP" value={`${result.orificeDeltaPKpa.toFixed(1)} kPa`} />
              )}
              {result.recommendedCvDeltaPKpa != null && (
                <TableRow label="Recommended CV ΔP" value={`${result.recommendedCvDeltaPKpa.toFixed(1)} kPa`} />
              )}
              {result.minFlowM3h != null && (
                <TableRow label="Min Continuous Flow (temp rise)" value={`${result.minFlowM3h.toFixed(2)} m³/h`} />
              )}
              {result.shutoffHead != null && (
                <TableRow label="Shut-off Head" value={`${result.shutoffHead.toFixed(1)} m`} />
              )}
              {result.shutoffPressureKpa != null && (
                <TableRow label="Shut-off Pressure" value={`${result.shutoffPressureKpa.toFixed(1)} kPaa`} />
              )}
              {result.shutoffPowerKw != null && (
                <TableRow label="Shut-off Power" value={`${result.shutoffPowerKw.toFixed(2)} kW`} />
              )}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>CONFIDENTIAL — GC Maintenance &amp; Engineering Company Limited</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
