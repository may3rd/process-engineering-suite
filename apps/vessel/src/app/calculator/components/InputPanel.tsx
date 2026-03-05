"use client"

import { VesselDetailsSection } from "../sections/VesselDetailsSection"
import { GeometrySection } from "../sections/GeometrySection"
import { LevelsSection } from "../sections/LevelsSection"
import { FluidSection } from "../sections/FluidSection"
import { MetadataSection } from "../sections/MetadataSection"

export function InputPanel() {
  return (
    <div className="space-y-4">
      <VesselDetailsSection />
      <GeometrySection />
      <LevelsSection />
      <FluidSection />
      <MetadataSection />
    </div>
  )
}
