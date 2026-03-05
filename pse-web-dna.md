# PSE Web DNA
> Design & architecture reference for all `apps/` in the process-engineering-suite monorepo.
> Derived from `apps/venting-calculation`. Follow these patterns when building new apps.

---

## 1. Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, `'use client'` where needed) |
| UI library | shadcn/ui (Radix primitives + Tailwind) |
| Styling | Tailwind CSS v4, CSS custom properties, utility-first |
| Forms | React Hook Form + Zod resolver |
| State | Zustand + `persist` middleware (localStorage) |
| Unit conversion | `@eng-suite/physics` → `convertUnit(value, from, to)` |
| Icons | `lucide-react` |
| Types | TypeScript strict, inferred from Zod schemas |

---

## 2. Page Layout

Every calculator app uses a **sticky two-panel layout**:

```
┌─ top bar ──────────────────────────────────────────────────────────┐
│  [App title + subtitle]                        [≡ Actions ▾]       │
└────────────────────────────────────────────────────────────────────┘
┌─ left panel (inputs) ────────┬─ right panel (results) ─────────────┐
│  SectionCard                 │  Empty/ValidationIssues/Results      │
│  SectionCard                 │                                      │
│  SectionCard                 │  DesignSummaryCard                   │
│  ...                         │  TankSchematic (or equivalent)       │
│                              │  DetailResult1                       │
│                              │  DetailResult2                       │
└──────────────────────────────┴──────────────────────────────────────┘
```

**Tailwind grid:**
```tsx
// page.tsx outer container
<div className="container mx-auto px-4 py-6 min-h-screen bg-background">
  {/* top action bar */}
  <div className="flex items-center justify-between border-b pb-3 mb-6 bg-card/50 backdrop-blur-sm">
    <div>
      <h1 className="text-lg font-semibold">{appTitle}</h1>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
    <ActionMenu ... />
  </div>

  {/* two-column grid */}
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
    <InputPanel />
    <ResultsPanel />
  </div>
</div>
```

**Rules:**
- Single column on mobile, two columns at `xl` (1280 px)
- `items-start` prevents stretching of shorter panel
- Inputs always left, results always right

---

## 3. Core Components

### 3.1 `SectionCard` — Section wrapper

Every major form group and result group lives in a SectionCard.

```tsx
interface SectionCardProps {
  title: string
  children: React.ReactNode
  action?: React.ReactNode   // right-aligned element in header (Badge, button, Select…)
  className?: string
}

// Rendered structure
<Card className="shadow-sm">
  <CardHeader className="pb-3">
    <div className="flex items-center justify-between gap-2">
      <CardTitle className="text-base font-semibold">{title}</CardTitle>
      {action}
    </div>
    <Separator />
  </CardHeader>
  <CardContent className="space-y-4">
    {children}
  </CardContent>
</Card>
```

**Key:**
- `shadow-sm` always present on Cards
- `space-y-4` for content spacing
- Separator after every header

---

### 3.2 `FieldRow` — Labeled form field

Wraps every single input field. Handles label, unit badge, hint, error.

```tsx
interface FieldRowProps {
  label: string
  htmlFor?: string
  required?: boolean
  unit?: React.ReactNode      // static unit badge, e.g. "°" or "g/mol"
  hint?: string               // shown below input when no error
  error?: string              // shown below input in red
  children: React.ReactNode
  className?: string
}

// Rendered structure
<div className={cn("space-y-1", className)}>
  <Label htmlFor={htmlFor} className="text-sm font-medium leading-none">
    {label}
    {required && <span className="text-destructive ml-0.5">*</span>}
  </Label>
  <div className="flex items-center gap-2">
    <div className="flex-1">{children}</div>
    {unit && (
      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{unit}</span>
    )}
  </div>
  {error  && <p className="text-xs text-destructive">{error}</p>}
  {!error && hint && <p className="text-xs text-muted-foreground">{hint}</p>}
</div>
```

---

### 3.3 `UomInput` — Unit-convertible numeric input

Use for every numeric field that has a physical unit. The form **always stores base units**; conversion is display-layer only.

```tsx
interface UomInputProps {
  name: keyof CalculationInput  // React Hook Form field name
  category: UomCategory         // 'length' | 'temperature' | etc.
  id?: string
  placeholder?: string
  disabled?: boolean
}

// Internal logic
const { units, setUnit } = useUomStore()
const displayUnit = units[category]

// On render: baseValue → convertUnit(base, baseUnit, displayUnit) → shown
// On change: rawInput → convertUnit(raw, displayUnit, baseUnit) → stored
```

```tsx
// Rendered structure
<div className="flex items-center gap-1.5">
  <Input
    className="flex-1"
    type="number"
    step="any"
    value={convertUnit(field.value, BASE_UNITS[category], displayUnit).toFixed(6)}
    onChange={e => field.onChange(convertUnit(+e.target.value, displayUnit, BASE_UNITS[category]))}
  />
  <Select value={displayUnit} onValueChange={u => setUnit(category, u)}>
    <SelectTrigger className="h-8 min-w-fit px-2 border-muted bg-muted/40 text-xs whitespace-nowrap">
      <SelectValue>{UOM_LABEL[displayUnit] ?? displayUnit}</SelectValue>
    </SelectTrigger>
    <SelectContent>
      {UOM_OPTIONS[category].map(u => (
        <SelectItem key={u} value={u} className="text-xs">
          {UOM_LABEL[u] ?? u}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

**Rules:**
- SelectTrigger: `h-8 min-w-fit px-2 border-muted bg-muted/40 text-xs whitespace-nowrap`
- SelectItem: `text-xs`
- Input precision displayed: `toFixed(6)` prevents rounding artifacts
- Changing units must NOT re-convert the stored base value

---

## 4. UoM System

### 4.1 Base units (always stored in form)

```ts
// lib/uom.ts
export const BASE_UNITS: Record<UomCategory, string> = {
  length:              'mm',
  gaugePressure:       'kPag',
  absolutePressure:    'kPa',
  temperature:         'C',
  volumeFlow:          'm3/h',
  ventRate:            'Nm3/h',
  energy:              'kJ/kg',
  thermalConductivity: 'W/(m·K)',
  heatTransferCoeff:   'W/(m²·K)',
  // add new categories here
}
```

### 4.2 Available units per category

```ts
export const UOM_OPTIONS: Record<UomCategory, string[]> = {
  length:              ['mm', 'in', 'm', 'cm', 'ft'],
  gaugePressure:       ['kPag', 'barg', 'psig', 'kg/cm2g'],
  absolutePressure:    ['kPa', 'bar', 'psi', 'atm'],
  temperature:         ['C', 'F', 'K'],
  volumeFlow:          ['m3/h', 'ft3/h'],
  ventRate:            ['Nm3/h', 'MSCFD', 'ft3/h'],
  energy:              ['kJ/kg', 'kcal/kg', 'Btu/lb'],
  thermalConductivity: ['W/(m·K)', 'Btu/(h·ft·°F)', 'kcal/(h·m·K)'],
  heatTransferCoeff:   ['W/(m²·K)', 'Btu/(h·ft²·°F)', 'kcal/(h·m²·K)'],
}
```

### 4.3 Display labels (ASCII → unicode)

```ts
export const UOM_LABEL: Record<string, string> = {
  'mm': 'mm',   'in': 'in',   'm': 'm',   'cm': 'cm',   'ft': 'ft',
  'C': '°C',    'F': '°F',    'K': 'K',
  'kPag': 'kPag', 'barg': 'barg', 'psig': 'psig',
  'm3/h': 'm³/h',  'ft3/h': 'ft³/h',
  'Nm3/h': 'Nm³/h',  'MSCFD': 'MSCFD',
  'kJ/kg': 'kJ/kg', 'kcal/kg': 'kcal/kg', 'Btu/lb': 'Btu/lb',
  'W/(m·K)': 'W/(m·K)',
  'W/(m²·K)': 'W/(m²·K)',
  // …add more as needed
}
```

### 4.4 uomStore

```ts
// lib/store/uomStore.ts
export const useUomStore = create<UomState>()(
  persist(
    (set) => ({
      units: { ...BASE_UNITS },
      setUnit: (category, unit) =>
        set(s => ({ units: { ...s.units, [category]: unit } })),
    }),
    {
      name: 'APP_NAME-uom-prefs',   // ← change per app
      migrate: (persistedState: any) => {
        // always merge — adds missing categories on schema evolution
        if (persistedState?.state?.units) {
          persistedState.state.units = { ...BASE_UNITS, ...persistedState.state.units }
        }
        return persistedState
      },
    }
  )
)
```

**Critical:** always include `migrate` so new categories don't silently drop.

---

## 5. Form Architecture

### 5.1 Setup (`page.tsx`)

```tsx
const form = useForm<CalculationInput>({
  resolver: zodResolver(calculationInputSchema),
  defaultValues: createDefaultValues(),
  mode: 'onChange',
})

return (
  <FormProvider {...form}>
    <form onSubmit={...}>
      <InputPanel />
      <ResultsPanel />
    </form>
  </FormProvider>
)
```

### 5.2 Field patterns

| Scenario | Pattern |
|---|---|
| Simple text / number | `{...register("fieldName", { valueAsNumber: true })}` |
| Unit-convertible number | `<Controller name="…"> → <UomInput />` |
| Enum / select | `<Controller name="…"> → <Select />` |
| Dynamic list | `useFieldArray` + `fields.map(…)` |
| Conditional fields | `const value = watch("field")` → conditional render |

### 5.3 Validation schema (`inputSchema.ts`)

```ts
export const calculationInputSchema = z.object({
  // always in base units
  diameter: z.number().positive(),
  // NaN-tolerant optional pattern
  latentHeat: z.number().positive().optional().or(z.nan().transform(() => undefined)),
}).superRefine((data, ctx) => {
  // cross-field validations here
})
```

**Rules:**
- All numeric fields validated in **base units**
- Empty numeric inputs produce `NaN` via `valueAsNumber` — use `nanOptional*` helpers
- Cross-field logic in `.superRefine()` (e.g., insulation fields required when insulated)

---

## 6. Results / Output Display

### 6.1 Results panel state machine

```
calculationResult === null && validationIssues === null
  → <RequirementsChecklist />   (show what the user still needs to fill)

calculationResult === null && validationIssues.length > 0
  → <ValidationIssuesCard />    (schema rejected data that looked complete)

calculationResult !== null
  → <DesignSummaryCard />       (top-level KPIs)
  → <SchematicCard />           (SVG visual of the system)
  → <DetailResultCard1 />
  → <DetailResultCard2 />
```

### 6.2 Summary card (KPI metrics)

```tsx
// 3 KPIs in a row, centred
<div className="grid grid-cols-3 gap-4 text-center">
  {metrics.map(m => (
    <div key={m.label}>
      <p className="text-xs text-muted-foreground">{m.label}</p>
      <p className="text-xl font-bold font-mono tabular-nums">{m.value}</p>
      <p className="text-xs text-muted-foreground">{m.unit}</p>
    </div>
  ))}
</div>
```

Container card: `border-primary/30 bg-primary/5`

### 6.3 Detail result rows

```tsx
// Divided rows pattern
<div className="rounded-md border overflow-hidden divide-y text-xs">
  {/* Section header */}
  <div className="px-3 py-1.5 bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
    {sectionTitle}
  </div>
  {/* Data rows */}
  <div className="flex justify-between items-center px-3 py-1.5">
    <span>{label}</span>
    <span className="font-mono tabular-nums">{value} <span className="text-muted-foreground">{unit}</span></span>
  </div>
  {/* Total / emphasis row */}
  <div className="flex justify-between items-center px-3 py-1.5 bg-muted/30 font-semibold">
    …
  </div>
</div>
```

**Rules:**
- All numeric result values: `font-mono tabular-nums`
- Units inline: `text-muted-foreground` (lighter weight than value)
- Total/design rows: `bg-muted/30 font-semibold`
- Section sub-headers: `uppercase tracking-wide text-muted-foreground text-xs`

### 6.4 Unit conversion in outputs

```tsx
const { units } = useUomStore()
const displayUnit = units.ventRate   // or whatever category

const displayValue = convertUnit(baseValue, BASE_UNITS.ventRate, displayUnit)
// render: {displayValue.toFixed(2)} {UOM_LABEL[displayUnit] ?? displayUnit}
```

---

## 7. Empty States & Loading

### 7.1 No-data placeholder (tables, lists)
```tsx
<div className="rounded-md border border-dashed py-3 text-center">
  <p className="text-xs text-muted-foreground">No items — add one if applicable</p>
</div>
```

### 7.2 Pending calculated value
```tsx
<p className="text-sm italic text-muted-foreground text-center py-4">
  Enter valid inputs to see results.
</p>
```

### 7.3 Loading / saving button states
```tsx
// Three states: idle → loading → success (auto-resets after ~1.8 s)
{isSaving ? (
  <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
) : saved ? (
  <><Check className="h-4 w-4 text-green-500" />Saved!</>
) : (
  <><Save className="h-4 w-4" />Save</>
)}
```

### 7.4 Error state
```tsx
{error && <p className="text-xs text-destructive mt-1">{error}</p>}
// auto-dismiss pattern: setTimeout(() => setError(null), 4000)
```

### 7.5 Collapsible optional section
```tsx
const [open, setOpen] = useState(false)

<button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between ...">
  <span>{title}</span>
  <span className="text-xs text-muted-foreground">{open ? 'Collapse' : 'Expand (optional)'}</span>
  <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
</button>
{open && <div className="mt-3 space-y-3">…</div>}
```

### 7.6 Status badge in section header
```tsx
// Live (has data)
<Badge variant="secondary" className="text-xs">Live</Badge>

// Pending
<Badge variant="outline" className="text-xs text-muted-foreground">Pending input</Badge>

// Error / invalid
<Badge variant="outline" className="text-xs text-orange-600">2 issues</Badge>
```

---

## 8. Action Menu & Dialogs

### 8.1 Top-bar ActionMenu pattern
```tsx
// All major actions live in a single dropdown
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="sm" className="gap-2">
      <Menu className="h-4 w-4" />
      <span className="sr-only sm:not-sr-only">Actions</span>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => setLinkOpen(true)}>…</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={() => setLoadOpen(true)}>…</DropdownMenuItem>
    <DropdownMenuItem onClick={() => setSaveOpen(true)}>…</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={handleClear}>…</DropdownMenuItem>
    <DropdownMenuItem onClick={handleExport} disabled={!result}>…</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

{/* Render dialogs in controlled mode outside the dropdown */}
<SaveCalculationButton controlledOpen={saveOpen} onControlledOpenChange={setSaveOpen} ... />
<LoadCalculationButton controlledOpen={loadOpen} onControlledOpenChange={setLoadOpen} ... />
```

### 8.2 Dialog sizing
```tsx
<DialogContent className="sm:max-w-md">  // narrow (save, rename)
<DialogContent className="sm:max-w-lg">  // medium (load list)
<DialogContent className="sm:max-w-2xl"> // wide (metadata, revisions)
```

---

## 9. Styling Reference

### 9.1 Color tokens (CSS variables)

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--background` | Slate 50 | Slate 900 | Page background |
| `--foreground` | Slate 900 | Slate 100 | Body text |
| `--card` | White 80% | Slate 800 70% | Card surfaces (glass) |
| `--primary` | Sky 600 | Sky 400 | Actions, links, focus rings |
| `--secondary` | Amber 500 | Amber 400 | Accent badges |
| `--muted` | Slate 100 | Slate 800 | Subtle backgrounds |
| `--muted-foreground` | Slate 600 | Slate 400 | Labels, hints, captions |
| `--destructive` | Red 500 | Red 400 | Errors, delete actions |
| `--border` | Black 8% | White 8% | All borders & dividers |

### 9.2 Typography

| Class | Size | Usage |
|---|---|---|
| `text-xs` | 12 px | Field hints, table headers, badges, unit labels |
| `text-sm` | 14 px | Descriptions, secondary text, dialog body |
| `text-base` | 16 px | Section titles (`CardTitle`), form labels |
| `text-xl` | 20 px | KPI values in summary cards |
| `font-medium` | 500 | Field labels, FieldRow labels |
| `font-semibold` | 600 | Section headings, total rows |
| `font-bold` | 700 | Large KPI numbers |
| `font-mono tabular-nums` | mono | All numeric result values |

### 9.3 Spacing

| Pattern | Class | Use |
|---|---|---|
| Form field internal | `space-y-1` | Label → input → hint/error |
| Form grid columns | `gap-3` | Side-by-side fields |
| Section content | `space-y-4` | Rows within a SectionCard |
| Inter-section | `space-y-4` | Between SectionCards in InputPanel |
| Page columns | `gap-6` | Between left and right panels |
| Inline icon+text | `gap-2` | Buttons, badges, row labels |
| Compact inline | `gap-1.5` | UomInput gap between field and selector |

### 9.4 Component-specific classes

```
Card:            shadow-sm rounded-lg border
SectionCard:     + CardHeader pb-3, Separator, CardContent space-y-4
Input:           h-9 (default), h-7 (table rows), h-8 (compact forms)
Button:          size="sm" (actions), size="icon" (icon-only), gap-2 (icon+text)
Badge:           text-xs, variant="outline" | "secondary"
SelectTrigger:   h-8 min-w-fit px-2 border-muted bg-muted/40 text-xs whitespace-nowrap
UomInput:        flex items-center gap-1.5 (wrapper)
Table header:    bg-muted/50 border-b text-xs font-medium text-muted-foreground px-3 py-1.5
Table row:       border-b last:border-b-0 px-3 py-2 items-center
Table total row: bg-muted/30 font-semibold
Warning banner:  flex items-center gap-2 rounded-md border px-3 py-2 text-xs
```

### 9.5 Dark mode

Dark mode is handled entirely through CSS variables — no `dark:` utility classes required on individual elements. The `.dark` class on `<html>` switches all `--*` tokens.

Exception: glass panel overlay shadow uses:
```css
.dark .glass-panel { box-shadow: 0 4px 24px 0 rgba(0,0,0,0.4); }
```

---

## 10. Save / Load Architecture

### 10.1 What is saved

`getValues()` from React Hook Form captures the current form state. Since all fields store **base units**, the persisted JSON is always unit-agnostic.

```ts
// SaveCalculationButton
const inputs  = getValues()           // base units, no conversion needed
const results = calculationResult     // raw API response
await save(name, inputs, results, equipmentId, metadata, revisionHistory)
```

### 10.2 What is loaded

```ts
// LoadCalculationButton — normalizeLoadedInput()
for (const key of NUMERIC_KEYS) {
  mutable[key] = toNumberOrUndefined(source[key])  // parse as-is, no conversion
}
reset(normalizedInputs)   // restores form to base unit values
```

UoM preferences are **not** saved with the calculation — they live separately in `localStorage` and persist independently.

### 10.3 Schema evolution

When adding fields to `CalculationInput`, the load normalizer must handle missing keys gracefully:
```ts
mutable[newField] = toNumberOrUndefined(source[newField]) ?? DEFAULT_VALUE
```

When adding UoM categories, the `migrate` function in `uomStore` fills them in automatically.

---

## 11. Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Component file | PascalCase `.tsx` | `UomInput.tsx`, `SectionCard.tsx` |
| Utility / lib file | camelCase `.ts` | `uomStore.ts`, `inputSchema.ts` |
| Directory | kebab-case | `sections/`, `results/`, `lib/store/` |
| React component | PascalCase function | `function DesignSummaryCard()` |
| Props interface | `${Name}Props` | `interface SectionCardProps` |
| Event handler | `handle*` | `handleClear`, `handleExport` |
| Boolean check | `is*` / `has*` | `isInsulated`, `hasError` |
| Derived display value | `*Display` | `inTotalDisplay`, `displayUnit` |
| Store | `use*Store` | `useUomStore`, `useCalculatorStore` |
| Zod schema | `*Schema` | `calculationInputSchema`, `streamSchema` |
| TypeScript type/interface | PascalCase | `CalculationInput`, `UomCategory` |
| Enum | PascalCase | `TankConfiguration`, `ApiEdition` |
| Constant object | UPPER_SNAKE | `BASE_UNITS`, `UOM_OPTIONS` |
| CSS variable | `--kebab-case` | `--muted-foreground`, `--primary` |
| Unit string (internal) | ASCII | `'m3/h'`, `'kPag'`, `'W/(m·K)'` |
| localStorage key | `app-name-purpose` | `vent-uom-prefs`, `ept-pes-theme` |

---

## 12. File Structure Template

```
apps/{app-name}/
├── src/
│   ├── app/
│   │   ├── layout.tsx            # root layout, providers
│   │   ├── providers.tsx         # ThemeProvider, etc.
│   │   └── calculator/
│   │       ├── page.tsx          # two-column layout, form setup, result trigger
│   │       ├── components/
│   │       │   ├── SectionCard.tsx
│   │       │   ├── FieldRow.tsx
│   │       │   ├── UomInput.tsx
│   │       │   ├── ActionMenu.tsx
│   │       │   ├── InputPanel.tsx
│   │       │   ├── ResultsPanel.tsx
│   │       │   ├── SaveCalculationButton.tsx
│   │       │   ├── LoadCalculationButton.tsx
│   │       │   └── ExportButton.tsx
│   │       ├── sections/         # form input sections (one per SectionCard)
│   │       │   ├── TankDetailSection.tsx
│   │       │   ├── FluidPropertiesSection.tsx
│   │       │   └── ...
│   │       └── results/          # result display components
│   │           ├── SummaryResult.tsx
│   │           ├── NormalVentingResult.tsx
│   │           └── ...
│   ├── lib/
│   │   ├── uom.ts                # BASE_UNITS, UOM_OPTIONS, UOM_LABEL, UomCategory
│   │   ├── calculations/         # pure calculation functions (no React)
│   │   ├── validation/
│   │   │   └── inputSchema.ts    # Zod schema, always validates in base units
│   │   ├── store/
│   │   │   ├── uomStore.ts       # Zustand + persist
│   │   │   └── calculatorStore.ts
│   │   └── constants.ts
│   ├── types/
│   │   └── index.ts              # CalculationInput, CalculationResult, etc.
│   └── api/
│       └── {feature}/
│           └── calculate/
│               └── route.ts      # Next.js route handler
└── ...
```

---

## 13. Checklist — New App Setup

- [ ] Copy `uom.ts`, `uomStore.ts`, `UomInput.tsx`, `SectionCard.tsx`, `FieldRow.tsx`
- [ ] Update `uomStore` localStorage key to `{app-name}-uom-prefs`
- [ ] Define `BASE_UNITS` for the new app's unit categories
- [ ] Build Zod input schema with base-unit validation
- [ ] Implement `createDefaultValues()` for form initialization
- [ ] Wire up `FormProvider` + `zodResolver` in `page.tsx`
- [ ] Add `migrate` to uomStore for any schema evolution
- [ ] Implement `normalizeLoadedInput()` in LoadCalculationButton
- [ ] Use `font-mono tabular-nums` for all numeric result values
- [ ] Verify save/load round-trips in base units (no conversion on load)
- [ ] Test dark mode (toggle `.dark` on `<html>`)
- [ ] Test at `xl` breakpoint for two-column layout
