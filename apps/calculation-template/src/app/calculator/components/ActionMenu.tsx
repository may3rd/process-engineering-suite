"use client"

import { useState } from "react"
import { useFormContext } from "react-hook-form"
import {
  Menu,
  FolderOpen,
  Save,
  RotateCcw,
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

export function ActionMenu({
  onClear,
}: ActionMenuProps) {

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
          <DropdownMenuItem onSelect={onClear}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
