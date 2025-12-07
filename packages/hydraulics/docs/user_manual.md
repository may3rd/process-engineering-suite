 # Network Hydraulic – User Manual

 This guide explains how to prepare your environment, author input files, run the solver, and interpret its output. Use it as the primary reference when configuring new hydraulic networks or debugging existing ones.

 ---

 ## 1. Prerequisites

 | Requirement | Details |
 | --- | --- |
 | Python | 3.10 or newer |
 | OS packages | A build environment capable of compiling Python wheels for `fluids`, `ruamel.yaml`, etc. |
 | Optional tools | `venv`/`virtualenv`, `pip`, `make` |

 ### 1.1 Create and activate a virtual environment

 ```bash
 python -m venv .venv
 source .venv/bin/activate        # Linux/macOS
 # .venv\Scripts\Activate.ps1     # Windows PowerShell
 ```

 ### 1.2 Install dependencies

 ```bash
 pip install -e .[dev]
 ```

 This installs the package in editable mode together with linting/testing extras.

 ---

 ## 2. Running the Solver

 The supported entry points are:

 1. **Typer CLI** (recommended)

    ```bash
    network-hydraulic run path/to/network.yaml \
                          [--output results.yaml] \
                          [--default-diameter 0.15] \
                          [--flow-rate 0.02] \
                          [--debug-fittings]
    ```

    | Option | Description |
    | --- | --- |
    | `CONFIG` (argument) | Path to the required YAML configuration file. |
    | `--output` | Optional path where the YAML/JSON result file will be written; the suffix decides the format. |
    | `--default-diameter` | Fallback pipe diameter (m) used when a section omits `pipe_diameter`. |
    | `--flow-rate` | Override for volumetric flow (m³/s) used by calculators. |
    | `--debug-fittings` | Prints the per-fitting `K` breakdown in the CLI summary. |

2. **Module invocation**

   ```bash
   python -m network_hydraulic.cli.app run config/sample_network.yaml
   ```

 3. **Optimizer helper**

    ```bash
    python run_valve_optimizer.py
    ```

    This script loads `config/test_valve_network.yaml`, runs `optimize_control_valves` (which assumes adjustable valves plus a downstream pressure target), updates the control-valve pressure drop, and then re-runs the solver to present the stabilized summary.

 3. **Ad-hoc helper** (`main.py`) – handy while developing:

    ```bash
    python main.py --config config/sample_network.yaml --output build/result.yaml
    ```

 ### 2.1 Logging

 - Logs use the format `timestamp LEVEL [module] message`.
 - Set `NETWORK_HYDRAULIC_LOG_LEVEL=DEBUG` to see additional diagnostics (config parsing, pressure propagation, etc.).

 ---

 ## 3. Output Overview

 - Results default to stdout (summary table) plus optional YAML/JSON when `--output` is provided.
 - YAML structure mirrors the config and contains:
   - `network.summary.state` – inlet/outlet thermodynamic states.
   - `network.summary.pressure_drop` – aggregate losses.
   - `network.sections[].calculation_result` – per-section pressure drops, Reynolds numbers, normalized loss.
   - `network.sections[].calculation_result.flow` – actual and standard volumetric flow.
 - Numbers that cannot be computed are emitted as `null`. Non-finite values (NaN/inf) are rejected before serialization, causing a `ValueError`.

 ---

 ## 4. Workflow Checklist

 1. Copy `config/sample_network.yaml` as a starting point.
 2. Fill in `network`, `fluid`, and `sections` as described in [Configuration Reference](./configuration_reference.md).
 3. Validate YAML via the loader (`python main.py --config …`). This catches schema errors before running the solver.
 4. Run the CLI and inspect the printed summary.
 5. (Optional) Persist full results with `--output` and inspect the generated YAML/JSON.
 6. Iterate: adjust the config, rerun, compare outputs.

 ---

 ## 5. Troubleshooting

 | Symptom | Likely Cause | Resolution |
 | --- | --- | --- |
 | `Unknown keys in network` | Typo or unsupported attribute | Fix the spelling; refer to [Configuration Reference](./configuration_reference.md). |
 | `Section '<id>' requires a valid inlet pressure for component calculations` | Component-only section lacks boundary pressures | Provide `section.boundary_pressure` or network-level upstream/downstream pressures. |
 | `Section '<id>' is invalid: …` | Missing diameter/length | Define `pipe_diameter`/`length`, or supply `--default-diameter`. |
 | CLI prints stack trace | Unhandled exception | Re-run with `NETWORK_HYDRAULIC_LOG_LEVEL=DEBUG`, inspect logs; raise an issue with the configuration file attached. |

 ---

 ## 6. Reference Documents

 - [Configuration Reference](./configuration_reference.md) – exhaustive list of keys, components, and fitting types.
 - `docs/architecture.md` – high-level architecture notes.
 - `config/` – sample networks and expected outputs.
