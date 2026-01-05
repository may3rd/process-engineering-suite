# Design Agents

This is the Process Design Agents application, an AI-powered process design workbench.

## Overview

The Design Agents app provides a step-by-step workflow for process design, utilizing multiple AI agents to assist in the design process. The workflow includes:

1. Process Requirements Analysis
2. Innovative Research
3. Conservative Research
4. Concept Selection
5. Component List Research
6. Design Basis Analysis
7. Flowsheet Design
8. Equipment & Stream Catalog
9. Stream Property Estimation
10. Equipment Sizing
11. Safety & Risk Analysis
12. Project Approval

## Architecture

- **Frontend**: Next.js with Material UI
- **State Management**: Zustand with persistence
- **Styling**: Material UI with custom themes
- **Build Tool**: Next.js

## Components

- `AppShell`: Main layout component
- `AgentStepper`: Workflow stepper
- `DesignWorkspace`: Tabbed interface for different views
- Various view components for each step

## Getting Started

1. Install dependencies: `bun install`
2. Run development server: `bun run dev`
3. Build for production: `bun run build`

## Contributing

Please follow the coding standards and add tests for new features.
