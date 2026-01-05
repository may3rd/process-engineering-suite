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

### Python Packages (packages/hydraulics, packages/vessels)

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

- `apps/`: Next.js applications (psv, network-editor, docs, api, web)
- `packages/`: Shared packages (ui-kit, physics-engine, hydraulics, vessels, typescript-config)
- `conductor/`: Development guidelines and track metadata
- `infra/`: Docker and infrastructure configs

## Single Image Deployment (Postgres Included)

- The root `Dockerfile` builds a single image that runs apps, API, and PostgreSQL via `supervisord`.
- Runtime environment variables: `POSTGRES_PASSWORD`, `POSTGRES_USER`, `POSTGRES_DB`. `DATABASE_URL` is optional and will be derived if not set.
- Persist data with a named volume mounted to `/var/lib/postgresql/data`.
- See `README.md` for the full `docker run` examples and notes on backups.

When making changes, always match the existing code style and patterns in the file you're editing. Run `bun run lint` (TypeScript) or `ruff check` (Python) before committing.
