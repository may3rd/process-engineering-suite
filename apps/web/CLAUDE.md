# apps/web

Main dashboard and hub app. Runs on **port 3000**. Acts as the unified entry point — it reverse-proxies all other apps via Next.js rewrites.

## Commands

```bash
bun run dev          # start dev server (port 3000)
bun run build        # production build
bun run check-types  # tsc
bun run lint         # eslint
```

From repo root: `bun turbo run dev --filter=web`

## Tech Stack

- **Next.js 16 / React 19** — App Router (`src/app/`)
- **MUI v7** — all UI; use `sx` prop for styling
- **Framer Motion** — animations
- **Zustand** — global state

## Routing / Rewrites

`next.config.ts` rewrites sub-paths to each app's dev server:

| Path | App | Port |
|------|-----|------|
| `/network-editor/*` | network-editor | 3002 |
| `/psv/*` | psv | 3003 |
| `/venting-calculation/*` | venting-calculation | 3005 |
| `/docs/*` | docs | (docs app) |

All other apps must be running for their routes to work under `web`.

## Structure

```
src/
  app/          # Next.js App Router pages & layouts
  components/   # Shared dashboard components
  contexts/     # React contexts
```

## Notes

- No test framework configured — add Vitest if tests are needed
- Rewrite targets differ between Vercel deployment and local dev (see `next.config.ts`)
