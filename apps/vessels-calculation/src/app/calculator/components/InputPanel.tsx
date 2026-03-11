"use client"

import { VesselDetailsSection } from "../sections/VesselDetailsSection"
import { GeometrySection } from "../sections/GeometrySection"
import { LevelsSection } from "../sections/LevelsSection"
import { FluidSection } from "../sections/FluidSection"
import { CalculationMetadataSection } from "./CalculationMetadataSection"
import type { CalculationMetadata, RevisionRecord } from "@/types"

interface InputPanelProps {
  metadata: CalculationMetadata
  onMetadataChange: (metadata: CalculationMetadata) => void
  revisionHistory: RevisionRecord[]
  onRevisionHistoryChange: (revisions: RevisionRecord[]) => void
}

export function InputPanel({
  metadata,
  onMetadataChange,
  revisionHistory,
  onRevisionHistoryChange,
}: InputPanelProps) {
  return (
    <div className="space-y-4">
      <CalculationMetadataSection
        metadata={metadata}
        onMetadataChange={onMetadataChange}
        revisionHistory={revisionHistory}
        onRevisionHistoryChange={onRevisionHistoryChange}
      />
      <VesselDetailsSection />
      <GeometrySection />
      <LevelsSection />
      <FluidSection />
    </div>
  )
}
