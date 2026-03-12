import { Suspense } from 'react'
import { PrintReportView } from './PrintReportView'

export default function VesselPrintPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-white px-6 py-8 text-slate-900">
          <p className="text-sm text-slate-600">Loading print view…</p>
        </main>
      }
    >
      <PrintReportView />
    </Suspense>
  )
}
