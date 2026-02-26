"use client"

import { useEffect, useState } from "react"
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
import { Input } from "@/components/ui/input"
import { apiClient } from "@/lib/apiClient"
import { convertUnit } from "@eng-suite/physics"
import { TankConfiguration, type CalculationInput } from "@/types"
import type { components } from "@eng-suite/types"

type Equipment = components["schemas"]["EquipmentResponse"]

interface Props {
  onTankLinked: (equipmentId: string, tankTag: string) => void
  linkedTag?: string | null
  clearToken?: number
  /** When provided, the dialog is controlled externally (no DialogTrigger rendered). */
  controlledOpen?: boolean
  onControlledOpenChange?: (open: boolean) => void
}

interface LoadedFromTankPreview {
  tankTag: string
  description: string
  diameterMm?: number
  heightMm?: number
  designPressureKPag?: number
  latitudeDeg?: number
  avgStorageTempC?: number
  vapourPressureKPa?: number
  flashBoilingPointType?: "FP" | "BP"
  flashBoilingPointC?: number
  latentHeatKjPerKg?: number
  relievingTemperatureC?: number
  molecularMassGPerMol?: number
  tankConfiguration?: string
  insulationThicknessMm?: number
  insulationConductivityWMk?: number
  insideHeatTransferCoeffWM2K?: number
  insulatedSurfaceAreaM2?: number
}

function toKPag(value: number, unit: string | null | undefined): number | null {
  const sourceUnit = unit ?? "barg"
  const converted = convertUnit(value, sourceUnit, "kPag")
  return Number.isFinite(converted) ? converted : null
}

function toCelsius(value: number, unit: string | null | undefined): number | null {
  const sourceUnit = unit ?? "C"
  const converted = convertUnit(value, sourceUnit, "C")
  return Number.isFinite(converted) ? converted : null
}

function toKPa(value: number, unit: string | null | undefined): number | null {
  const sourceUnit = unit ?? "kPa"
  const converted = convertUnit(value, sourceUnit, "kPa")
  return Number.isFinite(converted) ? converted : null
}

function toKjPerKg(value: number, unit: string | null | undefined): number {
  const sourceUnit = unit ?? "kJ/kg"
  const converted = convertUnit(value, sourceUnit, "kJ/kg")
  return Number.isFinite(converted) ? converted : value
}

function asTankConfiguration(value: unknown): TankConfiguration | null {
  if (typeof value !== "string") return null
  const configs = Object.values(TankConfiguration)
  return configs.includes(value as TankConfiguration) ? (value as TankConfiguration) : null
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
export function LinkTankButton({ onTankLinked, linkedTag, clearToken, controlledOpen, onControlledOpenChange }: Props) {
  const { setValue } = useFormContext<CalculationInput>()
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (v: boolean) => onControlledOpenChange?.(v) : setInternalOpen
  const [tanks, setTanks] = useState<Equipment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [loadedPreview, setLoadedPreview] = useState<LoadedFromTankPreview | null>(null)
  const showDevPreview = process.env.NODE_ENV !== "production"

  useEffect(() => {
    if (!linkedTag) {
      setLoadedPreview(null)
    }
  }, [linkedTag])

  useEffect(() => {
    setOpen(false)
  }, [clearToken])

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
      setSearch("")
    }
  }

  const filteredTanks = tanks.filter((tank) => {
    const query = search.trim().toLowerCase()
    if (!query) {
      return true
    }

    const tankType =
      typeof (tank.details as Record<string, unknown> | null)?.tankType === "string"
        ? ((tank.details as Record<string, unknown>).tankType as string)
        : ""
    const haystack = `${tank.tag} ${tank.name} ${tank.description ?? ""} ${tankType}`.toLowerCase()
    return haystack.includes(query)
  })

  const handleSelect = (tank: Equipment) => {
    const details = (tank.details ?? {}) as Record<string, unknown>
    const preview: LoadedFromTankPreview = {
      tankTag: tank.tag,
      description: tank.description ?? tank.name ?? "",
    }

    setValue("tankNumber", tank.tag, { shouldValidate: true })
    setValue("description", tank.description ?? tank.name ?? "", { shouldValidate: true })

    // ── Geometry ─────────────────────────────────────────────────────────────
    const innerDiameter = details.innerDiameter
    if (typeof innerDiameter === "number" && innerDiameter > 0) {
      setValue("diameter", innerDiameter, { shouldValidate: true })
      preview.diameterMm = innerDiameter
    }

    const height = details.height
    if (typeof height === "number" && height > 0) {
      setValue("height", height, { shouldValidate: true })
      preview.heightMm = height
    }

    // ── Insulation ────────────────────────────────────────────────────────────
    const insulationThickness = details.insulationThickness
    if (details.insulated === true && typeof insulationThickness === "number" && insulationThickness > 0) {
      setValue("insulationThickness", insulationThickness, { shouldValidate: true })
      preview.insulationThicknessMm = insulationThickness
    }
    if (typeof details.insulationConductivity === "number" && details.insulationConductivity > 0) {
      setValue("insulationConductivity", details.insulationConductivity, { shouldValidate: true })
      preview.insulationConductivityWMk = details.insulationConductivity
    }
    if (typeof details.insideHeatTransferCoeff === "number" && details.insideHeatTransferCoeff > 0) {
      setValue("insideHeatTransferCoeff", details.insideHeatTransferCoeff, { shouldValidate: true })
      preview.insideHeatTransferCoeffWM2K = details.insideHeatTransferCoeff
    }
    if (typeof details.insulatedSurfaceArea === "number" && details.insulatedSurfaceArea >= 0) {
      setValue("insulatedSurfaceArea", details.insulatedSurfaceArea, { shouldValidate: true })
      preview.insulatedSurfaceAreaM2 = details.insulatedSurfaceArea
    }

    const tankConfiguration = asTankConfiguration(details.tankConfiguration)
    if (tankConfiguration) {
      setValue("tankConfiguration", tankConfiguration, { shouldValidate: true })
      preview.tankConfiguration = tankConfiguration
    }

    // ── Stored venting properties ────────────────────────────────────────────
    if (typeof details.latitude === "number") {
      setValue("latitude", details.latitude, { shouldValidate: true })
      preview.latitudeDeg = details.latitude
    }

    if (typeof details.workingTemperature === "number") {
      const valueC = toCelsius(details.workingTemperature, (details.workingTemperatureUnit as string | undefined) ?? "C")
      if (valueC !== null) {
        setValue("avgStorageTemp", valueC, { shouldValidate: true })
        preview.avgStorageTempC = valueC
      }
    }

    if (typeof details.vapourPressure === "number") {
      const valueKPa = toKPa(details.vapourPressure, (details.vapourPressureUnit as string | undefined) ?? "kPa")
      if (valueKPa !== null) {
        setValue("vapourPressure", valueKPa, { shouldValidate: true })
        preview.vapourPressureKPa = valueKPa
      }
    }

    if (typeof details.flashPoint === "number") {
      const valueC = toCelsius(details.flashPoint, (details.flashPointUnit as string | undefined) ?? "C")
      if (valueC !== null) {
        setValue("flashBoilingPointType", "FP", { shouldValidate: true })
        setValue("flashBoilingPoint", valueC, { shouldValidate: true })
        preview.flashBoilingPointType = "FP"
        preview.flashBoilingPointC = valueC
      }
    } else if (typeof details.boilingPoint === "number") {
      const valueC = toCelsius(details.boilingPoint, (details.boilingPointUnit as string | undefined) ?? "C")
      if (valueC !== null) {
        setValue("flashBoilingPointType", "BP", { shouldValidate: true })
        setValue("flashBoilingPoint", valueC, { shouldValidate: true })
        preview.flashBoilingPointType = "BP"
        preview.flashBoilingPointC = valueC
      }
    }

    if (typeof details.latentHeat === "number" && details.latentHeat > 0) {
      const latentHeat = toKjPerKg(details.latentHeat, (details.latentHeatUnit as string | undefined) ?? "kJ/kg")
      setValue(
        "latentHeat",
        latentHeat,
        { shouldValidate: true },
      )
      preview.latentHeatKjPerKg = latentHeat
    }

    if (typeof details.relievingTemperature === "number") {
      const valueC = toCelsius(
        details.relievingTemperature,
        (details.relievingTemperatureUnit as string | undefined) ?? "C",
      )
      if (valueC !== null) {
        setValue("relievingTemperature", valueC, { shouldValidate: true })
        preview.relievingTemperatureC = valueC
      }
    }

    if (typeof details.molecularWeight === "number" && details.molecularWeight > 0) {
      setValue("molecularMass", details.molecularWeight, { shouldValidate: true })
      preview.molecularMassGPerMol = details.molecularWeight
    }

    // ── Design pressure (with unit conversion) ────────────────────────────────
    const designPressure = tank.designPressure
    if (typeof designPressure === "number") {
      const kPag = toKPag(designPressure, tank.designPressureUnit)
      if (kPag !== null) {
        setValue("designPressure", kPag, { shouldValidate: true })
        preview.designPressureKPag = kPag
      }
    }

    setLoadedPreview(preview)

    // ── Record the link ───────────────────────────────────────────────────────
    onTankLinked(tank.id, tank.tag)
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
      {!isControlled && (
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
      )}

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

        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search tank by tag, name, description..."
          className="mb-2"
        />

        {error && <p className="text-xs text-destructive mb-2">{error}</p>}

        <ScrollArea className="h-72 rounded-md border">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTanks.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              {search.trim() ? "No tanks match your search." : "No tanks found in the equipment register."}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredTanks.map((tank) => (
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
        {showDevPreview && loadedPreview && (
          <div className="mt-2 rounded-md border bg-muted/30 p-2">
            <p className="text-xs font-medium mb-1">Loaded from tank (dev only)</p>
            <pre className="text-[11px] leading-4 whitespace-pre-wrap break-words">
              {JSON.stringify(loadedPreview, null, 2)}
            </pre>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
