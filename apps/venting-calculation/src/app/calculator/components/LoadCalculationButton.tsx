"use client"

import { useState } from "react"
import { useFormContext } from "react-hook-form"
import { FolderOpen, Loader2, RefreshCw, Link2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useSavedCalculations } from "@/lib/hooks/useSavedCalculations"
import { TankConfiguration } from "@/types"
import type { CalculationInput, CalculationMetadata, RevisionRecord, ApiEdition, FlashBoilingPointType } from "@/types"

interface Props {
  /**
   * Called when the user loads a calculation.
   * Passes the equipmentId of the linked tank (or null if not linked).
   * Use this in page.tsx to restore the `linkedEquipmentId` state so re-saves preserve the link.
   */
  onTankLinked?: (equipmentId: string | null, tankTag?: string | null) => void
  onCalculationLoaded?: (metadata: CalculationMetadata, revisionHistory: RevisionRecord[]) => void
  /** When provided, the dialog is controlled externally (no DialogTrigger rendered). */
  controlledOpen?: boolean
  onControlledOpenChange?: (open: boolean) => void
}

const EMPTY_METADATA: CalculationMetadata = {
  projectNumber: "",
  documentNumber: "",
  title: "",
  projectName: "",
  client: "",
}

const normalizeRevisionHistory = (value: unknown): RevisionRecord[] => {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null)
    .map((row) => ({
      rev: (row.rev as string | undefined) ?? "",
      by: (row.by as string | undefined) ?? "",
      byDate: (row.byDate as string | undefined) ?? "",
      checkedBy: (row.checkedBy as string | undefined) ?? "",
      checkedDate: (row.checkedDate as string | undefined) ?? "",
      approvedBy: (row.approvedBy as string | undefined) ?? "",
      approvedDate: (row.approvedDate as string | undefined) ?? "",
    }))
}

const NUMERIC_KEYS: Array<keyof CalculationInput> = [
  "diameter",
  "height",
  "latitude",
  "designPressure",
  "insulationThickness",
  "insulationConductivity",
  "insideHeatTransferCoeff",
  "insulatedSurfaceArea",
  "avgStorageTemp",
  "vapourPressure",
  "flashBoilingPoint",
  "latentHeat",
  "relievingTemperature",
  "molecularMass",
  "drainLineSize",
  "maxHeightAboveDrain",
]

const TANK_CONFIGURATION_ALIASES: Record<string, TankConfiguration> = {
  "Bare Metal (No Insulation)": TankConfiguration.BARE_METAL,
  "Bare Metal Tank (No Insulation)": TankConfiguration.BARE_METAL,
  "Insulated — Fully Insulated": TankConfiguration.INSULATED_FULL,
  "Insulated tank - Fully Insulation": TankConfiguration.INSULATED_FULL,
  "Insulated — Partially Insulated": TankConfiguration.INSULATED_PARTIAL,
  "Insulated tank - Partial Insulation": TankConfiguration.INSULATED_PARTIAL,
  "Concrete / Fire Proofing": TankConfiguration.CONCRETE,
  "Concrete tank or Fire proofing": TankConfiguration.CONCRETE,
  "Water Application Facilities": TankConfiguration.WATER_APPLICATION,
  "Water-application facilities": TankConfiguration.WATER_APPLICATION,
  "Depressuring and Emptying": TankConfiguration.DEPRESSURING,
  "Depressuring and Emptying facilities": TankConfiguration.DEPRESSURING,
  "Underground Storage": TankConfiguration.UNDERGROUND,
  "Earth-Covered Above Grade": TankConfiguration.EARTH_COVERED,
  "Earth-covered storage above grade": TankConfiguration.EARTH_COVERED,
  "Impoundment Away from Tank": TankConfiguration.IMPOUNDMENT_AWAY,
  "Impoundment away from tank": TankConfiguration.IMPOUNDMENT_AWAY,
  Impoundment: TankConfiguration.IMPOUNDMENT,
}

function normalizeApiEdition(value: unknown): ApiEdition {
  const raw = String(value ?? "").trim().toUpperCase()
  if (raw.startsWith("5")) return "5TH"
  if (raw.startsWith("6")) return "6TH"
  return "7TH"
}

function normalizeFlashBoilingPointType(value: unknown): FlashBoilingPointType {
  const raw = String(value ?? "").trim().toUpperCase()
  return raw === "BP" || raw.includes("BOILING") ? "BP" : "FP"
}

function toNumberOrUndefined(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined
  if (typeof value !== "string") return undefined
  const parsed = Number(value.trim())
  return Number.isFinite(parsed) ? parsed : undefined
}

function normalizeLoadedInput(raw: unknown, defaults: CalculationInput): CalculationInput {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  const normalized = { ...defaults } as CalculationInput
  const mutable = normalized as unknown as Record<string, unknown>

  for (const key of NUMERIC_KEYS) {
    mutable[key] = toNumberOrUndefined(source[key])
  }

  normalized.tankNumber = typeof source.tankNumber === "string" ? source.tankNumber : defaults.tankNumber
  normalized.description = typeof source.description === "string" ? source.description : defaults.description
  normalized.apiEdition = normalizeApiEdition(source.apiEdition)
  normalized.flashBoilingPointType = normalizeFlashBoilingPointType(source.flashBoilingPointType)
  normalized.tankConfiguration =
    TANK_CONFIGURATION_ALIASES[String(source.tankConfiguration ?? "")] ?? defaults.tankConfiguration

  const normalizeStreamArray = (value: unknown) => {
    if (!Array.isArray(value)) return []
    return value
      .filter((row): row is Record<string, unknown> => row !== null && typeof row === "object")
      .map((row) => ({
        streamNo: typeof row.streamNo === "string" ? row.streamNo : "",
        description: typeof row.description === "string" ? row.description : "",
        flowrate: toNumberOrUndefined(row.flowrate) ?? 0,
      }))
      .filter((row) => row.streamNo.trim() !== "" || row.description.trim() !== "" || row.flowrate !== 0)
  }

  normalized.incomingStreams = normalizeStreamArray(source.incomingStreams)
  normalized.outgoingStreams = normalizeStreamArray(source.outgoingStreams)

  return normalized
}

/**
 * Button that lists saved calculations and lets the user load one into the form.
 */
export function LoadCalculationButton({ onTankLinked, onCalculationLoaded, controlledOpen, onControlledOpenChange }: Props) {
  const { reset, clearErrors, formState } = useFormContext<CalculationInput>()
  const { fetchList, remove, savedItems, isLoading, isDeleting, error } = useSavedCalculations()
  const [internalOpen, setInternalOpen] = useState(false)
  const [search, setSearch] = useState("")
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (v: boolean) => onControlledOpenChange?.(v) : setInternalOpen

  const handleOpen = async (willOpen: boolean) => {
    setOpen(willOpen)
    if (willOpen) {
      await fetchList()
      setSearch("")
    }
  }

  const handleSelect = (item: (typeof savedItems)[number]) => {
    const defaults = formState.defaultValues as CalculationInput
    const normalizedInputs = normalizeLoadedInput(item.inputs, defaults)
    reset(defaults, { keepDefaultValues: true })
    clearErrors()
    reset(normalizedInputs, { keepDefaultValues: true })
    // Restore the equipment link in the parent page so re-saves preserve the link
    if (onTankLinked) {
      onTankLinked((item.equipmentId as string | null | undefined) ?? null, null)
    }
    if (onCalculationLoaded) {
      const metadataRaw = (item as unknown as Record<string, unknown>).calculationMetadata
      const metadata = {
        ...EMPTY_METADATA,
        ...(typeof metadataRaw === "object" && metadataRaw !== null
          ? (metadataRaw as Partial<CalculationMetadata>)
          : {}),
      }
      const revisionHistoryRaw = (item as unknown as Record<string, unknown>).revisionHistory
      onCalculationLoaded(metadata, normalizeRevisionHistory(revisionHistoryRaw))
    }
    setOpen(false)
  }

  const handleDelete = async (item: (typeof savedItems)[number]) => {
    const confirmed = window.confirm(`Delete "${item.name}"? This can be restored from API if supported.`)
    if (!confirmed) return
    try {
      await remove(item.id)
    } catch {}
  }

  const formatDate = (iso?: string | null) => {
    if (!iso) return ""
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const query = search.trim().toLowerCase()
  const filteredItems = savedItems
    .filter((item) => item.isActive !== false)
    .filter((item) => {
      if (!query) return true
      const name = item.name.toLowerCase()
      const description = (item.description ?? "").toLowerCase()
      const tankNumber = String((item.inputs as Record<string, unknown> | undefined)?.tankNumber ?? "").toLowerCase()
      return (
        name.includes(query) ||
        description.includes(query) ||
        tankNumber.includes(query)
      )
    })

  const getMetadataValue = (item: (typeof savedItems)[number], key: "projectNumber" | "documentNumber" | "client") => {
    const metadata = (item as unknown as Record<string, unknown>).calculationMetadata
    if (!metadata || typeof metadata !== "object") return ""
    const value = (metadata as Record<string, unknown>)[key]
    return typeof value === "string" ? value.trim() : ""
  }

  const getLatestRevision = (item: (typeof savedItems)[number]) => {
    const revisions = (item as unknown as Record<string, unknown>).revisionHistory
    if (!Array.isArray(revisions) || revisions.length === 0) return ""
    const first = revisions[0]
    if (!first || typeof first !== "object") return ""
    const rev = (first as Record<string, unknown>).rev
    return typeof rev === "string" ? rev.trim() : ""
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Load
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Load Saved Calculation</DialogTitle>
          <DialogDescription>
            Select a calculation to restore its inputs.
          </DialogDescription>
        </DialogHeader>

        {/* Refresh button */}
        <div className="flex items-center gap-2 -mt-1 mb-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, description, tank no."
            className="h-8 text-xs"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={fetchList}
            disabled={isLoading}
            className="gap-1 text-xs"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <p className="text-xs text-destructive mb-2">{error}</p>
        )}

        <ScrollArea className="h-72 rounded-md border">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              {query ? "No matching calculations." : "No saved calculations yet."}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredItems.map((item) => (
                (() => {
                  const projectNumber = getMetadataValue(item, "projectNumber")
                  const documentNumber = getMetadataValue(item, "documentNumber")
                  const client = getMetadataValue(item, "client")
                  const latestRevision = getLatestRevision(item)
                  const hasMetadata = Boolean(projectNumber || documentNumber || client || latestRevision)

                  return (
                  <div
                    key={item.id}
                    className="w-full px-2 py-1 rounded-md hover:bg-accent/60 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        className="flex-1 text-left px-1 py-1"
                        onClick={() => handleSelect(item)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm truncate">{item.name}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(item.createdAt)}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded">
                            {item.apiEdition ?? "7TH"}
                          </span>
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded">
                            {item.status ?? "draft"}
                          </span>
                          {item.equipmentId && (
                            <span className="text-[10px] flex items-center gap-0.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                              <Link2 className="h-2.5 w-2.5" />
                              linked to tank
                            </span>
                          )}
                        </div>
                        {hasMetadata && (
                          <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                            {projectNumber && <span>Project: {projectNumber}</span>}
                            {documentNumber && <span>Doc: {documentNumber}</span>}
                            {client && <span>Client: {client}</span>}
                            {latestRevision && <span>Latest Rev: {latestRevision}</span>}
                          </div>
                        )}
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={isDeleting}
                        className="mt-1 text-muted-foreground hover:text-destructive"
                        onClick={() => { void handleDelete(item) }}
                        aria-label={`Delete ${item.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  )
                })()
                ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
