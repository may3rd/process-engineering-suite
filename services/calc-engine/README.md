# Calc Engine

Python calculation engine for PES. Used for domains where Python is explicitly chosen (currently hydraulics and vessels). Other domains implement equations in TypeScript per Rule Zero.

## Structure

```
services/calc-engine/
├── pes_calc/              # Core calculation engine
│   ├── core/              # Shared utilities, constants, base classes
│   ├── hydraulics/        # Network hydraulics (stub — full engine in ../hydraulics/)
│   ├── vessels/           # ★ Vessel & tank volume/surface area (20 modules, fully implemented)
│   ├── venting/           # Tank venting per API 2000 (stub)
│   ├── heat_transfer/     # Heat transfer in storage tanks (stub)
│   ├── instrument/        # Instrument sizing (stub)
│   ├── rotating/          # Pump & rotating equipment (stub)
│   ├── valves/            # Control valve, PSV, orifice sizing (stub)
│   └── integrations/      # Cross-domain workflows
├── hydraulics/            # Full hydraulic network engine
│   ├── models/            # Pipe, network, topology, results
│   ├── optimizer/         # Pipe, valve, system optimization
│   ├── solver/            # Network solver
│   ├── io/                # YAML/JSON loaders, CSX exporters
│   └── utils/             # Pint units, pipe dimensions, logging
├── tests/                 # Regression + Excel golden-case tests
└── pyproject.toml
```

## Module Status

| Domain | Python | TypeScript | Status |
|--------|--------|------------|--------|
| Hydraulics | ✅ Full engine | Network Editor UI | Python primary |
| Vessels | ✅ Full engine (20 modules) | UI only | Python primary |
| Venting | ⚠️ Stub | ✅ Full engine (10 tests) | TypeScript primary |
| Pump | ⚠️ Stub | ✅ Full engine (6 tests) | TypeScript primary |
| Heat Transfer | ⚠️ Stub | ✅ Full engine (2 tests) | TypeScript primary |
| PSV | ❌ No module | In PSV app | TypeScript primary |
| Control Valve | ⚠️ Stub | Coming soon | TBD |
| Orifice | ⚠️ Stub | Coming soon | TBD |

## Local Commands

```bash
ruff check .          # Lint
ruff format .         # Format
mypy                  # Type-check
pytest                # Run all tests
pytest hydraulics/tests/ -v   # Hydraulic engine tests
pytest tests/ -v      # Regression + golden-case tests
```

## Adding a New Domain

1. Create `pes_calc/{domain}/__init__.py` with docstring
2. Implement calculation functions with type annotations
3. Add golden-case regression tests from Excel
4. Wire into `services/api` router
5. Update the module status table above
