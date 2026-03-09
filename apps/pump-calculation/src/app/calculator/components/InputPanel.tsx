"use client"

import { CalculationMetadataSection } from "./CalculationMetadataSection"
import { PumpDetailsSection } from "@/app/calculator/sections/PumpDetailsSection"
import { FluidSection } from "@/app/calculator/sections/FluidSection"
import { SuctionSection } from "@/app/calculator/sections/SuctionSection"
import { DischargeSection } from "@/app/calculator/sections/DischargeSection"
import { MotorSection } from "@/app/calculator/sections/MotorSection"
import { NpshaSection } from "@/app/calculator/sections/NpshaSection"
import { OrificeSection } from "@/app/calculator/sections/OrificeSection"
import { ControlValveSection } from "@/app/calculator/sections/ControlValveSection"
import { MinFlowSection } from "@/app/calculator/sections/MinFlowSection"
import { ShutoffSection } from "@/app/calculator/sections/ShutoffSection"
import type { CalculationMetadata, RevisionRecord, PumpCalculationResult } from "@/types"

interface Props {
  metadata: CalculationMetadata
  onMetadataChange: (metadata: CalculationMetadata) => void
  revisionHistory: RevisionRecord[]
  onRevisionHistoryChange: (revisionHistory: RevisionRecord[]) => void
  result: PumpCalculationResult | null
}

export function InputPanel({
  metadata,
  onMetadataChange,
  revisionHistory,
  onRevisionHistoryChange,
  result,
}: Props) {
  return (
    <div className="space-y-4">
      <CalculationMetadataSection
        metadata={metadata}
        onMetadataChange={onMetadataChange}
        revisionHistory={revisionHistory}
        onRevisionHistoryChange={onRevisionHistoryChange}
      />
      <PumpDetailsSection />
      <FluidSection />
      <SuctionSection />
      <DischargeSection />
      <MotorSection />
      <NpshaSection result={result} />
      <OrificeSection />
      <ControlValveSection />
      <MinFlowSection />
      <ShutoffSection />
    </div>
  )
}
