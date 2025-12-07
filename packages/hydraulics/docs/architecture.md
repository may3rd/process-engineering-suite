# Architecture Overview

The framework separates data modeling, hydraulic calculations, IO, and orchestration.

1. **Models**: Typed dataclasses that describe fluids, components, pipe sections, calculation outputs, and networks.
2. **Calculators**: Each loss component (pipe friction, fittings, elevation, valves, orifices, user fixed loss) has a dedicated calculator responsible for computing contributions to `CalculationOutput`.
3. **Solver**: Coordinates per-section calculations, aggregates totals, and propagates inlet/outlet states.
4. **IO Layer**: Reads configuration files, validates them, and writes results. YAML is the primary input format, with JSON/CSV exports for results.
5. **CLI**: Provides entry points for running calculations with configuration files and selecting output formats.

## Data Flow
```
config -> loader -> Network -> solver -> CalculationOutput / ResultSummary -> report
```

## Extension Points
- Add new loss calculators by implementing the `LossCalculator` protocol.
- Support additional file formats by adding serializers in `network_hydraulic.io`.
- Introduce alternative fluids, fittings libraries, or empirical correlations in the models layer.
