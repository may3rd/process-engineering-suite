"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Menu, Save, FileUp, Trash2, FileOutput } from "lucide-react"
import type { CalculationResult, CalculationMetadata, RevisionRecord } from "@/types"

interface ActionMenuProps {
  onClear: () => void
  calculationMetadata: CalculationMetadata
  revisionHistory: RevisionRecord[]
  onCalculationLoaded: (metadata: CalculationMetadata, revisionHistory: RevisionRecord[]) => void
  calculationResult: CalculationResult | null
}

/**
 * ActionMenu — Top-bar dropdown containing all major app actions.
 */
export function ActionMenu({
  onClear,
  calculationMetadata,
  revisionHistory,
  onCalculationLoaded,
  calculationResult,
}: ActionMenuProps) {

  const handleClear = () => {
    if (confirm("Are you sure you want to clear all inputs?")) {
      onClear()
    }
  }

  const handleExport = () => {
    // Logic for PDF or Excel export
    console.log("Exporting calculation results...")
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Menu className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => console.log("Save clicked")}>
            <Save className="mr-2 h-4 w-4" />
            <span>Save</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => console.log("Load clicked")}>
            <FileUp className="mr-2 h-4 w-4" />
            <span>Load</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExport} disabled={!calculationResult}>
            <FileOutput className="mr-2 h-4 w-4" />
            <span>Export Report</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleClear} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Clear All</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
