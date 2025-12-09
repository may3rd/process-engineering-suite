# PSV Sizing Application

A pressure safety valve (PSV) sizing and overpressure protection management tool, part of the Process Engineering Suite.

## Overview

This application helps engineers manage PSV/RD (Pressure Safety Valve / Rupture Disc) sizing for process plants. It provides:

- **Hierarchy Navigation**: Browse customers → plants → units → areas → projects
- **Protective System Management**: View and manage PSVs and RDs with status tracking
- **Overpressure Scenarios**: Document relief scenarios with API 521 code references
- **Sizing Calculations**: Size valves per ASME VIII / API 520 standards
- **Data Organization**: Attach files, notes, and link to protected equipment

## Quick Start

```bash
# From monorepo root
npm install
npm run dev

# Or run PSV app directly
cd apps/psv
npm run dev
```

The app runs on `http://localhost:3003` and is accessible via the dashboard at `http://localhost:3000/psv`.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: Material UI 7
- **State Management**: Zustand
- **Language**: TypeScript
- **Styling**: MUI sx prop with glassmorphism theme

## Project Structure

```
apps/psv/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   ├── contexts/         # React contexts (ColorMode)
│   ├── data/             # Mock data and types
│   └── store/            # Zustand state management
├── public/               # Static assets
└── next.config.ts        # Next.js configuration
```

## Current Status

**Prototype Phase** - The app uses mock data and demonstrates the intended UX flow. No backend integration yet.

### Implemented ✅
- Hierarchy browser (Customer → Plant → Unit → Area → Project)
- Protective system list with status cards
- Detail view with tabs (Overview, Scenarios, Sizing, Attachments)
- Theme toggle (dark/light mode)
- Dashboard integration with theme sync

### Pending 🚧
- Scenario editor component
- Sizing workspace with calculations
- Backend API integration
- Database connectivity
- User authentication

## Related Documentation

- [DEVELOPING.md](./DEVELOPING.md) - Development guide and architecture
- [GEMINI.md](./GEMINI.md) - AI context for continuity
- [product-overview.md](./product-overview.md) - Product requirements
