# Developing the PSV Application

## Development Setup

### Prerequisites
- Node.js 18+
- npm 9+

### Running Locally

```bash
# From monorepo root
npm install
npm run dev

# PSV app runs on http://localhost:3003
# Dashboard runs on http://localhost:3000
# Access PSV via dashboard: http://localhost:3000/psv
```

### Building

```bash
cd apps/psv
npm run build
```

## Architecture

### State Management

The app uses **Zustand** for global state:

```
src/store/usePsvStore.ts
├── selection        # Current hierarchy selection (customerId, plantId, etc.)
├── selectedProject  # Derived: full Project object
├── selectedPsv      # Derived: full ProtectiveSystem object
└── actions          # selectCustomer, selectPlant, selectProject, etc.
```

### Component Structure

```
TopToolbar          # Fixed header with back button, search, theme toggle
├── Breadcrumbs     # Shows navigation path
├── HierarchyBrowser # Customer/Plant/Unit/Area/Project list
├── ProtectiveSystemList # PSV/RD cards for selected project
└── ProtectiveSystemDetail # Tabbed detail view
    ├── Overview Tab
    ├── Scenarios Tab
    ├── Sizing Tab
    └── Attachments Tab
```

### Data Layer

Currently using **mock data** in `src/data/`:

- `types.ts` - TypeScript interfaces for domain model
- `mockData.ts` - Sample data with petrochemical examples

Helper functions in `mockData.ts`:
- `getCustomers()` - All customers
- `getPlants(customerId)` - Plants for customer
- `getUnits(plantId)` - Units for plant
- `getAreas(unitId)` - Areas for unit
- `getProjects(areaId)` - Projects for area
- `getProtectiveSystems(projectId)` - PSVs for project

## Key Patterns

### Theme Sync

Theme is passed from dashboard via URL parameter:
1. Dashboard's `AppCard` adds `?theme=dark` or `?theme=light`
2. PSV's `providers.tsx` reads `searchParams.get('theme')`
3. Falls back to `localStorage` if no param

### Shared Components

Uses `@eng-suite/ui-kit` for:
- `TopFloatingToolbar` - Consistent header across apps
- `IOSListGroup`, `IOSListItem` - iOS-style list components
- `glassStyles` - Glassmorphism styling utilities

### Navigation

Uses Zustand store for navigation (not URL routing):
- Clicking items updates store selection
- Breadcrumbs read from store and allow navigation back
- Main page conditionally renders based on selection state

## Next Steps for Development

### Phase 1: Editors
- [ ] Create `ScenarioEditor.tsx` for overpressure scenarios
- [ ] Create `SizingWorkspace.tsx` for calculations
- [ ] Add CRUD operations to mock data

### Phase 2: Backend Integration
- [ ] Set up API routes in Next.js
- [ ] Connect to database (see [docs/DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md))
- [ ] Implement authentication

### Phase 3: Calculations
- [ ] Integrate PSV sizing formulas (API 520)
- [ ] Add validation per design codes
- [ ] Generate calculation reports

## Code Conventions

- Use MUI `sx` prop for styles (not styled-components)
- Theme-aware colors: `isDark ? 'dark-color' : 'light-color'`
- Glassmorphism: `backdropFilter: 'blur(12px)'`
- Border radius: 14px for small, 20px for large containers
