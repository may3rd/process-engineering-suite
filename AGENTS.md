# AI Agent Guidelines for Process Engineering Suite

This document provides build commands, testing procedures, and code style guidelines for agentic coding assistants working in this monorepo.

## Build Commands

**Always use `bun` instead of `npm` or `yarn`**

### Root Level (Monorepo)

```bash
# Build all packages and apps
bun turbo run build

# Run all linters across the project
bun turbo run lint

# Check TypeScript types everywhere
bun turbo run check-types

# Format code
bun run format

# Run development servers for all apps
bun turbo run dev --parallel
```

### TypeScript/Next.js Apps (apps/psv, apps/network-editor, apps/docs)

```bash
# Build specific app (run from app directory)
bun run build

# Run development server
bun run dev

# Lint code
bun run lint

# Type check
bun run check-types

# Run tests (Vitest)
bun run test              # Watch mode
bun run test:run          # Single run

# Run a single test file
TMPDIR=./.tmp vitest run path/to/test.test.tsx

# Run tests matching a pattern
TMPDIR=./.tmp vitest run -t "test name or pattern"
```

### Python Packages (services/calc-engine/hydraulics, services/calc-engine)

```bash
# From package directory
ruff check .              # Lint
ruff format .             # Format
mypy                      # Type checking
pytest                    # Run tests
pytest -v tests/test_specific.py  # Run single test file
pytest tests/test_specific.py::test_name  # Run specific test
pytest -k "pattern"       # Run tests matching pattern
```

## Code Style Guidelines

### TypeScript

- **Imports**: Named exports only (`export {MyClass}`), no default exports. Use ES6 modules
- **Variables**: `const` by default, `let` only when reassignment is needed. Never `var`
- **Types**: Strict mode enabled. Avoid `any`; prefer `unknown` or specific types. Be explicit for complex types
- **Formatting**: Explicit semicolons, single quotes for strings, template literals for interpolation
- **Naming**:
  - Classes/Interfaces/Types: `UpperCamelCase`
  - Variables/Functions: `lowerCamelCase`
  - Constants: `CONSTANT_CASE`
  - No underscore prefixes for private properties (use `private` modifier)
- **Classes**: Use `readonly` for properties never reassigned outside constructor. Use `private`/`protected` over default `public`
- **Equality**: Always use `===` and `!==`, never `==` or `!=`

### React/Next.js

- **State Management**: Use Zustand for global state, React Context for app-wide settings (e.g., Theme)
- **UI Components**: Use Material UI (MUI) components with `sx` prop for styling
- **Glassmorphism**: Import from `@eng-suite/ui-kit`:
  - `glassPanelSx` for panels
  - `liquidGlassBorderSx` for borders
  - `glassInputSx`, `glassSelectSx`, `glassRadioSx` for form elements
- **Theming**: Always use `theme.palette.mode` for conditional dark/light styles
  - Dark: `rgba(255, 255, 255, 0.1)` backgrounds
  - Light: `rgba(0, 0, 0, 0.05)` backgrounds
- **Input Panels**: Use iOS-style deferred commit inputs in Network Editor:
  - `IOSQuantityPage` - Numbers with/without units (Enter commits, Escape reverts)
  - `IOSTextInputPage` - Text input with deferred commit
  - `IOSPickerPage` - Selection, commits on select
  - Required prop: `onBack={() => navigator.pop()}`
  - Avoid `IOSNumberInputPage` in new code
- **Testing**: Vitest with jsdom environment, Testing Library for component tests
- **No comments**: Do not add comments unless explicitly requested

### Python

- **Imports**: Separate lines, grouped: standard library, third-party, local
- **Formatting**: 4-space indentation (no tabs), 80-100 char line limit (ruff: 100)
- **Naming**:
  - Classes: `PascalCase`
  - Functions/Variables/Modules: `snake_case`
  - Constants: `ALL_CAPS_WITH_UNDERSCORES`
  - Private: `_leading_underscore`
- **Type Annotations**: Required for all public APIs. Use Python 3.10+ type syntax
- **Exceptions**: Never use bare `except:`. Use specific exceptions
- **Docstrings**: Triple double quotes `"""` with one-line summary, `Args:`, `Returns:`, `Raises:` sections
- **No comments**: Do not add comments unless explicitly requested

### Error Handling & Validation

- **Inputs**: Real-time validation with visible error highlighting
- **Warnings**: Show warnings for physically possible but suspicious values
- **Feedback**: Provide detailed context explaining physical/regulatory basis for errors
- **Boundaries**: Use Pydantic models for Python validation; TypeScript types + runtime checks for frontend

## Testing Best Practices

### TypeScript (Vitest)

- Use `describe`, `it`, `expect` from `vitest`
- Use `@testing-library/react` for component tests
- Mock functions with `vi.fn()`
- Test user interactions with `@testing-library/user-event`

### Python (pytest)

- Use descriptive test names: `test_specific_scenario`
- Create helper functions (`make_fluid()`, `make_section()`) for test fixtures
- Use `conftest.py` for shared fixtures
- Write tests for edge cases and error conditions
- Test both success and failure paths

## Performance Standards

- Engineering calculations: <100ms feedback on input changes
- PDF generation: <2 seconds
- Diagramming: Maintain 60fps with large networks
- Optimize calculations to prevent blocking the UI

## Architecture Patterns

### Hydraulic Engine (Python)

- **Models**: Typed dataclasses for fluids, components, pipe sections, outputs, networks
- **Calculators**: Dedicated calculator per loss component (friction, fittings, elevation, valves, orifices, user loss)
- **Solver**: Coordinates per-section calculations, aggregates totals, propagates inlet/outlet states
- **IO Layer**: YAML config input, JSON/CSV output
- **Extension**: Add new calculators by implementing `LossCalculator` protocol

### Frontend

- **App Router**: Next.js App Router for routing
- **State**: Zustand stores with actions for updates
- **API**: REST endpoints from FastAPI backend
- **Shared Types**: Define in shared packages (`packages/physics-engine/src/types.ts`)

## Repository Structure

- `apps/`: Next.js applications (api, design-agents, docs, network-editor, psv, web)
- `packages/`: Shared packages (api-client, api-std, eslint-config, physics-engine, schemas, tsconfig, typescript-config, ui, ui-kit, utils, vessels)
- `conductor/`: Development guidelines and track metadata
- `infra/`: Docker and infrastructure configs
- `services/`: Backend services (calc-engine)

## Single Image Deployment (Postgres Included)

- The root `Dockerfile` builds a single image that runs apps, API, and PostgreSQL via `supervisord`.
- Runtime environment variables: `POSTGRES_PASSWORD`, `POSTGRES_USER`, `POSTGRES_DB`. `DATABASE_URL` is optional and will be derived if not set.
- Persist data with a named volume mounted to `/var/lib/postgresql/data`.
- See `README.md` for the full `docker run` examples and notes on backups.

When making changes, always match the existing code style and patterns in the file you're editing. Run `bun run lint` (TypeScript) or `ruff check` (Python) before committing.

# AI Agent Guidelines for Process Engineering Suite (PES)

This document defines **architecture, execution model, build commands, testing procedures, and code style rules**
for automated coding agents (Codex) and human contributors working in this monorepo.

This file is **authoritative**. If any other document conflicts with it, **this file wins**.

---

## Rule Zero (Non-Negotiable)

> **No engineering equations are implemented in TypeScript. Ever.**

- TypeScript is used for **UI, orchestration, APIs, persistence, and visualization**
- **All engineering calculations live in Python**
- If a task requires equations and the target file is TypeScript, **stop and relocate to Python**

Violating this rule invalidates calculation traceability and introduces technical debt.

---

## High-Level Architecture (Hybrid-by-Design)

```
UI (TypeScript)
  │
  ▼
API / Orchestrator (TypeScript)
  │   JSON / OpenAPI
  ▼
Calculation Engine (Python)
  │
  ▼
Engineering Database
```

### Responsibilities by Layer

| Layer | Language | Responsibilities | Explicitly Forbidden |
|---|---|---|---|
| UI / Editors | TypeScript | Input forms, visualization, interaction | Engineering math |
| API / Orchestrator | TypeScript | Auth, RBAC, run lifecycle, persistence, reporting | Equations, correction factors |
| Calculation Engine | Python | All engineering equations, standards, checks | UI logic, auth |
| Database | SQL / Object | Inputs, outputs, provenance, versions | Hidden logic |

---

## Execution Model (Authoritative)

All engineering calculations use a **worker-based execution model** to ensure scalability and predictable performance.

### Execution Principles

- API threads **must never** execute engineering math
- Python calculations run in **isolated worker processes**
- Concurrency is **explicitly bounded**
- Excess requests are **queued**, not blocked or rejected

### Execution Flow

```
UI (TypeScript)
  │
  ▼
API / Orchestrator (TypeScript)
  │  - validate schema
  │  - persist input snapshot
  │  - assign calc_id + version
  ▼
Job Dispatch
  │
  ▼
Python Worker Pool (multiprocess)
  │  - deterministic calculation
  │  - units, correlations, checks
  │  - results + provenance
  ▼
API Persistence & Reporting
```

### Concurrency Model

- Process-based workers (not threads)
- Typical sizing:
  - 1 worker per CPU core
  - Start with 2–4 workers per instance
- Queueing is acceptable and preferred over blocking

Engineers may see:
> “Calculating… (queued)”

This is expected behavior.

### Sync vs Async Policy

| Calculation Type | Mode |
|---|---|
| RO sizing, venting, valve sizing | Synchronous |
| Multiphase hydraulics, large networks | Asynchronous (job ID + polling) |

### Forbidden Patterns

- Spawning Python per request
- Running math inside TypeScript
- Blocking API threads with long calculations
- Duplicating formulas across languages

---

## Repository Structure (Authoritative)

```
process-engineering-suite/
├─ apps/
│  ├─ api/               # Orchestration API (TypeScript)
│  ├─ design-agents/     # Design agent tooling (TypeScript)
│  ├─ docs/              # Documentation site (TypeScript)
│  ├─ network-editor/    # Network topology editor (TypeScript)
│  ├─ psv/               # PSV workflow app (TypeScript)
│  └─ web/               # Dashboard UI (TypeScript)
│
├─ services/
│  └─ calc-engine/       # Engineering calculations (Python ONLY)
│     ├─ hydraulics/      # Network hydraulics (Python)
│     └─ pes_calc/        # PES calculation engine (Python)
│
├─ packages/
│  ├─ api-client/        # API client SDKs (TypeScript)
│  ├─ api-std/           # API standards and shared contracts (TypeScript)
│  ├─ eslint-config/     # ESLint shared configuration
│  ├─ physics-engine/    # Shared physics helpers (TypeScript)
│  ├─ schemas/           # Schemas and contracts (TypeScript)
│  ├─ tsconfig/          # Shared tsconfig presets
│  ├─ typescript-config/ # TypeScript tooling defaults
│  ├─ ui/                # Shared UI primitives (TypeScript)
│  ├─ ui-kit/            # Shared UI components (TypeScript)
│  ├─ utils/             # Shared utilities (TypeScript)
│  └─ vessels/           # Vessel sizing (Python)
│
├─ docs/
│  ├─ architecture/      # ADRs and diagrams
│  └─ standards/         # Engineering standards references
│
├─ infra/                # Docker and deployment
└─ AGENTS.md
```

---

## Engineering Scope (Year-1)

Excel calculators being replaced:

- Hydraulics (single-phase via Network Editor, multi-phase via PES)
- Restriction orifice sizing
- Pump calculations
- Control valve sizing
- Vessel and tank sizing
- 2-phase and 3-phase separators
- API 2000 atmospheric / low-pressure tank venting

**PSV sizing is handled by the PSV Suite and integrated, not re-implemented.**

---

## Build Commands

**Always use `bun`. Never `npm` or `yarn`.**

### Root Level (Monorepo)

```bash
bun turbo run build
bun turbo run lint
bun turbo run check-types
bun run format
bun turbo run dev --parallel
```

---

### TypeScript / Next.js Apps

```bash
bun run build
bun run dev
bun run lint
bun run check-types
bun run test
bun run test:run
```

---

### Python Calculation Engine

```bash
ruff check .
ruff format .
mypy
pytest
pytest -v tests/test_specific.py
```

---

## Code Style Guidelines

### TypeScript

- Named exports only (no default exports)
- `const` by default, no `var`
- Strict typing; avoid `any`
- Explicit semicolons, single quotes
- `===` / `!==` only
- **No comments unless explicitly requested**

### React / Next.js

- Zustand for global state
- Material UI (MUI) with `sx`
- Use `@eng-suite/ui-kit` glass styles
- iOS-style deferred commit inputs in Network Editor
- Vitest + Testing Library

---

### Python

- 4-space indentation, max 100 chars
- Type annotations required for public APIs
- No bare `except`
- Docstrings required
- **No comments unless explicitly requested**

---

## Testing Policy

- Golden-case regression tests derived from Excel are mandatory
- Numerical tolerance must be explicit
- CI must fail if results change without a version bump
- API records `calc_id`, `calc_version`, `schema_version` for every run

---

## Performance Standards (User-Perceived)

- Most calculations: < 1 second
- Complex cases: 1–3 seconds
- Queueing acceptable
- Deterministic results > speed

---

## Guidance for Automated Agents (Codex)

When generating or modifying code:

- Put engineering logic **only** in `services/calc-engine/`
- Put UI, orchestration, persistence in `apps/` or `packages/`
- Respect the worker execution model
- Never introduce math into TypeScript
- Never duplicate calculation logic

Violations introduce latency, inconsistency, and loss of trust.

---

## Summary

PES is an **engineering system**, not a spreadsheet replacement app.

Correctness, traceability, scalability, and reproducibility take priority over convenience or development speed.
