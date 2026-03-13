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
import { SectionCard } from "./SectionCard"
import { cn } from "@/lib/utils"
import type { CalculationInput } from "@/types"
import { TankRoofType, TankType } from "@/types"
import {
  buildTankSchematicModel,
  type TankSchematicAnnotation,
  type TankSchematicLevel,
} from "@/lib/schematics/tankSchematicModel"

interface TankSchematicProps {
  showExpandAction?: boolean
}

export function TankSchematic({ showExpandAction = true }: TankSchematicProps) {
  const { watch } = useFormContext<CalculationInput>()
  const values = watch()
  const tankType = values.tankType

  const [isOpen, setIsOpen] = useState(false)

  if (!tankType) {
    return null
  }

  const model = buildTankSchematicModel({
    input: values,
    width: tankType === TankType.SPHERICAL ? 620 : 600,
    height: tankType === TankType.SPHERICAL ? 380 : 420,
    padding: tankType === TankType.SPHERICAL ? 40 : 48,
  })

  if (!model) {
    return null
  }

  const renderSvg = (svgClassName: string) => (
    <svg viewBox={`0 0 ${model.width} ${model.height}`} className={svgClassName} aria-hidden="true">
      <defs>
        <clipPath id={model.clipPath.id}>
          {model.clipPath.path && <path d={model.clipPath.path} />}
          {model.clipPath.circle && (
            <circle
              cx={model.clipPath.circle.cx}
              cy={model.clipPath.circle.cy}
              r={model.clipPath.circle.r}
            />
          )}
        </clipPath>
        <marker id="tankArrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
      </defs>
      {model.liquidFill && (
        <rect
          x={model.liquidFill.x}
          y={model.liquidFill.y}
          width={model.liquidFill.width}
          height={model.liquidFill.height}
          fill="rgba(56, 189, 248, 0.25)"
          clipPath={`url(#${model.clipPath.id})`}
        />
      )}
      {model.outlines.paths.map((outline) => (
        <path key={outline.key} d={outline.d} fill="none" stroke="currentColor" strokeWidth="2" />
      ))}
      {model.outlines.rects.map((outline) => (
        <rect
          key={outline.key}
          x={outline.x}
          y={outline.y}
          width={outline.width}
          height={outline.height}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      ))}
      {model.outlines.circles.map((outline) => (
        <circle
          key={outline.key}
          cx={outline.cx}
          cy={outline.cy}
          r={outline.r}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      ))}
      {model.outlines.lines.map((outline) => (
        <line
          key={outline.key}
          x1={outline.x1}
          y1={outline.y1}
          x2={outline.x2}
          y2={outline.y2}
          stroke="currentColor"
          strokeWidth={outline.strokeWidth ?? 2}
          strokeDasharray={outline.dashed ?? "none"}
          opacity={outline.opacity}
        />
      ))}
      {model.levels.map((level) => (
        <TankLevelLine key={level.key} level={level} />
      ))}
      {model.guideLines.map((guideLine) => (
        <line
          key={guideLine.key}
          x1={guideLine.x1}
          y1={guideLine.y1}
          x2={guideLine.x2}
          y2={guideLine.y2}
          stroke="currentColor"
          strokeWidth={guideLine.strokeWidth ?? 0.75}
          opacity={guideLine.opacity ?? 0.7}
        />
      ))}
      {model.annotations.map((annotation) => (
        <TankAnnotation key={annotation.key} annotation={annotation} />
      ))}
    </svg>
  )

  return (
    <SectionCard
      title="Tank Schematic"
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
              <DialogTitle>Expanded Tank Schematic</DialogTitle>
              <DialogDescription>
                Larger view of the live tank schematic.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto rounded-xl border bg-card/40 p-3">
              {renderSvg(`h-auto w-full ${tankType === TankType.SPHERICAL ? "min-w-[620px]" : "min-w-[680px]"} text-foreground`)}
            </div>
            </DialogContent>
          </Dialog>
      ) : undefined}
    >
      <div className="flex flex-col items-center gap-4 py-2">
        {renderSvg(`w-full ${tankType === TankType.SPHERICAL ? "max-w-[440px]" : "max-w-[460px]"} h-auto text-foreground`)}
        {model.legend.showLiquid && (
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-sky-400/25 border border-sky-400/50 rounded-sm" />
              <span>Liquid</span>
            </div>
            {model.legend.showLegs && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 border border-current rounded-sm" />
                <span>Legs</span>
              </div>
            )}
            {model.legend.showGround && (
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0 border-t border-dashed border-current" />
                <span>Ground</span>
              </div>
            )}
          </div>
        )}
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {model.subtitle}
        </p>
      </div>
    </SectionCard>
  )
}

function TankLevelLine({ level }: { level: TankSchematicLevel }) {
  return (
    <g>
      <line
        x1={level.x0 - 12}
        y1={level.y}
        x2={level.x1 + 12}
        y2={level.y}
        stroke={level.color}
        strokeWidth="1.5"
        strokeDasharray={level.dashed ? "4 2" : "none"}
      />
      <text
        x={level.x1 + level.labelOffset}
        y={level.y}
        dy="0.35em"
        fill={level.color}
        fontSize="11"
        fontWeight="bold"
        className={cn("tracking-wide")}
      >
        {level.label}
      </text>
    </g>
  )
}

function TankAnnotation({ annotation }: { annotation: TankSchematicAnnotation }) {
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
        markerStart="url(#tankArrow)"
        markerEnd="url(#tankArrow)"
      />
      <text
        x={textX}
        y={cy}
        dy={annotation.vertical ? "0.32em" : "-6"}
        textAnchor={annotation.vertical ? (annotation.labelSide === "start" ? "end" : "start") : "middle"}
        fontSize="10"
        fill="currentColor"
        className={cn("tracking-wide")}
      >
        {annotation.label}
      </text>
    </g>
  )
}
