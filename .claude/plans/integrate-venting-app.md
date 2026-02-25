# Plan: Integrate Venting Calculator into Process Engineering Suite

## Context

The [Venting](https://github.com/may3rd/Venting) repo is a Tank Venting Calculator (API 2000) built with **Next.js 14 + Tailwind CSS + shadcn/ui**. It needs to be added to the monorepo at `apps/venting-calculation`, blending with the suite's existing MUI-based glass-morphism theme.

**Key challenge:** The Venting app uses Tailwind/shadcn while the monorepo uses MUI. We'll use a **hybrid approach** -- keep all Tailwind/shadcn components as-is, add a thin MUI layer for the shared `TopFloatingToolbar` and theme toggle, and bridge both systems via CSS custom properties mapped to the suite's color palette.

---

## Step 1: Clone Venting repo into `apps/venting-calculation`

- Clone https://github.com/may3rd/Venting
- Move source files into `src/` subdirectory to match monorepo convention:
  - `app/` -> `src/app/`
  - `components/` -> `src/components/`
  - `lib/` -> `src/lib/`
  - `types/` -> `src/types/`
- Keep: `postcss.config.mjs`, `components.json`, `vitest.config.ts`, `__tests__/`
- Delete: original `package.json`, `next.config.mjs`, `tsconfig.json`, `tailwind.config.ts` (will be replaced)

## Step 2: Create monorepo config files

### `apps/venting-calculation/package.json`
- Name: `venting-calculation`, port **3005**
- Scripts matching PSV pattern (`apps/psv/package.json`)
- Dependencies:
  - **Keep from Venting**: Tailwind 4, Radix UI, shadcn utils (clsx, cva, tailwind-merge), lucide-react, react-hook-form, zod, zustand, @react-pdf/renderer
  - **Add for monorepo**: `@mui/material`, `@emotion/react`, `@emotion/styled`, `@mui/material-nextjs`, `@mui/icons-material`, `@eng-suite/ui-kit`
  - **Upgrade**: React 18 -> 19.2.0, Next.js 14 -> ^16.1.1
  - **Remove**: `next-themes` (replaced by monorepo's localStorage approach)

### `apps/venting-calculation/next.config.ts`
- `basePath: "/venting-calculation"`
- `transpilePackages: ["@eng-suite/ui-kit"]`
- Redirect `/` -> `/venting-calculation`

### `apps/venting-calculation/tsconfig.json`
- Extend `../../packages/tsconfig/base.json`
- Path alias: `@/*` -> `./src/*`

## Step 3: Create theme bridge (the core integration)

### `src/app/globals.css` -- Replace Venting's globals with monorepo-aligned CSS variables

Map the suite's palette into shadcn CSS custom properties so all shadcn components automatically use suite colors:

| CSS Variable | Dark | Light | Source |
|---|---|---|---|
| `--primary` | `#38bdf8` (Sky 400) | `#0284c7` (Sky 600) | Suite primary |
| `--secondary` | `#fbbf24` (Amber 400) | `#f59e0b` (Amber 500) | Suite secondary |
| `--background` | `#0f172a` (Slate 900) | `#f8fafc` (Slate 50) | Suite bg |
| `--foreground` | `#f1f5f9` (Slate 100) | `#0f172a` (Slate 900) | Suite text |
| `--card` | `rgba(30,41,59,0.7)` | `rgba(255,255,255,0.8)` | Suite paper (glass) |

Add glass-morphism utility class (`.glass-panel`) with `backdrop-filter: blur(10px)`.

### `src/app/providers.tsx` -- Hybrid MUI + Tailwind provider

- MUI `ThemeProvider` with same `getDesignTokens()` as other apps (reference: `apps/psv/src/app/providers.tsx`)
- Minimal MUI `CssBaseline` (body margin only -- let Tailwind handle the rest)
- **Theme bridge**: `useEffect` syncs `.dark` class on `<html>` for Tailwind dark mode
- Theme persistence via `localStorage` key `ept-pes-theme` + URL `?theme=` param support

### `src/contexts/ColorModeContext.tsx`
- Same pattern as `apps/psv/src/contexts/ColorModeContext.tsx`

## Step 4: Create layout with shared toolbar

### `src/app/layout.tsx`
- Load Inter font (copy `Inter-roman.var.woff2` from `apps/network-editor/src/app/fonts/`)
- Wrap in `<Providers>`
- Render `<TopToolbar />` at top

### `src/components/TopToolbar.tsx`
- Wrap `TopFloatingToolbar` from `@eng-suite/ui-kit`
- Props: `title="Tank Venting"`, `subtitle="API 2000 Venting Calculator"`, `icon=<Droplets />` (Lucide)
- Wire `onToggleTheme` + `isDarkMode` via `useColorMode()` and `useTheme()`

## Step 5: Adapt Venting calculator page

### `src/app/calculator/page.tsx`
- Remove the built-in header (title/subtitle) since `TopToolbar` now handles it
- Keep `<ExportButton />` inline (can't move to toolbar since it needs `FormProvider` context)
- Keep all other component structure as-is

## Step 6: Register app in web dashboard

### `apps/web/next.config.ts`
Add after line 47:
```ts
const ventingOrigin = createProxyTarget(
  "VENTING_URL",
  "https://process-engineering-suite-venting.vercel.app",
  "http://localhost:3005",
);
```
Add rewrite rule:
```ts
{ source: "/venting-calculation/:path*", destination: `${ventingOrigin}/venting-calculation/:path*` },
```

### `apps/web/src/app/page.tsx`
Add to `tools` array (after PSV entry):
```ts
{
  title: "Tank Venting Calculator",
  description: "Atmospheric & low-pressure storage tank venting per API 2000.",
  icon: <AirIcon fontSize="large" />,
  href: "/venting-calculation/calculator",
  status: "active" as const,
},
```

---

## Files to modify (existing)

| File | Change |
|---|---|
| `apps/web/next.config.ts` | Add venting proxy origin + rewrite |
| `apps/web/src/app/page.tsx` | Add AppCard entry + `AirIcon` import |

## Files to create (new)

| File | Purpose |
|---|---|
| `apps/venting-calculation/package.json` | Monorepo-aligned dependencies |
| `apps/venting-calculation/next.config.ts` | basePath + transpile config |
| `apps/venting-calculation/tsconfig.json` | Extends shared config |
| `apps/venting-calculation/postcss.config.mjs` | Tailwind PostCSS (from Venting) |
| `apps/venting-calculation/src/app/globals.css` | Theme bridge CSS variables |
| `apps/venting-calculation/src/app/providers.tsx` | Hybrid MUI + Tailwind provider |
| `apps/venting-calculation/src/app/layout.tsx` | Root layout with toolbar |
| `apps/venting-calculation/src/contexts/ColorModeContext.tsx` | Theme context |
| `apps/venting-calculation/src/components/TopToolbar.tsx` | Shared toolbar wrapper |
| `apps/venting-calculation/src/app/fonts/Inter-roman.var.woff2` | Font file (copy) |

## Files from Venting repo (keep as-is, move into `src/`)

- `src/app/calculator/` -- page + all calculator components
- `src/app/api/vent/` -- calculation API routes
- `src/components/ui/` -- all shadcn components (10 files)
- `src/lib/` -- calculations, lookups, hooks, store, validation, pdf, utils
- `src/types/` -- TypeScript types
- `__tests__/` -- test files

---

## Verification

1. `bun install` from repo root
2. `bun turbo run check-types --filter=venting-calculation` -- type check passes
3. `bun turbo run build --filter=venting-calculation` -- build succeeds
4. `bun run dev` -- start all apps
5. Navigate to `http://localhost:3000` -- Venting card appears on dashboard
6. Click card -> `http://localhost:3000/venting-calculation/calculator` loads
7. Toggle dark/light mode -- theme syncs correctly
8. Run calculations -- results appear, no API errors
9. Export PDF -- works correctly
10. `bun turbo run test --filter=venting-calculation` -- tests pass
