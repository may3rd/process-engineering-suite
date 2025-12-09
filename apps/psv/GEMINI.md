# PSV Application - AI Context

## Overview
PSV (Pressure Safety Valve) sizing application within the Process Engineering Suite monorepo. Built with Next.js 16, Material UI 7, and Zustand.

## Project Structure

### Apps
- **`apps/psv`**: This PSV sizing application (port 3003)
- **`apps/web`**: Main dashboard (port 3000)
- **`apps/network-editor`**: Hydraulic network tool (port 3002)

### Key Files
- `src/app/page.tsx` - Main page with conditional rendering
- `src/app/layout.tsx` - Root layout with fixed TopToolbar
- `src/app/providers.tsx` - Theme provider with URL param sync
- `src/store/usePsvStore.ts` - Zustand store for navigation state
- `src/data/mockData.ts` - Mock data with query helpers
- `src/data/types.ts` - TypeScript domain types

### Components
- `TopToolbar.tsx` - Header using `TopFloatingToolbar` from ui-kit
- `Breadcrumbs.tsx` - Navigation path with clickable segments
- `HierarchyBrowser.tsx` - List browser for Customer/Plant/Unit/Area/Project
- `ProtectiveSystemList.tsx` - PSV/RD cards with status chips
- `ProtectiveSystemDetail.tsx` - Tabbed detail view (Overview/Scenarios/Sizing/Attachments)

## Design System
- **Glassmorphism**: `backdropFilter: blur`, translucent backgrounds
- **Theme**: Dark/Light modes synced from dashboard via `?theme=` URL param
- **Colors**: Primary sky blue (#0284c7), Secondary amber (#f59e0b)
- **Border Radius**: 14px small, 20px large containers

## Current State (Dec 9, 2025)

### Completed
1. App scaffolding (Next.js, MUI, Zustand)
2. Mock data layer with realistic petrochemical examples
3. Hierarchy navigation (Customer → Plant → Unit → Area → Project)
4. Protective system list with status cards
5. Detail view with 4 tabs (Overview, Scenarios, Sizing, Attachments)
6. Theme toggle and dashboard integration
7. TopToolbar with back button to dashboard
8. Fixed toolbar positioning

### Configuration Notes
- `tsconfig.json` extends `../../packages/tsconfig/base.json` (matches network-editor)
- `next.config.ts` has `basePath: "/psv"` and `transpilePackages` for shared packages
- Path alias `@eng-suite/physics` maps to `../../packages/physics-engine/src/index.ts`

## Development Notes
- **State**: Uses Zustand, no prop drilling
- **Navigation**: Store-based, not URL routing
- **Data**: All mock, no backend yet
- **Styling**: MUI sx prop with glassmorphism patterns

## Next Tasks
1. Implement `ScenarioEditor.tsx` for overpressure scenario CRUD
2. Implement `SizingWorkspace.tsx` for PSV calculations
3. Add dynamic routes (`/projects/[id]`, `/psv/[id]`)
4. Backend API integration, python FastAPI.
5. Database connectivity (see [docs/DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md))
