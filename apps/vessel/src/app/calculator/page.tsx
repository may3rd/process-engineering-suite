"use client"

import { useState, useMemo } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { Resolver } from "react-hook-form"
import { calculationInputSchema } from "@/lib/validation/inputSchema"
import { computeVesselResult } from "@/lib/calculations"
import { VesselOrientation, HeadType } from "@/types"
import type { CalculationInput, CalculationMetadata, RevisionRecord, CalculationResult } from "@/types"
import { InputPanel } from "./components/InputPanel"
import { ResultsPanel } from "./components/ResultsPanel"
import { ActionMenu } from "./components/ActionMenu"

const EMPTY_METADATA: CalculationMetadata = {
  projectNumber: "",
  documentNumber: "",
  title: "",
  projectName: "",
  client: "",
}

const createDefaultValues = (): Partial<CalculationInput> => ({
  tag: "",
  description: "",
  orientation: VesselOrientation.VERTICAL,
  headType: HeadType.ELLIPSOIDAL_2_1,
  insideDiameter: undefined,
  shellLength: undefined,
  wallThickness: undefined,
  headDepth: undefined,
  liquidLevel: undefined,
  hll: undefined,
  lll: undefined,
  ofl: undefined,
  density: undefined,
  flowrate: undefined,
  metadata: EMPTY_METADATA,
})

export default function VesselCalculatorPage() {
  const form = useForm<CalculationInput>({
    resolver: zodResolver(calculationInputSchema) as Resolver<CalculationInput>,
    defaultValues: createDefaultValues() as any,
    mode: "onChange",
  })

  const [metadata, setMetadata] = useState<CalculationMetadata>(EMPTY_METADATA)
  const [revisionHistory, setRevisionHistory] = useState<RevisionRecord[]>([])

  const watchedValues = form.watch()

  const calculationResult = useMemo<CalculationResult | null>(() => {
    try {
      const parsed = calculationInputSchema.safeParse(watchedValues)
      if (!parsed.success) return null
      return computeVesselResult(parsed.data as CalculationInput)
    } catch {
      return null
    }
  }, [watchedValues])

  const handleClear = () => {
    form.reset(createDefaultValues() as any, { keepDefaultValues: false })
    form.clearErrors()
    setMetadata(EMPTY_METADATA)
    setRevisionHistory([])
  }

  return (
    <FormProvider {...form}>
      <main className="min-h-screen bg-background">
        {/* Top bar */}
        <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-lg font-semibold">Vessel Calculator</h1>
                <p className="text-sm text-muted-foreground">
                  Volume &amp; Surface Area · Pressure Vessels &amp; Tanks
                </p>
              </div>
              <ActionMenu
                onClear={handleClear}
                calculationMetadata={metadata}
                revisionHistory={revisionHistory}
                onCalculationLoaded={(m, r) => { setMetadata(m); setRevisionHistory(r) }}
                calculationResult={calculationResult}
              />
            </div>
          </div>
        </div>

        {/* Two-column grid */}
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            <InputPanel />
            <ResultsPanel calculationResult={calculationResult} />
          </div>
        </div>
      </main>
    </FormProvider>
  )
}
