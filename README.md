# Process Engineering Suite

A unified platform for process design, hydraulic analysis, and equipment sizing. This monorepo contains multiple applications tailored for process engineers.

## Apps

- **Dashboard** (`apps/web`): The main entry point for the suite. Provides navigation to different tools and manages global settings like theme.
- **Network Editor** (`apps/network-editor`): A powerful tool for sketching and simulating fluid networks. Features include:
  - Drag-and-drop interface using React Flow.
  - Hydraulic calculations for incompressible flow.
  - Pipe and node property management.
  - Excel import/export capabilities.

## Packages

- **@eng-suite/ui-kit**: Shared UI components and styles, including the custom glassmorphism design system.
- **@eng-suite/physics**: Core physics engine for hydraulic calculations, unit conversions, and fluid properties.
- **@eng-suite/shared**: Shared utilities and types.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Monorepo Tool**: [Turborepo](https://turbo.build/)
- **UI Library**: [Material UI (MUI)](https://mui.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Diagramming**: [React Flow](https://reactflow.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)

## Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd process-engineering-suite
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

To start the development server for all apps:

```bash
npm run dev
```

- **Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Network Editor**: [http://localhost:3002](http://localhost:3002)

### Build

To build all apps and packages:

```bash
npm run build
```

### Docker Usage

#### Development Environment (With Hot Reload)
Run the entire suite (API, Web, Editor) with hot reloading enabled. Volume mounts ensure code changes are reflected immediately.

```bash
docker-compose -f infra/docker-compose.yml up --build
```
- **Web**: http://localhost:3000
- **Editor**: http://localhost:3002
- **API**: http://localhost:8000/docs

#### Production / Single Image Deployment
Build a single image containing all services (managed by supervisord). Suitable for deployment.

```bash
# Build
docker build -t process-engineering-suite .

# Run
docker run -p 3000:3000 -p 3002:3002 -p 8000:8000 process-engineering-suite
```

#### Hybrid Development (Recommended)
Run the Python API in Docker (to avoid environment setup) while running the Frontend locally (for maximum performance).

1. Start only the API:

   ```bash
   docker-compose -f infra/docker-compose.yml up --build api
   ```

2. In a new terminal, start the frontend:

   ```bash
   npm run dev
   ```

#### Updating Code
- **Development**: Code changes are reflected automatically due to volume mounts. If you add new dependencies, run `docker-compose -f infra/docker-compose.yml build`.
- **Production**: Re-run the `docker build` command to bake changes into a new image.

## Key Features

- **Theme Synchronization**: Seamlessly switch between Light and Dark modes from the Dashboard, with preferences persisted across applications.
- **Glassmorphism Design**: A modern, consistent UI aesthetic across all tools.
- **Real-time Calculations**: Instant feedback on hydraulic network performance.
- **Bi-Directional Flow Simulation**: Supports both forward and backward flow calculations, ensuring correct pressure drop and elevation handling regardless of flow direction.
