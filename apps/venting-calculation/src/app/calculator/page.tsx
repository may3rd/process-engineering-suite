"use client"

import { useState } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { calculationInputSchema } from "@/lib/validation/inputSchema"
import { useCalculation } from "@/lib/hooks/useCalculation"
import { useCalculatorStore } from "@/lib/store/calculatorStore"
import type { CalculationInput, CalculationMetadata, RevisionRecord } from "@/types"
import { TankConfiguration } from "@/types"
import type { Resolver } from "react-hook-form"
import { InputPanel } from "./components/InputPanel"
import { ResultsPanel } from "./components/ResultsPanel"
import { ActionMenu } from "./components/ActionMenu"

// ─── Default form values ───────────────────────────────────────────────────────
// Numeric fields default to "" (empty string) so <input type="number"> clears
// visually on reset. With valueAsNumber: true, "" → NaN, which Zod's
// nanOptionalPositive helper already converts to undefined.
// Using undefined instead would leave the browser input showing its old value.
const NUMERIC = "" as unknown as number

const createDefaultValues = () => ({
  tankNumber: "",
  description: "",
  diameter: NUMERIC,
  height: NUMERIC,
  latitude: NUMERIC,
  designPressure: NUMERIC,
  tankConfiguration: TankConfiguration.BARE_METAL,
  insulationThickness: NUMERIC,
  insulationConductivity: NUMERIC,
  insideHeatTransferCoeff: NUMERIC,
  insulatedSurfaceArea: NUMERIC,
  avgStorageTemp: NUMERIC,
  vapourPressure: NUMERIC,
  flashBoilingPointType: "FP" as const,
  flashBoilingPoint: NUMERIC,
  latentHeat: NUMERIC,
  relievingTemperature: NUMERIC,
  molecularMass: NUMERIC,
  incomingStreams: [] as CalculationInput["incomingStreams"],
  outgoingStreams: [] as CalculationInput["outgoingStreams"],
  drainLineSize: NUMERIC,
  maxHeightAboveDrain: NUMERIC,
  apiEdition: "7TH" as const,
})

const EMPTY_METADATA: CalculationMetadata = {
  projectNumber: "",
  documentNumber: "",
  title: "",
  projectName: "",
  client: "",
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalculatorPage() {
  const resetCalculationStore = useCalculatorStore((state) => state.reset)
  const form = useForm<CalculationInput>({
    // Cast required because zodResolver infers stream array inputs as possibly
    // undefined (due to .default([])) which differs from CalculationInput's
    // required Stream[] — behaviour is correct at runtime.
    resolver: zodResolver(calculationInputSchema) as Resolver<CalculationInput>,
    defaultValues: createDefaultValues(),
    mode: "onChange",
  })

  // Wire form → store (derived geometry + debounced API call)
  useCalculation(form.control)

  // Track which equipment tank (if any) the user has linked to this calculation.
  // Populated by LinkTankButton and restored when loading a saved calculation.
  const [linkedEquipmentId, setLinkedEquipmentId] = useState<string | null>(null)
  const [linkedTankTag, setLinkedTankTag] = useState<string | null>(null)
  const [calculationMetadata, setCalculationMetadata] = useState<CalculationMetadata>(EMPTY_METADATA)
  const [revisionHistory, setRevisionHistory] = useState<RevisionRecord[]>([])
  const [clearToken, setClearToken] = useState(0)

  const handleTankLinked = (equipmentId: string | null, tankTag: string | null = null) => {
    setLinkedEquipmentId(equipmentId)
    setLinkedTankTag(equipmentId ? (tankTag ?? "Linked Tank") : null)
  }

  const handleClear = () => {
    form.reset(createDefaultValues(), { keepDefaultValues: false })
    form.clearErrors()
    resetCalculationStore()
    handleTankLinked(null, null)
    setCalculationMetadata(EMPTY_METADATA)
    setRevisionHistory([])
    setClearToken((value) => value + 1)
  }

  return (
    // FormProvider wraps the entire page so ExportButton (in the header)
    // can access form values via useFormContext.
    <FormProvider {...form}>
      <main className="min-h-screen bg-background">
        {/* Secondary action bar */}
        <div className="border-b bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                API 2000 (5th / 6th / 7th Edition)
              </p>
              <ActionMenu
                onTankLinked={handleTankLinked}
                linkedTag={linkedTankTag}
                linkedEquipmentId={linkedEquipmentId}
                clearToken={clearToken}
                onClear={handleClear}
                calculationMetadata={calculationMetadata}
                revisionHistory={revisionHistory}
                onCalculationLoaded={(metadata, loadedRevisionHistory) => {
                  setCalculationMetadata(metadata)
                  setRevisionHistory(loadedRevisionHistory)
                }}
              />
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {/* Left — Inputs */}
            <div>
              <InputPanel
                metadata={calculationMetadata}
                onMetadataChange={setCalculationMetadata}
                revisionHistory={revisionHistory}
                onRevisionHistoryChange={setRevisionHistory}
              />
            </div>

            {/* Right — Results */}
            <div>
              <ResultsPanel />
            </div>
          </div>
        </div>
      </main>
    </FormProvider>
  )
}
