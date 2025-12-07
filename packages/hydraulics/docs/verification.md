# Verification Pipeline

This project uses regression fixtures to ensure the solver’s behaviour stays stable as new features land.

## Overview

1. **Fixtures** live under `tests/fixtures/networks/`. Each YAML file is a runnable network configuration.
2. **Snapshots** live under `tests/fixtures/expected/`. Files share the same stem as their config (`foo.yaml` ↔ `foo.json`) and capture the solver output for that fixture.
3. The pytest suite (`tests/solver/test_snapshots.py`) iterates over every config, runs the solver, serializes the result, and asserts it matches the stored snapshot.

## Generating / Updating Snapshots

Use the helper script from the repo root:

```bash
python scripts/update_snapshot.py \
  --config tests/fixtures/networks/<name>.yaml \
  --output tests/fixtures/expected/<name>.json
```

The script:

1. Loads the config via `ConfigurationLoader`.
2. Runs `NetworkSolver`.
3. Serializes the aggregate + per-section data (pressures, losses, etc.) using `network_hydraulic.testing.snapshots`.
4. Writes the JSON payload (sorted keys, rounded floats) to the output path.

## Adding a New Fixture

1. Drop a new YAML config under `tests/fixtures/networks/`. Follow the existing examples (gas isothermal, liquid elevation, component-only, etc.).
2. Run `scripts/update_snapshot.py` to create the matching JSON snapshot.
3. Commit both files.
4. Run `pytest tests/solver/test_snapshots.py` to ensure the snapshot suite passes.

Snapshots are deterministic: if a change intentionally alters results, rerun the script to refresh the relevant JSON and include the diff in your review. If the change is unintended, the failing test points to the affected fixture so you can investigate.

