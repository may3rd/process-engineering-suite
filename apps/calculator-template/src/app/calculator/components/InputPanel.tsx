"use client"

import { SectionCard } from "./SectionCard"
import { FieldRow } from "./FieldRow"
import { UomInput } from "./UomInput"
import { Input } from "@/components/ui/input"
import { useFormContext } from "react-hook-form"
import type { CalculationInput, CalculationMetadata, RevisionRecord } from "@/types"

interface InputPanelProps {
  metadata: CalculationMetadata
  onMetadataChange: (metadata: CalculationMetadata) => void
  revisionHistory: RevisionRecord[]
  onRevisionHistoryChange: (history: RevisionRecord[]) => void
}

/**
 * InputPanel — left-aligned column with input sections.
 */
export function InputPanel({
  metadata,
  onMetadataChange,
  revisionHistory,
  onRevisionHistoryChange,
}: InputPanelProps) {
  const { register, formState: { errors } } = useFormContext<CalculationInput>()

  return (
    <div className="space-y-6">
      {/* 1. Identification Section */}
      <SectionCard title="Identification">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldRow
            label="Tag"
            htmlFor="tag"
            required
            error={errors.tag?.message}
          >
            <Input
              id="tag"
              placeholder="e.g., P-101"
              {...register("tag")}
            />
          </FieldRow>
          <FieldRow
            label="Description"
            htmlFor="description"
            error={errors.description?.message}
          >
            <Input
              id="description"
              placeholder="Optional description"
              {...register("description")}
            />
          </FieldRow>
        </div>
      </SectionCard>

      {/* 2. Parameters Section */}
      <SectionCard title="Design Parameters">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldRow
            label="Pressure"
            htmlFor="pressure"
            required
            error={errors.pressure?.message}
          >
            <UomInput name="pressure" category="gaugePressure" id="pressure" />
          </FieldRow>
          <FieldRow
            label="Temperature"
            htmlFor="temperature"
            required
            error={errors.temperature?.message}
          >
            <UomInput name="temperature" category="temperature" id="temperature" />
          </FieldRow>
          <FieldRow
            label="Length"
            htmlFor="length"
            required
            error={errors.length?.message}
          >
            <UomInput name="length" category="length" id="length" />
          </FieldRow>
          <FieldRow
            label="Flowrate"
            htmlFor="flowrate"
            required
            error={errors.flowrate?.message}
          >
            <UomInput name="flowrate" category="volumeFlow" id="flowrate" />
          </FieldRow>
        </div>
      </SectionCard>
      
      {/* Add more SectionCards here... */}
    </div>
  )
}
