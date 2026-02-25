"use client"

import { useState } from "react"
import { useFormContext } from "react-hook-form"
import { Link2, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { apiClient } from "@/lib/apiClient"
import type { CalculationInput } from "@/types"
import type { components } from "@eng-suite/types"

type Equipment = components["schemas"]["EquipmentResponse"]

interface Props {
  /** Called when the user selects a tank — receives the equipment.id. */
  onTankLinked: (equipmentId: string) => void
}

/**
 * Button that opens a dialog listing tanks from the equipment register.
 * On selection it populates tank geometry fields in the venting calculation
 * form and fires `onTankLinked` so the parent can persist the link on save.
 *
 * Field mapping (equipment_tanks → venting form):
 *   details.innerDiameter    → diameter (mm, direct)
 *   details.height           → height   (mm, direct)
 *   details.insulationThickness → insulationThickness (mm, when insulated)
 *   designPressure + unit    → designPressure (kPag, barg×100 conversion)
 */
export function LinkTankButton({ onTankLinked }: Props) {
  const { setValue } = useFormContext<CalculationInput>()
  const [open, setOpen] = useState(false)
  const [tanks, setTanks] = useState<Equipment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [linkedTag, setLinkedTag] = useState<string | null>(null)

  const fetchTanks = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const items = await apiClient.equipment.list({ type: "tank" })
      setTanks(items)
    } catch {
      setError("Could not load tanks — is the API running?")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpen = async (willOpen: boolean) => {
    setOpen(willOpen)
    if (willOpen) {
      await fetchTanks()
    }
  }

  const handleSelect = (tank: Equipment) => {
    const details = (tank.details ?? {}) as Record<string, unknown>

    // ── Geometry ─────────────────────────────────────────────────────────────
    const innerDiameter = details.innerDiameter
    if (typeof innerDiameter === "number" && innerDiameter > 0) {
      setValue("diameter", innerDiameter, { shouldValidate: true })
    }

    const height = details.height
    if (typeof height === "number" && height > 0) {
      setValue("height", height, { shouldValidate: true })
    }

    // ── Insulation ────────────────────────────────────────────────────────────
    const insulationThickness = details.insulationThickness
    if (details.insulated === true && typeof insulationThickness === "number" && insulationThickness > 0) {
      setValue("insulationThickness", insulationThickness, { shouldValidate: true })
    }

    // ── Design pressure (with unit conversion) ────────────────────────────────
    const designPressure = tank.designPressure
    const designPressureUnit = tank.designPressureUnit ?? "barg"
    if (typeof designPressure === "number") {
      let kPag: number | null = null
      if (designPressureUnit === "barg") {
        kPag = designPressure * 100  // 1 barg = 100 kPag
      } else if (designPressureUnit === "kPag" || designPressureUnit === "kPa") {
        kPag = designPressure
      }
      if (kPag !== null) {
        setValue("designPressure", kPag, { shouldValidate: true })
      }
    }

    // ── Record the link ───────────────────────────────────────────────────────
    onTankLinked(tank.id)
    setLinkedTag(tank.tag)
    setOpen(false)
  }

  const formatDimensions = (tank: Equipment) => {
    const d = (tank.details ?? {}) as Record<string, unknown>
    const parts: string[] = []
    if (typeof d.innerDiameter === "number") parts.push(`Ø${d.innerDiameter} mm`)
    if (typeof d.height === "number") parts.push(`H ${d.height} mm`)
    if (typeof d.orientation === "string") parts.push(d.orientation)
    return parts.join(" · ")
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={linkedTag ? "secondary" : "outline"}
          size="sm"
          className="gap-2"
          title={linkedTag ? `Linked to ${linkedTag}` : "Link geometry from equipment register"}
        >
          <Link2 className="h-4 w-4" />
          {linkedTag ? linkedTag : "Link Tank"}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link Tank from Equipment Register</DialogTitle>
          <DialogDescription>
            Select a tank to load its geometry into the form.
            Diameter, height, insulation thickness, and design pressure will be populated.
          </DialogDescription>
        </DialogHeader>

        {/* Refresh */}
        <div className="flex justify-end -mt-1 mb-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={fetchTanks}
            disabled={isLoading}
            className="gap-1 text-xs"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error && <p className="text-xs text-destructive mb-2">{error}</p>}

        <ScrollArea className="h-72 rounded-md border">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : tanks.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              No tanks found in the equipment register.
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {tanks.map((tank) => (
                <button
                  key={tank.id}
                  type="button"
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                  onClick={() => handleSelect(tank)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{tank.tag}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                      {tank.name}
                    </span>
                  </div>
                  {formatDimensions(tank) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDimensions(tank)}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {(tank.details as Record<string, unknown> | null)?.insulated === true && (
                      <span className="text-[10px] uppercase tracking-wide text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                        insulated
                      </span>
                    )}
                    {typeof (tank.details as Record<string, unknown> | null)?.tankType === "string" && (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded">
                        {(tank.details as Record<string, unknown>).tankType as string}
                      </span>
                    )}
                    {tank.designPressure != null && (
                      <span className="text-[10px] text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded">
                        {tank.designPressure} {tank.designPressureUnit ?? "barg"}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {linkedTag && (
          <p className="text-xs text-muted-foreground mt-1">
            Currently linked: <span className="font-medium">{linkedTag}</span>
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
