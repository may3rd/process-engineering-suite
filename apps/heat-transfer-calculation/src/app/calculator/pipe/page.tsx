"use client"

import { useState, useMemo } from "react"
import { useForm, FormProvider, useWatch } from "react-hook-form"
import type { PipeCalculationInput, PipeCalculationResult } from "@/types"
import { PipeType, PipeOrientation } from "@/types"
import { calculatePipe } from "@/lib/calculations/pipe"
import { PipeInputPanel } from "./PipeInputPanel"
import { PipeResultsPanel } from "./PipeResultsPanel"
import Link from "next/link"

const defaultPipeValues: PipeCalculationInput = {
  tag: "",
  description: "",
  pipeType: PipeType.CIRCULAR,
  pipeOrientation: PipeOrientation.HORIZONTAL,
  pipeLength: 20,
  insideDiameter: 154.1,          // 6" SCH 40
  outsideDiameter: 168.3,         // 6"
  flowRate: 100,                  // kg/h
  inletTemp: 100,
  ambientTemp: 36,
  windSpeed: 3,
  fluidDensity: 971.8,            // water at ~80°C
  fluidSpecificHeat: 4197,
  fluidViscosity: 0.000355,
  fluidThermalConductivity: 0.67,
  wallThickness: 7.11,            // 6" SCH 40
  wallConductivity: 45.3,         // carbon steel
  insulationThickness: 20,        // 20mm mineral wool
  insulationConductivity: 0.035,
  surfaceEmissivity: 0.12,
  windEnhancement: 1.0,
  metadata: {
    projectNumber: "",
    documentNumber: "",
    title: "",
    projectName: "",
    client: "",
  },
}

export type PipeInput = PipeCalculationInput

export default function PipeCalculator() {
  const form = useForm<PipeCalculationInput>({
    defaultValues: defaultPipeValues,
    mode: "onChange",
  })

  const [tag, setTag] = useState(defaultPipeValues.tag)
  const [description, setDescription] = useState(defaultPipeValues.description ?? "")

  const watchedValues = useWatch({ control: form.control })

  const result = useMemo<PipeCalculationResult | null>(() => {
    if (!watchedValues.pipeLength || !watchedValues.flowRate ||
        watchedValues.inletTemp === undefined || watchedValues.ambientTemp === undefined) {
      return null
    }
    try {
      const input: PipeCalculationInput = {
        ...(watchedValues as PipeCalculationInput),
        tag,
        description,
      }
      return calculatePipe(input)
    } catch {
      return null
    }
  }, [watchedValues, tag, description])

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center gap-1">
            <Link href="/calculator" className="text-xs px-3 py-1 rounded hover:bg-muted text-muted-foreground transition-colors">Storage Tank</Link>
            <span className="text-xs font-semibold px-3 py-1 rounded bg-primary/10 text-primary">Pipe</span>
            <Link href="/calculator/horizontal" className="text-xs px-3 py-1 rounded hover:bg-muted text-muted-foreground transition-colors">Horizontal Tank</Link>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-6">
        <FormProvider {...form}>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            <div>
              <PipeInputPanel
                tag={tag}
                onTagChange={setTag}
                description={description}
                onDescriptionChange={setDescription}
              />
            </div>
            <div>
              <PipeResultsPanel result={result} />
            </div>
          </div>
        </FormProvider>
      </div>
    </main>
  )
}
