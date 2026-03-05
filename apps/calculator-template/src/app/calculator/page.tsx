"use client"

import { useState } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { calculationInputSchema } from "@/lib/validation/inputSchema"
import type { CalculationInput, CalculationMetadata, RevisionRecord, CalculationResult } from "@/types"
import type { Resolver } from "react-hook-form"
import { InputPanel } from "./components/InputPanel"
import { ResultsPanel } from "./components/ResultsPanel"
import { ActionMenu } from "./components/ActionMenu"
import { useCalculation } from "@/lib/hooks/useCalculation"

// ─── Default form values ───────────────────────────────────────────────────────

const createDefaultValues = (): Partial<CalculationInput> => ({
  tag: "",
  description: "",
  pressure: undefined,
  temperature: undefined,
  length: undefined,
  flowrate: undefined,
  category: "A",
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
  const form = useForm<CalculationInput>({
    resolver: zodResolver(calculationInputSchema) as Resolver<CalculationInput>,
    defaultValues: createDefaultValues() as any, 
    mode: "onChange",
  })

  // Wire form -> reactive hook
  const { calculationResult } = useCalculation(form.control)
  
  // State for metadata and revisions
  const [calculationMetadata, setCalculationMetadata] = useState<CalculationMetadata>(EMPTY_METADATA)
  const [revisionHistory, setRevisionHistory] = useState<RevisionRecord[]>([])
  const [clearToken, setClearToken] = useState(0)

  const handleClear = () => {
    form.reset(createDefaultValues() as any, { keepDefaultValues: false })
    form.clearErrors()
    setCalculationMetadata(EMPTY_METADATA)
    setRevisionHistory([])
    setClearToken((value) => value + 1)
  }

  return (
    <FormProvider {...form}>
      <main className="min-h-screen bg-background">
        {/* top bar action container */}
        <div className="border-b bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-lg font-semibold">Calculation App Title</h1>
                <p className="text-sm text-muted-foreground">Subtitle or calculation standard reference</p>
              </div>
              <ActionMenu
                onClear={handleClear}
                calculationMetadata={calculationMetadata}
                revisionHistory={revisionHistory}
                onCalculationLoaded={(metadata, loadedRevisionHistory) => {
                  setCalculationMetadata(metadata)
                  setRevisionHistory(loadedRevisionHistory)
                }}
                calculationResult={calculationResult}
              />
            </div>
          </div>
        </div>

        {/* two-column grid */}
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {/* left panel (inputs) */}
            <div>
              <InputPanel
                metadata={calculationMetadata}
                onMetadataChange={setCalculationMetadata}
                revisionHistory={revisionHistory}
                onRevisionHistoryChange={setRevisionHistory}
              />
            </div>

            {/* right panel (results) */}
            <div>
              <ResultsPanel
                calculationResult={calculationResult}
              />
            </div>
          </div>
        </div>
      </main>
    </FormProvider>
  )
}
