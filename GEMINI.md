# Process Engineering Suite - AI Context

## Overview
This is a monorepo containing a suite of tools for process engineering, built with Next.js, Turborepo, and Material UI.

## Project Structure

### Apps
- **`apps/dashboard`**: The main landing page.
  - **Key Files**:
    - `src/app/page.tsx`: Dashboard layout with app cards.
    - `src/components/TopToolbar.tsx`: Navigation bar with theme toggle.
    - `src/contexts/ColorModeContext.tsx`: Manages global theme state.
    - `src/app/providers.tsx`: Wraps app with Theme and Context providers.
- **`apps/network-editor`**: Hydraulic network simulation tool.
  - **Key Files**:
    - `src/components/NetworkEditor.tsx`: Main canvas component (React Flow).
    - `src/store/useNetworkStore.ts`: Global state management (Zustand).
    - `src/app/page.tsx`: Editor layout, includes the floating close button.
    - `src/app/providers.tsx`: Theme provider that syncs with URL params.

### Packages
- **`packages/ui-kit`**: Shared UI components.
  - **Key Files**: `glassStyles.ts` (Glassmorphism styles).
- **`packages/physics-engine`**: Calculation logic.
  - **Key Files**: `src/types.ts` (Shared types like `PipeProps`, `NodeProps`).

## Design System
- **Glassmorphism**: Heavy use of translucent backgrounds (`backdropFilter: blur`), borders, and shadows.
- **Theming**: Light and Dark modes supported. Theme preference is synced from Dashboard to other apps via URL query parameters (`?theme=dark`).
- **Colors**:
  - Primary: Sky Blue (`#0284c7` / `#38bdf8`)
  - Secondary: Amber (`#f59e0b` / `#fbbf24`)
  - Background: Slate (`#f8fafc` / `#0f172a`)

## Recent Changes (as of Dec 4, 2025)
1.  **Dashboard Toolbar**: Added a top toolbar with branding, search, and theme toggle.
2.  **Theme Sync**: Implemented theme synchronization. Dashboard saves theme to `localStorage` and passes it to Network Editor via URL.
3.  **Network Editor Close Button**: Added a floating close button to return to the dashboard.
4.  **Build Fixes**: Resolved TypeScript errors related to `fluid.phase` and `recalculatePipeFittingLosses`.

## Development Notes
- **State Management**: The Network Editor uses `zustand` for complex state. Avoid prop drilling.
- **Type Safety**: Strict TypeScript is enforced. Be careful with shared types between `network-editor` and `physics-engine`.
- **Styling**: Use MUI `sx` prop with theme-aware values for consistency.
