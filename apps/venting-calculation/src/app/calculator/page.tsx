"use client"

import { useState } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { calculationInputSchema } from "@/lib/validation/inputSchema"
import { useCalculation } from "@/lib/hooks/useCalculation"
import type { CalculationInput } from "@/types"
import { TankConfiguration } from "@/types"
import type { Resolver } from "react-hook-form"
import { InputPanel } from "./components/InputPanel"
import { ResultsPanel } from "./components/ResultsPanel"
import { ExportButton } from "./components/ExportButton"
import { LinkTankButton } from "./components/LinkTankButton"
import { SaveCalculationButton } from "./components/SaveCalculationButton"
import { LoadCalculationButton } from "./components/LoadCalculationButton"

// ─── Default form values ───────────────────────────────────────────────────────
// Required enum fields must have valid defaults; numeric fields start empty.

const DEFAULT_VALUES = {
  tankNumber: "",
  description: "",
  tankConfiguration: TankConfiguration.BARE_METAL,
  flashBoilingPointType: "FP" as const,
  incomingStreams: [] as CalculationInput["incomingStreams"],
  outgoingStreams: [] as CalculationInput["outgoingStreams"],
  apiEdition: "7TH" as const,
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalculatorPage() {
  const form = useForm<CalculationInput>({
    // Cast required because zodResolver infers stream array inputs as possibly
    // undefined (due to .default([])) which differs from CalculationInput's
    // required Stream[] — behaviour is correct at runtime.
    resolver: zodResolver(calculationInputSchema) as Resolver<CalculationInput>,
    defaultValues: DEFAULT_VALUES,
    mode: "onChange",
  })

  // Wire form → store (derived geometry + debounced API call)
  useCalculation(form.control)

  // Track which equipment tank (if any) the user has linked to this calculation.
  // Populated by LinkTankButton and restored when loading a saved calculation.
  const [linkedEquipmentId, setLinkedEquipmentId] = useState<string | null>(null)

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
              <div className="flex items-center gap-2">
                <LinkTankButton onTankLinked={setLinkedEquipmentId} />
                <LoadCalculationButton onTankLinked={setLinkedEquipmentId} />
                <SaveCalculationButton equipmentId={linkedEquipmentId} />
                <ExportButton />
              </div>
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {/* Left — Inputs */}
            <div>
              <InputPanel />
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
