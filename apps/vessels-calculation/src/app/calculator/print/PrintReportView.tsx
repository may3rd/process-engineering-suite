'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PrintReportContent } from './PrintReportContent'
import {
  deletePrintReportPayload,
  readPrintReportPayload,
  type VesselPrintReportPayload,
} from '@/lib/printReport'

export function PrintReportView() {
  const searchParams = useSearchParams()
  const key = searchParams.get('key')
  const [payload, setPayload] = useState<VesselPrintReportPayload | null>(null)

  useEffect(() => {
    if (!key) return
    setPayload(readPrintReportPayload(window.localStorage, key))
  }, [key])

  useEffect(() => {
    if (!key || !payload) return

    const timer = window.setTimeout(() => {
      window.print()
    }, 300)

    const handleAfterPrint = () => {
      deletePrintReportPayload(window.localStorage, key)
    }

    window.addEventListener('afterprint', handleAfterPrint)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('afterprint', handleAfterPrint)
    }
  }, [key, payload])

  if (!key) {
    return (
      <main className="min-h-screen bg-white px-6 py-8 text-slate-900">
        <p className="text-sm text-slate-600">Missing print payload key.</p>
      </main>
    )
  }

  if (!payload) {
    return (
      <main className="min-h-screen bg-white px-6 py-8 text-slate-900">
        <p className="text-sm text-slate-600">Print payload not found.</p>
      </main>
    )
  }

  return <LoadedPrintReportView payload={payload} />
}

function LoadedPrintReportView({ payload }: { payload: VesselPrintReportPayload }) {
  return <PrintReportContent payload={payload} />
}
