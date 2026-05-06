"use client"

import { useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { useFormContext, useWatch } from "react-hook-form"
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
import type { CalculationInput, HorizontalTankInput, PipeCalculationInput } from "@/types"
import {
  buildHorizontalTankSchematic,
  buildPipeSchematic,
  buildVerticalTankSchematic,
  type CircleSpec,
  type EllipseSpec,
  type FillTone,
  type HeatSchematicModel,
  type LineSpec,
  type PathSpec,
  type RectSpec,
} from "@/lib/schematics/heatSchematicModel"

const SVG_WIDTH = 420
const SVG_HEIGHT = 420
const SVG_PADDING = 34

type HeatFormValues = Partial<CalculationInput & PipeCalculationInput & HorizontalTankInput>
type SchematicMode = HeatSchematicModel["mode"]

export function SchematicCard() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { control } = useFormContext()
  const values = useWatch({ control }) as HeatFormValues

  const mode: SchematicMode = pathname.includes("/calculator/pipe")
    ? "pipe"
    : pathname.includes("/calculator/horizontal")
      ? "horizontal"
      : "tank"

  const model = useMemo(() => {
    if (mode === "pipe") {
      return buildPipeSchematic(values as PipeCalculationInput, SVG_WIDTH, SVG_HEIGHT, SVG_PADDING)
    }
    if (mode === "horizontal") {
      return buildHorizontalTankSchematic(values as HorizontalTankInput, SVG_WIDTH, SVG_HEIGHT, SVG_PADDING)
    }
    return buildVerticalTankSchematic(values as CalculationInput, SVG_WIDTH, SVG_HEIGHT, SVG_PADDING)
  }, [mode, values])

  if (!model) return null

  const renderSvg = (svgClassName: string, idSuffix: string) => (
    <svg
      viewBox={`0 0 ${model.width} ${model.height}`}
      className={svgClassName}
      role="img"
      aria-label={`${model.subtitle} schematic`}
    >
      <defs>
        <marker id={`heat-arrow-${idSuffix}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
        {model.clipPath && (
          <clipPath id={`${model.clipPath.id}-${idSuffix}`}>
            {model.clipPath.path && <path d={model.clipPath.path} />}
            {model.clipPath.rect && <rect {...rectAttrs(model.clipPath.rect)} />}
          </clipPath>
        )}
      </defs>

      <rect x="1" y="1" width={model.width - 2} height={model.height - 2} rx="16" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-10" />

      <g clipPath={model.clipPath ? `url(#${model.clipPath.id}-${idSuffix})` : undefined}>
        {model.zoneFills.paths.map((path) => <SchematicPath key={path.key} spec={path} fill />)}
        {model.zoneFills.rects.map((rect) => <SchematicRect key={rect.key} spec={rect} fill />)}
        {model.zoneFills.ellipses.map((ellipse) => <SchematicEllipse key={ellipse.key} spec={ellipse} fill />)}
        {model.zoneFills.circles.map((circle) => <SchematicCircle key={circle.key} spec={circle} fill />)}
        {model.liquidFill && <SchematicRect spec={model.liquidFill} fill />}
      </g>

      <g className="text-muted-foreground opacity-60">
        {model.guideLines.map((line) => <SchematicLine key={line.key} spec={line} />)}
      </g>

      <g className="opacity-85">
        {model.outlines.paths.map((path) => <SchematicPath key={path.key} spec={path} />)}
        {model.outlines.rects.map((rect) => <SchematicRect key={rect.key} spec={rect} />)}
        {model.outlines.ellipses.map((ellipse) => <SchematicEllipse key={ellipse.key} spec={ellipse} />)}
        {model.outlines.circles.map((circle) => <SchematicCircle key={circle.key} spec={circle} />)}
        {model.outlines.lines.map((line) => <SchematicLine key={line.key} spec={line} arrow={line.key.includes("arrow")} arrowId={`heat-arrow-${idSuffix}`} />)}
      </g>

      <g>
        {model.levels.map((level) => (
          <g key={level.key}>
            <line
              x1={level.x0}
              y1={level.y}
              x2={level.x1}
              y2={level.y}
              stroke={level.color}
              strokeWidth="2"
              strokeDasharray={level.dashed ? "5 4" : undefined}
            />
            <text
              x={level.x1 + (level.labelOffset ?? 18)}
              y={level.y - 4}
              fill={level.color}
              fontSize="11"
              textAnchor="start"
            >
              {level.label}
            </text>
          </g>
        ))}
      </g>

      <g className="text-muted-foreground">
        {model.annotations.map((annotation) => (
          <g key={annotation.key}>
            <line
              x1={annotation.x1}
              y1={annotation.y1}
              x2={annotation.x2}
              y2={annotation.y2}
              stroke="currentColor"
              strokeWidth="1.2"
              markerStart={`url(#heat-arrow-${idSuffix})`}
              markerEnd={`url(#heat-arrow-${idSuffix})`}
            />
            <AnnotationText annotation={annotation} />
          </g>
        ))}
      </g>

      <g>
        {model.labels.map((label) => (
          <text
            key={label.key}
            x={label.x}
            y={label.y}
            textAnchor={label.anchor ?? "middle"}
            fontSize={label.size ?? 12}
            fill="currentColor"
            className={toneClass(label.tone, true)}
          >
            {label.text}
          </text>
        ))}
      </g>

      <text x={model.width / 2} y="22" textAnchor="middle" fontSize="12" fill="currentColor" className="text-muted-foreground">
        {model.subtitle}
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
              {renderSvg("h-auto w-full min-w-[480px] text-foreground", "dialog")}
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="flex flex-col items-center gap-3 py-2">
        {renderSvg("w-full max-w-[340px] h-auto text-foreground", "card")}
      </div>
    </SectionCard>
  )
}

function SchematicRect({ spec, fill = false }: { spec: RectSpec; fill?: boolean }) {
  return (
    <rect
      {...rectAttrs(spec)}
      fill={fill ? "currentColor" : "none"}
      stroke={fill ? "none" : "currentColor"}
      strokeWidth={fill ? undefined : 2}
      opacity={spec.opacity}
      className={toneClass(spec.tone)}
    />
  )
}

function SchematicPath({ spec, fill = false }: { spec: PathSpec; fill?: boolean }) {
  return (
    <path
      d={spec.d}
      fill={fill ? "currentColor" : "none"}
      stroke={fill ? "none" : "currentColor"}
      strokeWidth={fill ? undefined : 2}
      strokeLinejoin="round"
      opacity={spec.opacity}
      className={toneClass(spec.tone)}
    />
  )
}

function SchematicCircle({ spec, fill = false }: { spec: CircleSpec; fill?: boolean }) {
  return (
    <circle
      cx={spec.cx}
      cy={spec.cy}
      r={spec.r}
      fill={fill ? "currentColor" : "none"}
      stroke={fill ? "none" : "currentColor"}
      strokeWidth={fill ? undefined : 2}
      opacity={spec.opacity}
      className={toneClass(spec.tone)}
    />
  )
}

function SchematicEllipse({ spec, fill = false }: { spec: EllipseSpec; fill?: boolean }) {
  return (
    <ellipse
      cx={spec.cx}
      cy={spec.cy}
      rx={spec.rx}
      ry={spec.ry}
      fill={fill ? "currentColor" : "none"}
      stroke={fill ? "none" : "currentColor"}
      strokeWidth={fill ? undefined : 2}
      opacity={spec.opacity}
      className={toneClass(spec.tone)}
    />
  )
}

function SchematicLine({ spec, arrow = false, arrowId }: { spec: LineSpec; arrow?: boolean; arrowId?: string }) {
  return (
    <line
      x1={spec.x1}
      y1={spec.y1}
      x2={spec.x2}
      y2={spec.y2}
      stroke="currentColor"
      strokeWidth={spec.strokeWidth ?? 1.2}
      strokeDasharray={spec.dashed}
      opacity={spec.opacity}
      markerEnd={arrow && arrowId ? `url(#${arrowId})` : undefined}
    />
  )
}

function AnnotationText({ annotation }: { annotation: HeatSchematicModel["annotations"][number] }) {
  const x = (annotation.x1 + annotation.x2) / 2
  const y = (annotation.y1 + annotation.y2) / 2

  if (annotation.vertical) {
    const dx = annotation.labelSide === "end" ? 13 : -13
    return (
      <text x={x + dx} y={y} textAnchor="middle" fontSize="11" fill="currentColor" transform={`rotate(-90 ${x + dx} ${y})`}>
        {annotation.label}
      </text>
    )
  }

  return (
    <text x={x} y={y - 6} textAnchor="middle" fontSize="11" fill="currentColor">
      {annotation.label}
    </text>
  )
}

function rectAttrs(rect: RectSpec) {
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    rx: rect.rx,
    ry: rect.ry,
  }
}

function toneClass(tone?: FillTone, text = false): string {
  switch (tone) {
    case "liquid":
    case "wet":
      return text ? "text-sky-600 dark:text-sky-300" : "text-sky-500"
    case "dry":
      return text ? "text-amber-700 dark:text-amber-300" : "text-amber-500"
    case "insulation":
      return text ? "text-orange-700 dark:text-orange-300" : "text-orange-400"
    case "metal":
      return text ? "text-slate-600 dark:text-slate-300" : "text-slate-400"
    case "ambient":
      return "text-muted-foreground"
    default:
      return text ? "text-muted-foreground" : ""
  }
}
