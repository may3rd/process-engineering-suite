"use client"

import { useState } from "react"
import { useFormContext } from "react-hook-form"
import {
  Menu,
  FolderOpen,
  Save,
  RotateCcw,
  FileDown,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { CalculationInput, CalculationMetadata, RevisionRecord, CalculationResult, DerivedGeometry } from "@/types"

interface ActionMenuProps {
  onTankLinked: (equipmentId: string | null, tankTag?: string | null) => void
  linkedTag: string | null
  linkedEquipmentId: string | null
  clearToken: number
  onClear: () => void
  calculationMetadata: CalculationMetadata
  revisionHistory: RevisionRecord[]
  onCalculationLoaded: (metadata: CalculationMetadata, revisionHistory: RevisionRecord[]) => void
  calculationResult: CalculationResult | null
  derivedGeometry: DerivedGeometry | null
}

function latestRevisionValue(revisions: RevisionRecord[]): string | null {
  const dated = revisions
    .map((item) => {
      const rev = item.rev?.trim()
      const rawDate = item.byDate?.trim() || item.checkedDate?.trim() || item.approvedDate?.trim() || ""
      const dateValue = rawDate ? Date.parse(rawDate) : Number.NaN
      return { rev, dateValue }
    })
    .filter((item) => item.rev && Number.isFinite(item.dateValue))
    .sort((a, b) => b.dateValue - a.dateValue)

  if (dated.length > 0) return dated[0].rev ?? null

  return revisions.find((item) => item.rev?.trim())?.rev?.trim() ?? null
}

export function ActionMenu({
  onClear,
  calculationMetadata,
  revisionHistory,
  calculationResult,
}: ActionMenuProps) {
  const { getValues } = useFormContext<CalculationInput>()
  const [pdfLoading, setPdfLoading] = useState(false)

  const handleExportPdf = async () => {
    if (!calculationResult) return

    setPdfLoading(true)
    try {
      const [{ pdf }, { CalculationReport }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("../pdf/CalculationReport"),
      ])

      const input = getValues()
      const blob = await pdf(
        <CalculationReport
          input={input}
          result={calculationResult}
          metadata={calculationMetadata}
          revisions={revisionHistory}
        />,
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const fileBase = (
        calculationMetadata.documentNumber?.trim() ||
        input.tag?.trim() ||
        "report"
      ).replace(/[^a-zA-Z0-9-_]/g, "_")
      const latestRev = latestRevisionValue(revisionHistory)
      const revSuffix = latestRev ? `_Rev.${latestRev.replace(/[^a-zA-Z0-9-_]/g, "_")}` : ""
      a.download = `${fileBase}${revSuffix}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="gap-2">
            <Menu className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          {/* File group */}
          <DropdownMenuItem disabled>
            <FolderOpen className="h-4 w-4 mr-2" />
            Load...
          </DropdownMenuItem>

          <DropdownMenuItem disabled>
            <Save className="h-4 w-4 mr-2" />
            Save...
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Utility group */}
          <DropdownMenuItem onClick={handleExportPdf} disabled={!calculationResult || pdfLoading}>
            {pdfLoading
              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : <FileDown className="h-4 w-4 mr-2" />
            }
            {pdfLoading ? "Generating PDF..." : "Export PDF..."}
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={onClear}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
