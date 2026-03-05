'use client'

import { useFormContext, useFieldArray, Controller } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import { convertUnit } from '@eng-suite/physics'
import type { CalculationInput } from '@/types'
import { SectionCard } from '../components/SectionCard'
import { useUomStore } from '@/lib/store/uomStore'
import { UOM_LABEL, BASE_UNITS, UOM_OPTIONS } from '@/lib/uom'

// ─── Incoming Streams (incomingStreams) ───────────────────────────────────────

function IncomingStreamTable() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<CalculationInput>()
  const { units, setUnit } = useUomStore()
  const displayUnit = units.volumeFlow

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'incomingStreams',
  })

  const fieldErrors = errors.incomingStreams

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Incoming Streams (to tank)</p>
          <p className="text-xs text-muted-foreground">
            Liquid entering the tank → drives outbreathing
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ streamNo: '', description: '', flowrate: 0 })}
          className="h-7 text-xs gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-md border border-dashed py-3 text-center">
          <p className="text-xs text-muted-foreground">
            No incoming streams — add one if applicable
          </p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <div className="grid grid-cols-[5rem_1fr_1fr_2rem] gap-2 px-3 py-1.5 bg-muted/50 border-b text-xs font-medium text-muted-foreground">
            <span>Stream No.</span>
            <span>Description</span>
            <span>Flowrate</span>
            <span />
          </div>
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-[5rem_1fr_1fr_2rem] gap-2 px-3 py-2 items-center border-b last:border-b-0"
            >
              <Input
                className="h-7 text-xs"
                placeholder="S-01"
                {...register(`incomingStreams.${index}.streamNo`)}
              />
              <Input
                className="h-7 text-xs"
                placeholder="Optional"
                {...register(`incomingStreams.${index}.description`)}
              />
              <Controller
                name={`incomingStreams.${index}.flowrate`}
                control={control}
                render={({ field }) => {
                  const displayValue = isFinite(field.value)
                    ? convertUnit(field.value, BASE_UNITS.volumeFlow, displayUnit)
                    : ''
                  return (
                    <div className="flex items-center gap-1.5">
                      <Input
                        className="h-7 text-xs flex-1"
                        type="number"
                        step="any"
                        placeholder="0"
                        value={displayValue === '' ? '' : Number(displayValue.toFixed(6))}
                        onChange={(e) => {
                          const raw = parseFloat(e.target.value)
                          field.onChange(
                            isNaN(raw) ? NaN : convertUnit(raw, displayUnit, BASE_UNITS.volumeFlow)
                          )
                        }}
                        onBlur={field.onBlur}
                      />
                      <Select
                        value={displayUnit}
                        onValueChange={(newUnit) => setUnit('volumeFlow', newUnit)}
                      >
                        <SelectTrigger className="h-7 min-w-fit px-2 border-muted bg-muted/40 text-xs whitespace-nowrap">
                          <SelectValue>{UOM_LABEL[displayUnit] ?? displayUnit}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {UOM_OPTIONS.volumeFlow.map((u) => (
                            <SelectItem key={u} value={u} className="text-xs">
                              {UOM_LABEL[u] ?? u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              {Array.isArray(fieldErrors) && fieldErrors[index] && (
                <div className="col-span-full space-y-0.5">
                  {fieldErrors[index]?.streamNo?.message && (
                    <p className="text-xs text-destructive">
                      Stream No: {fieldErrors[index].streamNo?.message}
                    </p>
                  )}
                  {fieldErrors[index]?.flowrate?.message && (
                    <p className="text-xs text-destructive">
                      Flowrate: {fieldErrors[index].flowrate?.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Outgoing Streams (outgoingStreams) ───────────────────────────────────────

function OutgoingStreamTable() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<CalculationInput>()
  const { units, setUnit } = useUomStore()
  const displayUnit = units.volumeFlow

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'outgoingStreams',
  })

  const fieldErrors = errors.outgoingStreams

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Outgoing Streams (from tank)</p>
          <p className="text-xs text-muted-foreground">
            Liquid leaving the tank → drives inbreathing
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ streamNo: '', flowrate: 0, description: '' })}
          className="h-7 text-xs gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-md border border-dashed py-3 text-center">
          <p className="text-xs text-muted-foreground">
            No outgoing streams — add one if applicable
          </p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <div className="grid grid-cols-[5rem_1fr_1fr_2rem] gap-2 px-3 py-1.5 bg-muted/50 border-b text-xs font-medium text-muted-foreground">
            <span>Stream No.</span>
            <span>Description</span>
            <span>Flowrate</span>
            <span />
          </div>
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-[5rem_1fr_1fr_2rem] gap-2 px-3 py-2 items-center border-b last:border-b-0"
            >
              <Input
                className="h-7 text-xs"
                placeholder="S-01"
                {...register(`outgoingStreams.${index}.streamNo`)}
              />
              <Input
                className="h-7 text-xs"
                placeholder="Optional"
                {...register(`outgoingStreams.${index}.description`)}
              />
              <Controller
                name={`outgoingStreams.${index}.flowrate`}
                control={control}
                render={({ field }) => {
                  const displayValue = isFinite(field.value)
                    ? convertUnit(field.value, BASE_UNITS.volumeFlow, displayUnit)
                    : ''
                  return (
                    <div className="flex items-center gap-1.5">
                      <Input
                        className="h-7 text-xs flex-1"
                        type="number"
                        step="any"
                        placeholder="0"
                        value={displayValue === '' ? '' : Number(displayValue.toFixed(6))}
                        onChange={(e) => {
                          const raw = parseFloat(e.target.value)
                          field.onChange(
                            isNaN(raw) ? NaN : convertUnit(raw, displayUnit, BASE_UNITS.volumeFlow)
                          )
                        }}
                        onBlur={field.onBlur}
                      />
                      <Select
                        value={displayUnit}
                        onValueChange={(newUnit) => setUnit('volumeFlow', newUnit)}
                      >
                        <SelectTrigger className="h-7 min-w-fit px-2 border-muted bg-muted/40 text-xs whitespace-nowrap">
                          <SelectValue>{UOM_LABEL[displayUnit] ?? displayUnit}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {UOM_OPTIONS.volumeFlow.map((u) => (
                            <SelectItem key={u} value={u} className="text-xs">
                              {UOM_LABEL[u] ?? u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              {Array.isArray(fieldErrors) && fieldErrors[index] && (
                <div className="col-span-full space-y-0.5">
                  {fieldErrors[index]?.streamNo?.message && (
                    <p className="text-xs text-destructive">
                      Stream No: {fieldErrors[index].streamNo?.message}
                    </p>
                  )}
                  {fieldErrors[index]?.flowrate?.message && (
                    <p className="text-xs text-destructive">
                      Flowrate: {fieldErrors[index].flowrate?.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main section ─────────────────────────────────────────────────────────────

export function StreamFlowSection() {
  const { watch } = useFormContext<CalculationInput>()
  const { units } = useUomStore()
  const displayUnit = units.volumeFlow

  const incoming = watch('incomingStreams') ?? []
  const outgoing = watch('outgoingStreams') ?? []

  const inTotal = incoming.reduce((s, r) => s + (Number(r.flowrate) || 0), 0)
  const outTotal = outgoing.reduce((s, r) => s + (Number(r.flowrate) || 0), 0)

  // Convert base unit totals to display unit
  const inTotalDisplay = convertUnit(inTotal, BASE_UNITS.volumeFlow, displayUnit)
  const outTotalDisplay = convertUnit(outTotal, BASE_UNITS.volumeFlow, displayUnit)

  return (
    <SectionCard
      title="Stream Flowrates"
      action={
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs">
            In Σ {inTotalDisplay.toFixed(2)} {UOM_LABEL[displayUnit] ?? displayUnit}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Out Σ {outTotalDisplay.toFixed(2)} {UOM_LABEL[displayUnit] ?? displayUnit}
          </Badge>
        </div>
      }
    >
      <IncomingStreamTable />
      <OutgoingStreamTable />
    </SectionCard>
  )
}
