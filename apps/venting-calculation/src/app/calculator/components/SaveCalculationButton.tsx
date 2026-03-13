"use client"

import { useState } from "react"
import { useFormContext } from "react-hook-form"
import { Save, Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSavedCalculations } from "@/lib/hooks/useSavedCalculations"
import { buildCalculationFileEnvelope, downloadCalculationFile } from "@/lib/calculationFile"
import type { CalculationInput, CalculationMetadata, RevisionRecord } from "@/types"

interface Props {
  /** ID of the linked equipment tank, if the user selected one via LinkTankButton. */
  equipmentId?: string | null
  calculationMetadata: CalculationMetadata
  revisionHistory: RevisionRecord[]
  calculationResult: import("@/types").CalculationResult | null
  /** When provided, the dialog is controlled externally (no DialogTrigger rendered). */
  controlledOpen?: boolean
  onControlledOpenChange?: (open: boolean) => void
}

/**
 * Button that opens a dialog to name and save the current calculation to the DB.
 */
export function SaveCalculationButton({
  equipmentId,
  calculationMetadata,
  revisionHistory,
  controlledOpen,
  onControlledOpenChange,
  calculationResult,
}: Props) {
  const { getValues } = useFormContext<CalculationInput>()
  const { save, overwrite, fetchList, isSaving } = useSavedCalculations()

  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (v: boolean) => onControlledOpenChange?.(v) : setInternalOpen
  const [name, setName] = useState("")
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [duplicateId, setDuplicateId] = useState<string | null>(null)

  const resetDialogState = () => {
    setName("")
    setSaved(false)
    setSaveError(null)
    setDuplicateId(null)
  }

  const handleSave = async (forceOverwrite = false) => {
    if (!name.trim()) return
    setSaveError(null)
    try {
      const currentItems = await fetchList()
      const normalizedName = name.trim().toLowerCase()
      const existing = currentItems.find(
        (item) => item.isActive !== false && item.name.trim().toLowerCase() === normalizedName
      )
      if (existing && !forceOverwrite) {
        setDuplicateId(existing.id)
        return
      }
      const inputs = getValues() as unknown as Record<string, unknown>
      const results = calculationResult
        ? (calculationResult as unknown as Record<string, unknown>)
        : undefined
      if (existing) {
        await overwrite(
          existing.id,
          name.trim(),
          inputs,
          results,
          calculationMetadata,
          revisionHistory
        )
      } else {
        await save(
          name.trim(),
          inputs,
          results,
          equipmentId,
          calculationMetadata,
          revisionHistory
        )
      }
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        setOpen(false)
        resetDialogState()
      }, 1200)
    } catch {
      setSaveError("Could not save — is the API running?")
    }
  }

  const handleSaveToFile = () => {
    const inputs = getValues() as unknown as Record<string, unknown>
    const fileName = name.trim() || getValues("tankNumber") || calculationMetadata.documentNumber || "calculation"
    const envelope = buildCalculationFileEnvelope({
      name: fileName,
      inputs,
      metadata: calculationMetadata,
      revisionHistory,
    })
    downloadCalculationFile(envelope, fileName.replace(/[^a-zA-Z0-9-_]/g, "_"))
    setOpen(false)
    resetDialogState()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={async (v) => {
        setOpen(v)
        if (v) {
          await fetchList()
        } else {
          resetDialogState()
        }
      }}
    >
      {!isControlled && (
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="gap-2">
            <Save className="h-4 w-4" />
            Save
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Calculation</DialogTitle>
          <DialogDescription>
            Give this calculation a name so you can reload it later.
            {equipmentId && (
              <span className="block mt-1 text-xs text-blue-600 dark:text-blue-400">
                Linked to equipment tank — the link will be saved.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <Label htmlFor="calc-name">Name</Label>
          <Input
            id="calc-name"
            placeholder={getValues("tankNumber") || "e.g. T-101 Normal Venting Rev 0"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleSave() }}
            autoFocus
          />
          {duplicateId && (
            <p className="text-xs text-amber-600">
              A calculation with this name already exists. Rename it or overwrite the existing case.
            </p>
          )}
          {saveError && <p className="text-xs text-destructive">{saveError}</p>}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveToFile}
            disabled={isSaving || saved}
          >
            Save to File
          </Button>
          {duplicateId && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDuplicateId(null)}
                disabled={isSaving || saved}
              >
                Rename
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => { void handleSave(true) }}
                disabled={isSaving || saved}
              >
                Overwrite Existing
              </Button>
            </>
          )}
          <Button
            type="button"
            onClick={() => { void handleSave() }}
            disabled={!name.trim() || isSaving || saved}
            className="gap-2"
          >
            {isSaving ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
            ) : saved ? (
              <><Check className="h-4 w-4" />Saved!</>
            ) : (
              <><Save className="h-4 w-4" />Save</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
