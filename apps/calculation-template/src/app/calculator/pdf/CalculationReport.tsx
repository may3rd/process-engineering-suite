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
  RevisionRecord,
} from '@/types'

export interface CalculationReportProps {
  input: CalculationInput
  result: CalculationResult
  metadata: CalculationMetadata
  revisions: RevisionRecord[]
}

const NAVY = '#1f3864'
const BLACK = '#000000'

const DISCLAIMER =
  'This document is confidential proprietary and/or legally privileged, intended to be used within GCME Co.,Ltd. Unintended recipients are not allowed to distribute, copy, modify, retransmit, disseminate or use this document and/or information.'

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
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
    padding: 24,
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
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 10,
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 9,
    color: '#64748b',
  },
  section: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeader: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  sectionHeaderText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  label: {
    flex: 1,
    color: '#475569',
  },
  value: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
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

export function CalculationReport({
  input,
  result,
  metadata,
  revisions,
}: CalculationReportProps) {
  return (
    <Document title={`Calculation Report - ${input.tag || 'report'}`}>
      <Page size="A4" style={S.page}>
        <View style={S.pageOuterFrame} fixed />
        <View style={S.disclaimerWrap} fixed>
          <Text style={S.disclaimerText}>{DISCLAIMER}</Text>
        </View>
        <View style={S.outerBorder}>
          <View style={S.header}>
            <Text style={S.title}>Calculation Report</Text>
            <Text style={S.subtitle}>
              Replace this template report with app-specific result sections and schematics.
            </Text>
          </View>

          <View style={S.section}>
            <View style={S.sectionHeader}>
              <Text style={S.sectionHeaderText}>Metadata</Text>
            </View>
            <View style={S.row}>
              <Text style={S.label}>Tag</Text>
              <Text style={S.value}>{present(input.tag)}</Text>
            </View>
            <View style={S.row}>
              <Text style={S.label}>Description</Text>
              <Text style={S.value}>{present(input.description)}</Text>
            </View>
            <View style={S.row}>
              <Text style={S.label}>Project Number</Text>
              <Text style={S.value}>{present(metadata.projectNumber)}</Text>
            </View>
            <View style={S.row}>
              <Text style={S.label}>Document Number</Text>
              <Text style={S.value}>{present(metadata.documentNumber)}</Text>
            </View>
            <View style={S.row}>
              <Text style={S.label}>Title</Text>
              <Text style={S.value}>{present(metadata.title)}</Text>
            </View>
            <View style={S.row}>
              <Text style={S.label}>Project Name</Text>
              <Text style={S.value}>{present(metadata.projectName)}</Text>
            </View>
            <View style={S.row}>
              <Text style={S.label}>Client</Text>
              <Text style={S.value}>{present(metadata.client)}</Text>
            </View>
          </View>

          <View style={S.section}>
            <View style={S.sectionHeader}>
              <Text style={S.sectionHeaderText}>Result Summary</Text>
            </View>
            <View style={S.row}>
              <Text style={S.label}>Status</Text>
              <Text style={S.value}>{present(result.status)}</Text>
            </View>
            <View style={S.row}>
              <Text style={S.label}>Revision Records</Text>
              <Text style={S.value}>{revisions.length}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
