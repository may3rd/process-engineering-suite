"use client"

/**
 * SchematicCard — template for an SVG schematic with a "View larger" dialog.
 *
 * Usage:
 *  1. Replace the placeholder SVG inside `renderSvg` with your actual drawing.
 *  2. Compute geometry variables from `useFormContext` above `renderSvg`.
 *  3. Keep `useState(false)` BEFORE any early `return null` guards (React rules).
 *  4. Rename the component and dialog title to match your app.
 */

import { useState } from "react"
import { Expand } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { SectionCard } from "./SectionCard"

export function SchematicCard() {
  const [isOpen, setIsOpen] = useState(false)

  // TODO: read form values and compute geometry here, e.g.:
  // const { watch } = useFormContext<CalculationInput>()
  // const diameter = watch("insideDiameter")
  // if (!diameter || diameter <= 0) return null

  const renderSvg = (svgClassName: string) => (
    <svg
      viewBox="0 0 420 420"
      className={svgClassName}
      aria-hidden="true"
    >
      {/* TODO: replace with real schematic geometry */}
      <rect x="110" y="80" width="200" height="260" rx="8"
        fill="none" stroke="currentColor" strokeWidth="2" className="opacity-80" />
      <text x="210" y="220" textAnchor="middle" fontSize="12"
        fill="currentColor" className="text-muted-foreground">
        Schematic placeholder
      </text>
    </svg>
  )

  return (
    <SectionCard
      title="System Schematic"
      action={
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" aria-label="Open larger schematic">
              <Expand />
              View larger
            </Button>
          </DialogTrigger>
          <DialogContent className="grid h-[78vh] w-[88vw] max-w-[88vw] grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-4 sm:h-[82vh] sm:w-[84vw] sm:max-w-[84vw] xl:w-[1240px] xl:max-w-[1240px]">
            <DialogHeader>
              <DialogTitle>Expanded System Schematic</DialogTitle>
              <DialogDescription>
                Larger view of the live system schematic.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto rounded-xl border bg-card/40 p-3">
              {renderSvg("h-auto w-full min-w-[480px] text-foreground")}
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="flex flex-col items-center gap-3 py-2">
        {renderSvg("w-full max-w-[340px] h-auto text-foreground")}
      </div>
    </SectionCard>
  )
}
