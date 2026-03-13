"use client"

import { useState } from "react"
import { FileDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUomStore } from "@/lib/store/uomStore"
import type { CalculationInput, CalculationResult, CalculationMetadata, RevisionRecord } from "@/types"
import type { VesselUomCategory } from "@/lib/uom"

interface Props {
  input: CalculationInput | null
  result: CalculationResult | null
  metadata: CalculationMetadata
  revisions: RevisionRecord[]
}

export function ExportPdfButton({ input, result, metadata, revisions }: Props) {
  const { units } = useUomStore()
  const [loading, setLoading] = useState(false)

  const disabled = !input || !result

  const handleExport = async () => {
    if (!input || !result) return
    setLoading(true)
    try {
      const [{ pdf }, { VesselReport }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("../pdf/VesselReport"),
      ])
      const blob = await pdf(
        <VesselReport
          input={input}
          result={result}
          metadata={metadata}
          revisions={revisions}
          units={units as Record<VesselUomCategory, string>}
        />,
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const fileBase = (
        metadata.documentNumber?.trim() ||
        input.tag?.trim() ||
        "report"
      ).replace(/[^a-zA-Z0-9-_]/g, "_")
      a.download = `${fileBase}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="w-full justify-start gap-2 px-2 font-normal"
      disabled={disabled || loading}
      onClick={handleExport}
    >
      {loading
        ? <Loader2 className="h-4 w-4 animate-spin" />
        : <FileDown className="h-4 w-4" />
      }
      {loading ? "Generating PDF…" : "Export PDF…"}
    </Button>
  )
}
