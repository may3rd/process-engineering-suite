import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { VesselCalculationInput, VesselCalculationOutput } from '../types/calculation';
import type { VesselCalculationMetadata } from '../types/persistence';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 32,
    paddingBottom: 42,
    paddingHorizontal: 32,
    color: '#111827',
  },
  header: {
    borderBottom: '1pt solid #1d4ed8',
    paddingBottom: 6,
    marginBottom: 10,
  },
  title: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: '#1d4ed8',
  },
  subtitle: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 2,
  },
  section: {
    marginTop: 10,
  },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#1d4ed8',
    marginBottom: 3,
  },
  row: {
    flexDirection: 'row',
    borderBottom: '0.3pt solid #e5e7eb',
    paddingVertical: 2,
  },
  label: {
    width: '55%',
    color: '#6b7280',
  },
  value: {
    width: '45%',
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    left: 32,
    right: 32,
    bottom: 16,
    borderTop: '0.3pt solid #e5e7eb',
    paddingTop: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#9ca3af',
    fontSize: 7,
  },
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function format(value: number | undefined, digits = 3): string {
  if (value === undefined || Number.isNaN(value)) {
    return '-';
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export interface CalculationReportProps {
  name: string;
  metadata: VesselCalculationMetadata;
  input: VesselCalculationInput;
  result: VesselCalculationOutput | null;
  generatedAt?: string;
}

export function CalculationReport({
  name,
  metadata,
  input,
  result,
  generatedAt,
}: CalculationReportProps) {
  const generated = new Date(generatedAt ?? new Date().toISOString()).toLocaleString();

  return (
    <Document
      title={`Vessel Calculation - ${name}`}
      author='Process Engineering Suite'
      subject='Vessel volume and surface area report'
    >
      <Page size='A4' style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Vessel Volume and Surface Area Calculation</Text>
          <Text style={styles.subtitle}>Generated: {generated}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Metadata</Text>
          <Row label='Project Number' value={metadata.projectNumber || '-'} />
          <Row label='Project Name' value={metadata.projectName || '-'} />
          <Row label='Document Number' value={metadata.documentNumber || '-'} />
          <Row label='Title' value={metadata.title || '-'} />
          <Row label='Client' value={metadata.client || '-'} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Input Summary</Text>
          <Row label='Equipment Type' value={input.equipmentType} />
          <Row label='Orientation' value={input.orientation} />
          <Row label='Shape' value={input.shape} />
          <Row label='Inside Diameter' value={`${format(input.insideDiameterM)} m`} />
          <Row label='Wall Thickness' value={`${format(input.wallThicknessM)} m`} />
          <Row label='Tan-Tan Length' value={`${format(input.tanTanLengthM)} m`} />
          <Row label='Liquid Level' value={`${format(input.liquidLevelM)} m`} />
          <Row label='High Liquid Level' value={`${format(input.hllM)} m`} />
          <Row label='Low Liquid Level' value={`${format(input.lllM)} m`} />
          <Row label='Overfill Level' value={`${format(input.oflM)} m`} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calculation Results</Text>
          <Row label='Head Surface Area' value={`${format(result?.surfaceArea.headsM2, 2)} m2`} />
          <Row label='Shell Surface Area' value={`${format(result?.surfaceArea.shellM2, 2)} m2`} />
          <Row label='Total Surface Area' value={`${format(result?.surfaceArea.totalM2, 2)} m2`} />
          <Row label='Wetted Surface Area' value={`${format(result?.surfaceArea.wettedM2, 2)} m2`} />
          <Row label='Head Volume' value={`${format(result?.volume.headsM3, 2)} m3`} />
          <Row label='Shell Volume' value={`${format(result?.volume.shellM3, 2)} m3`} />
          <Row label='Total Volume' value={`${format(result?.volume.totalM3, 2)} m3`} />
          <Row label='Effective Volume' value={`${format(result?.volume.effectiveM3, 2)} m3`} />
          <Row label='Working Volume' value={`${format(result?.volume.workingM3, 2)} m3`} />
          <Row label='Overflow Volume' value={`${format(result?.volume.overflowM3, 2)} m3`} />
          <Row label='Empty Vessel Mass' value={`${format(result?.mass.emptyKg, 2)} kg`} />
          <Row label='Liquid Mass' value={`${format(result?.mass.liquidKg, 2)} kg`} />
          <Row label='Full Vessel Mass' value={`${format(result?.mass.fullKg, 2)} kg`} />
        </View>

        <View style={styles.footer} fixed>
          <Text>Process Engineering Suite - Vessel App</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
