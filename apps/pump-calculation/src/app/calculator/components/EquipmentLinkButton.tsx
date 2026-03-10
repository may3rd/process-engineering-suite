'use client'

import { useState } from 'react'
import { Search, Loader2, RefreshCw, Link2, Unlink2, Plus } from 'lucide-react'
import { useFormContext } from 'react-hook-form'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { apiClient } from '@/lib/apiClient'
import type { CalculationInput } from '@/types'

interface PumpEquipmentItem {
  id: string
  tag: string
  name: string
  description?: string | null
}

interface Props {
  controlledOpen: boolean
  onControlledOpenChange: (open: boolean) => void
  linkedEquipmentId: string | null
  linkedEquipmentTag: string | null
  onEquipmentLinked: (equipmentId: string | null, equipmentTag?: string | null) => void
}

export function EquipmentLinkButton({
  controlledOpen,
  onControlledOpenChange,
  linkedEquipmentId,
  linkedEquipmentTag,
  onEquipmentLinked,
}: Props) {
  const { getValues } = useFormContext<CalculationInput>()
  const [items, setItems] = useState<PumpEquipmentItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPumps = async () => {
    setLoading(true)
    setError(null)
    try {
      const pumps = await apiClient.engineeringObjects.list({ objectType: 'PUMP' })
      setItems(
        pumps
          .filter((obj) => obj.id)
          .map((obj) => ({
            id: obj.id!,
            tag: obj.tag,
            name: obj.name ?? obj.tag,
            description: obj.description ?? null,
          })),
      )
    } catch {
      setError('Could not load PUMP equipment list.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = async (open: boolean) => {
    onControlledOpenChange(open)
    if (open) {
      await fetchPumps()
      setSearch('')
    }
  }

  const handleCreateAndLink = async () => {
    const formTag = getValues('tag')?.trim().toUpperCase()
    if (!formTag) return
    setCreating(true)
    setError(null)
    try {
      const obj = await apiClient.engineeringObjects.upsert(formTag, {
        object_type: 'PUMP',
        properties: {},
      })
      onEquipmentLinked(obj.id ?? formTag, obj.tag)
      onControlledOpenChange(false)
    } catch {
      setError('Could not create PUMP object.')
    } finally {
      setCreating(false)
    }
  }

  const query = search.trim().toLowerCase()
  const filtered = items.filter((item) => {
    if (!query) return true
    return `${item.tag} ${item.name} ${item.description ?? ''}`.toLowerCase().includes(query)
  })

  const formTag = getValues('tag')?.trim().toUpperCase() ?? ''
  const matchesExisting = formTag ? items.some((i) => i.tag.toUpperCase() === formTag) : false

  return (
    <Dialog open={controlledOpen} onOpenChange={(v) => { void handleOpen(v) }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link PUMP Equipment</DialogTitle>
          <DialogDescription>
            Link this calculation to a PUMP engineering object.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-muted-foreground absolute left-2 top-2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
              placeholder="Search by tag or name"
            />
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => { void fetchPumps() }} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        {linkedEquipmentId && (
          <div className="flex items-center justify-between rounded-md border p-2">
            <p className="text-xs text-muted-foreground">
              Currently linked: <span className="text-foreground font-medium">{linkedEquipmentTag ?? linkedEquipmentId}</span>
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEquipmentLinked(null, null)}
              className="gap-1"
            >
              <Unlink2 className="h-3 w-3" />
              Unlink
            </Button>
          </div>
        )}

        {formTag && !matchesExisting && (
          <div className="rounded-md border border-dashed p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{formTag}</p>
              <p className="text-xs text-muted-foreground">No PUMP object found for this tag</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => { void handleCreateAndLink() }}
              disabled={creating}
              className="gap-1.5 whitespace-nowrap"
            >
              {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Create &amp; Link
            </Button>
          </div>
        )}

        <ScrollArea className="h-64 rounded-md border">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {items.length === 0 ? 'No PUMP objects found.' : 'No results.'}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="w-full rounded-md border px-3 py-2 text-left hover:bg-muted/40"
                  onClick={() => {
                    onEquipmentLinked(item.id, item.tag)
                    onControlledOpenChange(false)
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{item.tag}</span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">pump</span>
                  </div>
                  {item.name !== item.tag && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.name}</p>
                  )}
                  {item.description && (
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  )}
                  <div className="mt-1 text-[10px] text-blue-600 dark:text-blue-400 inline-flex items-center gap-1">
                    <Link2 className="h-3 w-3" />
                    Link this pump
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
