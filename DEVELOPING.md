# Developer Guidelines

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    - Dashboard: [http://localhost:3000](http://localhost:3000)
    - Network Editor: [http://localhost:3002](http://localhost:3002)

3.  **Build**:
    ```bash
    npm run build
    ```

## Project Structure

- **`apps/`**: Contains the Next.js applications.
- **`packages/`**: Contains shared packages.
    - `ui-kit`: Shared React components and styles.
    - `physics-engine`: Core calculation logic.

## Coding Standards

### TypeScript
- Strict mode is enabled. Avoid `any` whenever possible.
- Define interfaces/types for all props and state.
- Shared types should reside in `packages/physics-engine/src/types.ts` or `packages/shared`.

### Styling
- Use **Material UI (MUI)** components.
- Use the `sx` prop for styling.
- **Glassmorphism**: Use the shared `glassPanelSx` and `liquidGlassBorderSx` from `@eng-suite/ui-kit` for consistent panel styling.
- **Theming**: Ensure all colors are theme-aware. Use `theme.palette.mode` to switch between light and dark styles.
    - Dark Mode: `rgba(255, 255, 255, 0.1)` backgrounds.
    - Light Mode: `rgba(0, 0, 0, 0.05)` backgrounds.

### State Management
- Use **Zustand** for global application state (e.g., `useNetworkStore` in Network Editor).
- Use React Context for app-wide settings like Theme (`ColorModeContext`).

## Contribution Workflow

1.  Create a new branch for your feature or fix.
2.  Implement your changes, following the coding standards.
3.  Run `npm run build` to ensure no TypeScript or build errors.
4.  Submit a Pull Request.

## Troubleshooting

- **Hydration Errors**: If you see hydration mismatch errors, check for browser extensions injecting code. We use `suppressHydrationWarning` in `layout.tsx` to mitigate this.
- **Type Errors**: If you encounter type mismatches between packages, ensure you have rebuilt the packages or that the types are correctly exported and imported.
