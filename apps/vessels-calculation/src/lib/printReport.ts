import type { VesselUomCategory } from '@/lib/uom'
import type {
  CalculationInput,
  CalculationMetadata,
  CalculationResult,
  RevisionRecord,
} from '@/types'

export interface VesselPrintReportPayload {
  input: CalculationInput
  result: CalculationResult
  metadata: CalculationMetadata
  revisions: RevisionRecord[]
  units: Record<VesselUomCategory, string>
}

export function createPrintReportStorageKey(): string {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.round(Math.random() * 1e9)}`
  return `vessels-print-report:${suffix}`
}

function normalizeBasePath(basePath?: string): string {
  if (!basePath) return ''
  return basePath.endsWith('/') ? basePath.slice(0, -1) : basePath
}

export function buildPrintReportHref(
  key: string,
  basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '',
): string {
  return `${normalizeBasePath(basePath)}/calculator/print?key=${encodeURIComponent(key)}`
}

export function writePrintReportPayload(
  storage: Pick<Storage, 'setItem'>,
  key: string,
  payload: VesselPrintReportPayload,
): void {
  storage.setItem(key, JSON.stringify(payload))
}

export function readPrintReportPayload(
  storage: Pick<Storage, 'getItem'>,
  key: string,
): VesselPrintReportPayload | null {
  const raw = storage.getItem(key)
  if (!raw) return null

  try {
    return JSON.parse(raw) as VesselPrintReportPayload
  } catch {
    return null
  }
}

export function deletePrintReportPayload(
  storage: Pick<Storage, 'removeItem'>,
  key: string,
): void {
  storage.removeItem(key)
}
