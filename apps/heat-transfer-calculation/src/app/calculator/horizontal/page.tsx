"use client"

import { useState, useMemo } from "react"
import { useForm, FormProvider, useWatch } from "react-hook-form"
import type { HorizontalTankInput, HorizontalTankResult } from "@/types"
import { HeadType } from "@/types"
import { calculateHorizontalTank } from "@/lib/calculations/horizontal-tank"
import { HorizontalInputPanel } from "./HorizontalInputPanel"
import { HorizontalResultsPanel } from "./HorizontalResultsPanel"
import Link from "next/link"

const defaults: HorizontalTankInput = {
  tag: "", description: "",
  insideDiameter: 6000, tankLength: 10000, headType: HeadType.ELLIPSOIDAL_2_1,
  flangeWidth: 200, liquidLevel: 4000,
  fluidTemp: 100, ambientTemp: 40, windSpeed: 3, groundTemp: 50,
  wallThickness: 30, wallConductivity: 45.3, insulationThickness: 300, insulationConductivity: 0.035,
  fluidDensity: 971.8, fluidSpecificHeat: 4197, fluidViscosity: 0.000355, fluidThermalConductivity: 0.67, fluidExpansionCoeff: 0.000653,
  vaporDensity: 1.127, vaporSpecificHeat: 1007, vaporViscosity: 0.00001918, vaporThermalConductivity: 0.0266, vaporExpansionCoeff: 0.00321,
  foulingDryWall: 2500, foulingWetWall: 10000, foulingDryHead: 2500, foulingWetHead: 10000,
  surfaceEmissivity: 0.02, windEnhancement: 2, groundConductivity: 1.95,
  metadata: { projectNumber: "", documentNumber: "", title: "", projectName: "", client: "" },
}

export default function HorizontalCalculatorPage() {
  const form = useForm<HorizontalTankInput>({ defaultValues: defaults, mode: "onChange" })
  const [tag, setTag] = useState(defaults.tag)
  const [desc, setDesc] = useState(defaults.description ?? "")
  const watched = useWatch({ control: form.control })

  const result = useMemo<HorizontalTankResult | null>(() => {
    if (!watched.insideDiameter || !watched.tankLength || watched.fluidTemp === undefined) return null
    try { return calculateHorizontalTank({ ...(watched as HorizontalTankInput), tag, description: desc }) }
    catch { return null }
  }, [watched, tag, desc])

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center gap-1">
            <Link href="/calculator" className="text-xs px-3 py-1 rounded hover:bg-muted text-muted-foreground transition-colors">Storage Tank</Link>
            <Link href="/calculator/pipe" className="text-xs px-3 py-1 rounded hover:bg-muted text-muted-foreground transition-colors">Pipe</Link>
            <span className="text-xs font-semibold px-3 py-1 rounded bg-primary/10 text-primary">Horizontal Tank</span>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-6">
        <FormProvider {...form}>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            <HorizontalInputPanel tag={tag} onTagChange={setTag} desc={desc} onDescChange={setDesc} />
            <HorizontalResultsPanel result={result} />
          </div>
        </FormProvider>
      </div>
    </main>
  )
}
