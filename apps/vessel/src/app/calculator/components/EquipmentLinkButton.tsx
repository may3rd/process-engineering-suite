"use client"

import { useState } from "react"
import { Link, Unlink, Upload, Download, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { useFormContext } from "react-hook-form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { fetchEquipmentObject, upsertEquipmentObject } from "@/lib/api"
import { calculationInputSchema } from "@/lib/validation/inputSchema"
import { VesselOrientation, HeadType } from "@/types"
import type {
  CalculationInput,
  CalculationResult,
  CalculationMetadata,
  RevisionRecord,
  EquipmentLinkStatus,
  EngineeringObjectPayload,
} from "@/types"

interface Props {
  controlledOpen: boolean
  onControlledOpenChange: (open: boolean) => void
  calculationResult: CalculationResult | null
  calculationMetadata: CalculationMetadata
  revisionHistory: RevisionRecord[]
  linkStatus: EquipmentLinkStatus
  onLinkStatusChange: (status: EquipmentLinkStatus) => void
  onCalculationLoaded: (metadata: CalculationMetadata, revisions: RevisionRecord[]) => void
}

export function EquipmentLinkButton({
  controlledOpen,
  onControlledOpenChange,
  calculationResult,
  calculationMetadata,
  revisionHistory,
  linkStatus,
  onLinkStatusChange,
  onCalculationLoaded,
}: Props) {
  const { getValues, reset } = useFormContext<CalculationInput>()
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [pulledData, setPulledData] = useState<EngineeringObjectPayload | null>(null)
  const [confirmPull, setConfirmPull] = useState(false)

  const tag = getValues("tag")
  const canPush = !!tag && !!calculationResult
  const canPull = !!tag

  const reset_ = () => {
    setMessage(null)
    setPulledData(null)
    setConfirmPull(false)
  }

  // ── Push ────────────────────────────────────────────────────────────────────
  const handlePush = async () => {
    if (!calculationResult || !tag) return
    onLinkStatusChange("loading")
    setMessage(null)
    try {
      await upsertEquipmentObject(tag, {
        object_type: "VESSEL",
        properties: {
          inputs: getValues(),
          result: calculationResult,
          savedAt: new Date().toISOString(),
        },
        status: "In-Design",
      })
      onLinkStatusChange("linked")
      setMessage({ type: "success", text: `Pushed to API as "${tag.toUpperCase()}"` })
    } catch (err) {
      onLinkStatusChange("error")
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Push failed" })
    }
  }

  // ── Pull ─────────────────────────────────────────────────────────────────────
  const handlePull = async () => {
    if (!tag) return
    onLinkStatusChange("loading")
    setMessage(null)
    try {
      const obj = await fetchEquipmentObject(tag)
      if (!obj) {
        onLinkStatusChange("unlinked")
        setMessage({ type: "error", text: `No record found for tag "${tag.toUpperCase()}"` })
        return
      }
      setPulledData(obj)
      setConfirmPull(true)
      onLinkStatusChange("idle")
    } catch (err) {
      onLinkStatusChange("error")
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Pull failed" })
    }
  }

  // ── Confirm pull — load into form ───────────────────────────────────────────
  const handleConfirmPull = () => {
    if (!pulledData?.properties?.inputs) {
      setMessage({ type: "error", text: "No input data in fetched record" })
      setConfirmPull(false)
      return
    }

    const rawInputs = pulledData.properties.inputs as Record<string, unknown>
    const toNum = (v: unknown) => { const n = Number(v); return isNaN(n) ? undefined : n }
    const normalized: Partial<CalculationInput> = {
      tag: (rawInputs.tag as string) ?? "",
      description: (rawInputs.description as string) ?? "",
      orientation: Object.values(VesselOrientation).includes(rawInputs.orientation as VesselOrientation)
        ? rawInputs.orientation as VesselOrientation
        : VesselOrientation.VERTICAL,
      headType: Object.values(HeadType).includes(rawInputs.headType as HeadType)
        ? rawInputs.headType as HeadType
        : HeadType.ELLIPSOIDAL_2_1,
      insideDiameter: toNum(rawInputs.insideDiameter),
      shellLength: toNum(rawInputs.shellLength),
      wallThickness: toNum(rawInputs.wallThickness),
      headDepth: toNum(rawInputs.headDepth),
      liquidLevel: toNum(rawInputs.liquidLevel),
      hll: toNum(rawInputs.hll),
      lll: toNum(rawInputs.lll),
      ofl: toNum(rawInputs.ofl),
      density: toNum(rawInputs.density),
      flowrate: toNum(rawInputs.flowrate),
      metadata: (rawInputs.metadata as CalculationMetadata) ?? calculationMetadata,
    }
    reset(normalized as CalculationInput, { keepDefaultValues: false })
    if (rawInputs.metadata) onCalculationLoaded(rawInputs.metadata as CalculationMetadata, [])
    onLinkStatusChange("linked")
    setMessage({ type: "success", text: `Loaded data for "${pulledData.tag}"` })
    setConfirmPull(false)
    setPulledData(null)
  }

  return (
    <Dialog
      open={controlledOpen}
      onOpenChange={(v) => { onControlledOpenChange(v); if (!v) reset_() }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {linkStatus === "linked"
              ? <Link className="h-4 w-4 text-green-600" />
              : <Unlink className="h-4 w-4 text-muted-foreground" />
            }
            Equipment Link
          </DialogTitle>
          <DialogDescription>
            Push the current calculation to the API, or pull existing data for tag{" "}
            <span className="font-mono font-medium">{tag?.toUpperCase() || "—"}</span>.
          </DialogDescription>
        </DialogHeader>

        {/* Confirm pull preview */}
        {confirmPull && pulledData && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-2 text-sm">
            <p className="font-medium text-amber-800">Replace current form with pulled data?</p>
            <p className="text-amber-700 text-xs">
              Object type: <span className="font-mono">{pulledData.object_type}</span> ·{" "}
              Status: <span className="font-mono">{pulledData.status ?? "—"}</span>
            </p>
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="default" onClick={handleConfirmPull}>
                Load data
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setConfirmPull(false); setPulledData(null) }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Status message */}
        {message && (
          <div className={`flex items-start gap-2 rounded-md p-2 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-destructive/10 text-destructive border border-destructive/20"
          }`}>
            {message.type === "success"
              ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            }
            <span>{message.text}</span>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="default"
            className="gap-2 flex-1"
            disabled={!canPush || linkStatus === "loading"}
            onClick={handlePush}
          >
            {linkStatus === "loading"
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Upload className="h-4 w-4" />
            }
            Push to API
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2 flex-1"
            disabled={!canPull || linkStatus === "loading"}
            onClick={handlePull}
          >
            {linkStatus === "loading"
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Download className="h-4 w-4" />
            }
            Pull from API
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
