"use client"

import { useState } from "react"
import { Expand } from "lucide-react"
import { useFormContext } from "react-hook-form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { buildVesselSchematicModel, type VesselSchematicAnnotation, type VesselSchematicLevel } from "@/lib/schematics/vesselSchematicModel"
import { CalculationInput, EquipmentMode } from "@/types"
import { SectionCard } from "./SectionCard"

interface VesselSchematicProps {
  showExpandAction?: boolean
}

export function VesselSchematic({ showExpandAction = true }: VesselSchematicProps) {
  const { watch } = useFormContext<CalculationInput>()
  const values = watch()
  const equipmentMode = values.equipmentMode ?? EquipmentMode.VESSEL

  const [isOpen, setIsOpen] = useState(false)

  const model = buildVesselSchematicModel({
    input: values,
    width: 520,
    height: 420,
    padding: 48,
  })

  if (equipmentMode === EquipmentMode.TANK || !model) {
    return null
  }

  const renderSvg = (svgClassName: string) => (
    <svg
      viewBox={`0 0 ${model.width} ${model.height}`}
      className={svgClassName}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={model.clipPaths.vesselId}>
          <path d={model.vesselPath} />
        </clipPath>
        {model.bootPath && model.clipPaths.bootId && (
          <clipPath id={model.clipPaths.bootId}>
            <path d={model.bootPath} />
          </clipPath>
        )}
        <marker id="vesselArrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
      </defs>

      {model.fills.vessel && (
        <rect
          x={model.fills.vessel.x}
          y={model.fills.vessel.y}
          width={model.fills.vessel.width}
          height={model.fills.vessel.height}
          fill="rgba(56, 189, 248, 0.25)"
          clipPath={`url(#${model.clipPaths.vesselId})`}
        />
      )}

      {model.breakMarker && (
        <g>
          <rect
            x={model.breakMarker.background.x}
            y={model.breakMarker.background.y}
            width={model.breakMarker.background.width}
            height={model.breakMarker.background.height}
            fill="var(--background)"
          />
          {model.breakMarker.wallSegments.map((segment) => (
            <line
              key={segment.key}
              x1={segment.x1}
              y1={segment.y1}
              x2={segment.x2}
              y2={segment.y2}
              stroke="currentColor"
              strokeWidth="2"
              className="opacity-90"
            />
          ))}
          {model.breakMarker.zigzags.map((segment) => (
            <path
              key={segment.key}
              d={segment.d}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-90"
            />
          ))}
        </g>
      )}

      {model.fills.boot && model.clipPaths.bootId && (
        <rect
          x={model.fills.boot.x}
          y={model.fills.boot.y}
          width={model.fills.boot.width}
          height={model.fills.boot.height}
          fill="rgba(56, 189, 248, 0.25)"
          clipPath={`url(#${model.clipPaths.bootId})`}
        />
      )}

      {model.outlines.map((outline) => (
        <path
          key={outline.key}
          d={outline.d}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-90"
        />
      ))}

      {model.legs.map((leg) => (
        <line key={leg.key} x1={leg.x1} y1={leg.y1} x2={leg.x2} y2={leg.y2} stroke="currentColor" strokeWidth="2" />
      ))}

      <line
        x1={model.groundLine.x1}
        y1={model.groundLine.y1}
        x2={model.groundLine.x2}
        y2={model.groundLine.y2}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        opacity="0.8"
      />

      {model.levels.map((level) => (
        <LevelLine key={level.key} level={level} />
      ))}

      <g className="text-muted-foreground/70">
        {model.guideLines.map((guideLine) => (
          <line
            key={guideLine.key}
            x1={guideLine.x1}
            y1={guideLine.y1}
            x2={guideLine.x2}
            y2={guideLine.y2}
            stroke="currentColor"
            strokeWidth="0.75"
          />
        ))}
        {model.annotations.map((annotation) => (
          <Annotation key={annotation.key} annotation={annotation} />
        ))}
      </g>
    </svg>
  )

  return (
    <SectionCard
      title="Vessel Schematic"
      action={showExpandAction ? (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" aria-label="Open larger schematic">
              <Expand />
              View larger
            </Button>
          </DialogTrigger>
          <DialogContent className="grid h-[78vh] w-[88vw] max-w-[88vw] grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-4 sm:h-[82vh] sm:w-[84vw] sm:max-w-[84vw] xl:w-[1240px] xl:max-w-[1240px]">
            <DialogHeader>
              <DialogTitle>Expanded Vessel Schematic</DialogTitle>
              <DialogDescription>
                Larger view of the live vessel schematic.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto rounded-xl border bg-card/40 p-3">
              {renderSvg("h-auto w-full min-w-[680px] text-foreground")}
            </div>
          </DialogContent>
        </Dialog>
      ) : undefined}
    >
      <div className="flex flex-col items-center gap-4 py-2">
        {renderSvg("w-full max-w-[460px] h-auto text-foreground")}

        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-sky-400/25 border border-sky-400/50 rounded-sm" />
            <span>Liquid</span>
          </div>
          {model.showLegs && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 border border-current rounded-sm" />
              <span>Legs</span>
            </div>
          )}
          {model.hasBoot && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 border-2 border-current rounded-sm" />
              <span>Boot</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0 border-t border-dashed border-current" />
            <span>Ground</span>
          </div>
          {model.legend.showHll && <LegendLineItem label="HLL" color="#22c55e" />}
          {model.legend.showLll && <LegendLineItem label="LLL" color="#f59e0b" />}
          {model.legend.showOfl && <LegendLineItem label="OFL" color="#ef4444" />}
        </div>
      </div>
    </SectionCard>
  )
}

function LegendLineItem({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-4 h-0 border-t border-dashed" style={{ borderColor: color }} />
      <span>{label}</span>
    </div>
  )
}

function LevelLine({ level }: { level: VesselSchematicLevel }) {
  return (
    <g>
      <line
        x1={level.lineX1}
        y1={level.y}
        x2={level.lineX2}
        y2={level.y}
        stroke={level.color}
        strokeWidth="1.5"
        strokeDasharray={level.dashed ? "4 2" : "none"}
      />
      <text
        x={level.textX}
        y={level.textY}
        fill={level.color}
        fontSize="11"
        fontWeight="bold"
      >
        {level.label}
      </text>
    </g>
  )
}

function Annotation({ annotation }: { annotation: VesselSchematicAnnotation }) {
  const cx = (annotation.x1 + annotation.x2) / 2
  const cy = (annotation.y1 + annotation.y2) / 2
  const verticalTextOffset = 8
  const textX = annotation.vertical
    ? cx + (annotation.labelSide === "start" ? -verticalTextOffset : verticalTextOffset)
    : cx

  return (
    <g className="text-muted-foreground/70">
      <line
        x1={annotation.x1}
        y1={annotation.y1}
        x2={annotation.x2}
        y2={annotation.y2}
        stroke="currentColor"
        strokeWidth="1"
        markerStart="url(#vesselArrow)"
        markerEnd="url(#vesselArrow)"
      />
      <text
        x={textX}
        y={cy}
        dy={annotation.vertical ? "0.32em" : "-6"}
        textAnchor={annotation.vertical ? (annotation.labelSide === "start" ? "end" : "start") : "middle"}
        fontSize="10"
        fill="currentColor"
      >
        {annotation.label}
      </text>
    </g>
  )
}
