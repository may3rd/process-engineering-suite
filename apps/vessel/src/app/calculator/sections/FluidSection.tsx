"use client"

import { useState } from "react"
import { ChevronRight } from "lucide-react"
import { SectionCard } from "../components/SectionCard"
import { FieldRow } from "../components/FieldRow"
import { UomInput } from "../components/UomInput"
import { cn } from "@/lib/utils"

export function FluidSection() {
  const [open, setOpen] = useState(false)

  return (
    <SectionCard title="Fluid Properties">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>Density &amp; flow inputs</span>
        <div className="flex items-center gap-1">
          <span className="text-xs">{open ? "Collapse" : "Expand (optional)"}</span>
          <ChevronRight
            className={cn("h-4 w-4 transition-transform", open && "rotate-90")}
          />
        </div>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <FieldRow
            label="Liquid Density"
            htmlFor="density"
            hint="For mass calculations"
          >
            <UomInput name="density" category="density" id="density" placeholder="e.g. 800" />
          </FieldRow>

          <FieldRow
            label="Volumetric Flow Rate"
            htmlFor="flowrate"
            hint="For surge/inventory timing"
          >
            <UomInput name="flowrate" category="volumeFlow" id="flowrate" placeholder="e.g. 50" />
          </FieldRow>
        </div>
      )}
    </SectionCard>
  )
}
