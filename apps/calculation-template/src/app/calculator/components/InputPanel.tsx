"use client"

import { SectionCard } from "./SectionCard"
import { CalculationMetadataSection } from "./CalculationMetadataSection"
import type { CalculationMetadata, RevisionRecord, DerivedGeometry } from "@/types"

interface Props {
  metadata: CalculationMetadata
  onMetadataChange: (metadata: CalculationMetadata) => void
  revisionHistory: RevisionRecord[]
  onRevisionHistoryChange: (revisionHistory: RevisionRecord[]) => void
  derivedGeometry: DerivedGeometry | null
}

export function InputPanel({
  metadata,
  onMetadataChange,
  revisionHistory,
  onRevisionHistoryChange,
  derivedGeometry,
}: Props) {
  return (
    <div className="space-y-4">
      <CalculationMetadataSection
        metadata={metadata}
        onMetadataChange={onMetadataChange}
        revisionHistory={revisionHistory}
        onRevisionHistoryChange={onRevisionHistoryChange}
      />
      {/* TODO: Add app specific sections here */}
      <SectionCard title="Input Section">
        {/* Placeholder */}
        <p className="text-sm text-muted-foreground">Add inputs here</p>
      </SectionCard>
    </div>
  )
}
