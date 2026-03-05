"use client"

import { useState } from "react"
import { ChevronRight } from "lucide-react"
import { useFormContext } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { SectionCard } from "../components/SectionCard"
import { FieldRow } from "../components/FieldRow"
import { cn } from "@/lib/utils"
import type { CalculationInput } from "@/types"

export function MetadataSection() {
  const [open, setOpen] = useState(false)
  const { register } = useFormContext<CalculationInput>()

  return (
    <SectionCard title="Project Metadata">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>Project, document &amp; revision info</span>
        <div className="flex items-center gap-1">
          <span className="text-xs">{open ? "Collapse" : "Expand (optional)"}</span>
          <ChevronRight
            className={cn("h-4 w-4 transition-transform", open && "rotate-90")}
          />
        </div>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <FieldRow label="Project Number" htmlFor="metadata.projectNumber">
            <Input id="metadata.projectNumber" {...register("metadata.projectNumber")} placeholder="e.g. PRJ-2024-001" />
          </FieldRow>
          <FieldRow label="Document Number" htmlFor="metadata.documentNumber">
            <Input id="metadata.documentNumber" {...register("metadata.documentNumber")} placeholder="e.g. CAL-V-001" />
          </FieldRow>
          <FieldRow label="Title" htmlFor="metadata.title">
            <Input id="metadata.title" {...register("metadata.title")} placeholder="Vessel volume calculation" />
          </FieldRow>
          <FieldRow label="Project Name" htmlFor="metadata.projectName">
            <Input id="metadata.projectName" {...register("metadata.projectName")} />
          </FieldRow>
          <FieldRow label="Client" htmlFor="metadata.client">
            <Input id="metadata.client" {...register("metadata.client")} />
          </FieldRow>
        </div>
      )}
    </SectionCard>
  )
}
