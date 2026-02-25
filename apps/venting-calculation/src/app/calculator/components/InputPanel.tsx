"use client"

import { TankDetailSection } from "../sections/TankDetailSection"
import { FluidPropertiesSection } from "../sections/FluidPropertiesSection"
import { StreamFlowSection } from "../sections/StreamFlowSection"
import { DrainSystemSection } from "../sections/DrainSystemSection"
import { ApiEditionSelector } from "../sections/ApiEditionSelector"
import { DerivedGeometry } from "./DerivedGeometry"
import { SectionCard } from "./SectionCard"
import { CalculationMetadataSection } from "./CalculationMetadataSection"
import type { CalculationMetadata, RevisionRecord } from "@/types"

interface Props {
  metadata: CalculationMetadata
  onMetadataChange: (metadata: CalculationMetadata) => void
  revisionHistory: RevisionRecord[]
  onRevisionHistoryChange: (revisionHistory: RevisionRecord[]) => void
}

export function InputPanel({
  metadata,
  onMetadataChange,
  revisionHistory,
  onRevisionHistoryChange,
}: Props) {
  return (
    <div className="space-y-4">
      <CalculationMetadataSection
        metadata={metadata}
        onMetadataChange={onMetadataChange}
        revisionHistory={revisionHistory}
        onRevisionHistoryChange={onRevisionHistoryChange}
      />
      <TankDetailSection />
      <DerivedGeometry />
      <FluidPropertiesSection />
      <StreamFlowSection />
      <DrainSystemSection />
      <SectionCard title="Calculation Standard">
        <ApiEditionSelector />
      </SectionCard>
    </div>
  )
}
