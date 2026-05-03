"use client"

import { useState } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { calculationInputSchema } from "@/lib/validation/inputSchema"
import { useCalculation } from "@/lib/hooks/useCalculation"
import type { CalculationInput, CalculationMetadata, RevisionRecord } from "@/types"
import type { Resolver } from "react-hook-form"
import { InputPanel } from "./components/InputPanel"
import { ResultsPanel } from "./components/ResultsPanel"
import { ActionMenu } from "./components/ActionMenu"
import Link from "next/link"

const createDefaultValues = (): Partial<CalculationInput> => ({
  tag: "",
  description: "",
  tankDiameter: 10000,            // 10 m diameter
  tankHeight: 12000,              // 12 m height
  liquidLevel: 10000,             // 10 m liquid
  fluidTemp: 80,
  ambientTemp: 30,
  windSpeed: 5,
  wallThickness: 10,              // 10 mm steel
  wallConductivity: 45,           // carbon steel
  insulationThickness: 50,        // 50 mm mineral wool
  insulationConductivity: 0.04,   // mineral wool
  fluidDensity: 1000,             // water
  fluidSpecificHeat: 4180,        // water
  fluidViscosity: 0.001,          // water at 20°C
  fluidThermalConductivity: 0.6,  // water
  fluidExpansionCoeff: 2.1e-4,    // water
  // Vapor defaults (air at ~80°C)
  vaporDensity: 1.0,
  vaporSpecificHeat: 1009,
  vaporViscosity: 2.1e-5,
  vaporThermalConductivity: 0.03,
  vaporExpansionCoeff: 3.0e-3,
  // Ground defaults
  groundTemp: 25,
  groundConductivity: 1.3846,     // concrete
  // Fouling defaults (effectively negligible)
  foulingDryWall: 5678,
  foulingWetWall: 4543,
  foulingRoof: 5678,
  foulingFloor: 2839,
  // Wind
  windEnhancement: 1.0,
  // Surface
  surfaceEmissivity: 0.85,
  roofEmissivity: 0.85,
})

const EMPTY_METADATA: CalculationMetadata = {
  projectNumber: "",
  documentNumber: "",
  title: "",
  projectName: "",
  client: "",
}

export default function CalculatorPage() {
  const form = useForm<CalculationInput>({
    resolver: zodResolver(calculationInputSchema) as Resolver<CalculationInput>,
    defaultValues: createDefaultValues() as unknown as CalculationInput,
    mode: "onChange",
  })

  const { calculationResult } = useCalculation(form.control)

  const [calculationMetadata, setCalculationMetadata] = useState<CalculationMetadata>(EMPTY_METADATA)
  const [revisionHistory, setRevisionHistory] = useState<RevisionRecord[]>([])
  const [clearToken, setClearToken] = useState(0)

  const handleClear = () => {
    form.reset(createDefaultValues() as unknown as CalculationInput, { keepDefaultValues: false })
    form.clearErrors()
    setCalculationMetadata(EMPTY_METADATA)
    setRevisionHistory([])
    setClearToken((value) => value + 1)
  }

  return (
    <FormProvider {...form}>
      <main className="min-h-screen bg-background">
        {/* Secondary action bar with tabs */}
        <div className="border-b bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold px-3 py-1 rounded bg-primary/10 text-primary">Storage Tank</span>
                <Link href="/calculator/pipe" className="text-xs px-3 py-1 rounded hover:bg-muted text-muted-foreground transition-colors">Pipe</Link>
                <Link href="/calculator/horizontal" className="text-xs px-3 py-1 rounded hover:bg-muted text-muted-foreground transition-colors">Horizontal Tank</Link>
              </div>
              <p className="text-sm text-muted-foreground">
                Heat Loss Calculator · Storage Tank
              </p>
              <ActionMenu
                onTankLinked={() => {}}
                linkedTag={null}
                linkedEquipmentId={null}
                clearToken={clearToken}
                onClear={handleClear}
                calculationMetadata={calculationMetadata}
                revisionHistory={revisionHistory}
                onCalculationLoaded={(metadata, loadedRevisionHistory) => {
                  setCalculationMetadata(metadata)
                  setRevisionHistory(loadedRevisionHistory)
                }}
                calculationResult={calculationResult}
                derivedGeometry={null}
              />
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            <div>
              <InputPanel
                metadata={calculationMetadata}
                onMetadataChange={setCalculationMetadata}
                revisionHistory={revisionHistory}
                onRevisionHistoryChange={setRevisionHistory}
              />
            </div>

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
