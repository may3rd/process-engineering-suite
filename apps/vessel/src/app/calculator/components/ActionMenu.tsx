"use client"

import { useState } from "react"
import { Menu, RotateCcw } from "lucide-react"
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
import type { CalculationMetadata, RevisionRecord, CalculationResult } from "@/types"

interface ActionMenuProps {
  onClear: () => void
  calculationMetadata: CalculationMetadata
  revisionHistory: RevisionRecord[]
  onCalculationLoaded: (metadata: CalculationMetadata, revisions: RevisionRecord[]) => void
  calculationResult: CalculationResult | null
}

export function ActionMenu({
  onClear,
  calculationMetadata,
  revisionHistory,
  onCalculationLoaded,
  calculationResult,
}: ActionMenuProps) {
  const [saveOpen, setSaveOpen] = useState(false)
  const [loadOpen, setLoadOpen] = useState(false)

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
    </>
  )
}
