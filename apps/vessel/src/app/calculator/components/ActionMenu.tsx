"use client"

import { useState } from "react"
import { Menu, RotateCcw, FileDown, Loader2, LinkIcon } from "lucide-react"
import { useFormContext } from "react-hook-form"
import { pdf } from "@react-pdf/renderer"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SaveCalculationButton } from "./SaveCalculationButton"
import { LoadCalculationButton } from "./LoadCalculationButton"
import { EquipmentLinkButton } from "./EquipmentLinkButton"
import { VesselReport } from "../pdf/VesselReport"
import { useUomStore } from "@/lib/store/uomStore"
import type { VesselUomCategory } from "@/lib/uom"
import type {
  CalculationInput,
  CalculationMetadata,
  RevisionRecord,
  CalculationResult,
  EquipmentLinkStatus,
} from "@/types"

interface ActionMenuProps {
  onClear: () => void
  calculationMetadata: CalculationMetadata
  revisionHistory: RevisionRecord[]
  onCalculationLoaded: (metadata: CalculationMetadata, revisions: RevisionRecord[]) => void
  calculationResult: CalculationResult | null
  linkStatus: EquipmentLinkStatus
  onLinkStatusChange: (status: EquipmentLinkStatus) => void
}

export function ActionMenu({
  onClear,
  calculationMetadata,
  revisionHistory,
  onCalculationLoaded,
  calculationResult,
  linkStatus,
  onLinkStatusChange,
}: ActionMenuProps) {
  const { getValues } = useFormContext<CalculationInput>()
  const { units } = useUomStore()
  const [saveOpen, setSaveOpen] = useState(false)
  const [loadOpen, setLoadOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const handleExportPdf = async () => {
    if (!calculationResult) return
    setPdfLoading(true)
    try {
      const input = getValues()
      const blob = await pdf(
        <VesselReport
          input={input}
          result={calculationResult}
          metadata={calculationMetadata}
          revisions={revisionHistory}
          units={units as Record<VesselUomCategory, string>}
        />,
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `vessel-${(input.tag || "calc").replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setPdfLoading(false)
    }
  }

  const linkIndicatorClass =
    linkStatus === "linked"
      ? "text-green-600"
      : linkStatus === "error"
      ? "text-destructive"
      : ""

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Menu className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setSaveOpen(true)}>
            Save calculation…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLoadOpen(true)}>
            Load calculation…
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleExportPdf}
            disabled={!calculationResult || pdfLoading}
            className="gap-2"
          >
            {pdfLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <FileDown className="h-4 w-4" />
            }
            {pdfLoading ? "Generating PDF…" : "Export PDF…"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLinkOpen(true)} className="gap-2">
            <LinkIcon className={`h-4 w-4 ${linkIndicatorClass}`} />
            Equipment link…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onClear} className="text-destructive focus:text-destructive">
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear all inputs
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SaveCalculationButton
        controlledOpen={saveOpen}
        onControlledOpenChange={setSaveOpen}
        calculationMetadata={calculationMetadata}
        revisionHistory={revisionHistory}
        calculationResult={calculationResult}
      />
      <LoadCalculationButton
        controlledOpen={loadOpen}
        onControlledOpenChange={setLoadOpen}
        onCalculationLoaded={onCalculationLoaded}
      />
      <EquipmentLinkButton
        controlledOpen={linkOpen}
        onControlledOpenChange={setLinkOpen}
        calculationResult={calculationResult}
        calculationMetadata={calculationMetadata}
        revisionHistory={revisionHistory}
        linkStatus={linkStatus}
        onLinkStatusChange={onLinkStatusChange}
        onCalculationLoaded={onCalculationLoaded}
      />
    </>
  )
}
