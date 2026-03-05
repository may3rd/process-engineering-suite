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
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CalculationInput, CalculationMetadata, RevisionRecord, CalculationResult } from "@/types"

const STORAGE_KEY = "vessel-calculations"

interface SavedCalculation {
  id: string
  name: string
  inputs: CalculationInput
  result?: CalculationResult
  metadata: CalculationMetadata
  revisions: RevisionRecord[]
  savedAt: string
}

function loadAll(): SavedCalculation[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")
  } catch { return [] }
}

function saveAll(items: SavedCalculation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

interface Props {
  controlledOpen?: boolean
  onControlledOpenChange?: (open: boolean) => void
  calculationMetadata: CalculationMetadata
  revisionHistory: RevisionRecord[]
  calculationResult: CalculationResult | null
}

export function SaveCalculationButton({
  controlledOpen,
  onControlledOpenChange,
  calculationMetadata,
  revisionHistory,
  calculationResult,
}: Props) {
  const { getValues } = useFormContext<CalculationInput>()
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicateId, setDuplicateId] = useState<string | null>(null)

  const open = controlledOpen ?? false
  const setOpen = (v: boolean) => onControlledOpenChange?.(v)

  const reset = () => {
    setName("")
    setSaved(false)
    setError(null)
    setDuplicateId(null)
  }

  const handleSave = (forceOverwrite = false) => {
    if (!name.trim()) return
    setError(null)
    setSaving(true)
    try {
      const items = loadAll()
      const existing = items.find(
        (i) => i.name.trim().toLowerCase() === name.trim().toLowerCase()
      )
      if (existing && !forceOverwrite) {
        setDuplicateId(existing.id)
        setSaving(false)
        return
      }
      const inputs = getValues()
      const entry: SavedCalculation = {
        id: existing?.id ?? crypto.randomUUID(),
        name: name.trim(),
        inputs,
        result: calculationResult ?? undefined,
        metadata: calculationMetadata,
        revisions: revisionHistory,
        savedAt: new Date().toISOString(),
      }
      const updated = existing
        ? items.map((i) => (i.id === existing.id ? entry : i))
        : [...items, entry]
      saveAll(updated)
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        setOpen(false)
        reset()
      }, 1200)
    } catch {
      setError("Could not save calculation.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Calculation</DialogTitle>
          <DialogDescription>
            Name this calculation to reload it later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <Label htmlFor="save-name">Name</Label>
          <Input
            id="save-name"
            placeholder={getValues("tag") || "e.g. V-101 Design Case"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave() }}
            autoFocus
          />
          {duplicateId && (
            <p className="text-xs text-amber-600">
              A calculation with this name already exists. Rename or overwrite.
            </p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          {duplicateId && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => handleSave(true)}
              disabled={saving || saved}
            >
              Overwrite
            </Button>
          )}
          <Button
            type="button"
            onClick={() => handleSave()}
            disabled={!name.trim() || saving || saved}
            className="gap-2"
          >
            {saving ? (
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
