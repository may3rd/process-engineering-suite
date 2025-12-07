 # Configuration Reference

 This document describes every supported key in a `network` configuration, lists available fittings/components, and provides example snippets.

 ---

 ## 1. YAML Skeleton

```yaml
network:
  name: my_network
  description: Optional human-readable label
  direction: auto | forward | backward
  upstream_pressure: {value: 101.3, unit: kPag}     # optional
  downstream_pressure: {value: 90, unit: kPag}      # optional
  # legacy: boundary_pressure is still accepted and maps to upstream_pressure
  boundary_temperature: {value: 25, unit: degC}  # K, required
   gas_flow_model: isothermal | adiabatic        # required for gas, ignored for liquid
   design_margin: 10.0                           # percent, optional
   mass_flow_rate: 1.0                           # kg/s, required
   output_units:                                 # optional (see §4)
     pressure: kPag
     …
   fluid:                                        # required, §2
     …
   sections:                                     # required, §3
     - …
     - …
 ```

 - All numeric fields accept bare SI numbers, `{value, unit}` objects, or strings with units (e.g., `"100 ft"`). Units are converted via `network_hydraulic.utils.units`.
 - Unknown keys anywhere in `network` or `sections[]` raise `ValueError`.

 ---

 ## 2. `fluid` Block

 | Field | Required | Description |
 | --- | --- | --- |
 | `name` | No | Identifier for summaries. |
 | `phase` | **Yes** | `liquid`, `gas`, or `vapor`. Dictates density logic and gas-model requirements. |
 | `density` | Required for liquids | kg/m³ in SI or convertible units. |
 | `molecular_weight` | Required for gas/vapor | kg/mol or g/mol. |
 | `z_factor` | Required for gas/vapor | Compressibility factor (dimensionless). |
 | `specific_heat_ratio` | Required for gas/vapor | γ = Cp/Cv. |
 | `viscosity` | **Yes** | Dynamic viscosity (Pa·s). |
 | `standard_flow_rate` | Optional | Desired standard volumetric flow for output. |
 | `vapor_pressure`, `critical_pressure` | Optional; required for liquid valve calcs. |

 ---

 ## 3. Sections

 Each entry in `network.sections` maps to a `PipeSection`. Required keys:

 | Field | Required | Description |
 | --- | --- | --- |
 | `id` | **Yes** | Unique identifier. |
 | `schedule` | **Yes** | Pipe schedule (string). |
| `pipe_NPD` or `pipe_diameter` | **Yes** | Nominal pipe diameter (inches) or internal diameter (m) when `pipe_diameter` is provided. |
 | `roughness` | **Yes** | Absolute roughness (m). |
 | `length` | **Yes** | Straight length (m). Can be `{value, unit}`. |
 | `elevation_change` | No (defaults to 0) | Positive for elevation gain. |
 | `fitting_type` | **Yes** | Style for elbows/tees: `SCRD`, `SR`, `LR`, `stub_in`, etc. |
 | `fittings` | **Yes** (list, can be empty) | Repeated entries, see §3.2. |

 Optional fields:

 - `pipe_diameter`, `inlet_diameter`, `outlet_diameter` – override derived diameters (m).
 - `control_valve`, `orifice` – component blocks (§3.3).
- `user_specified_fixed_loss` – pressure drop (Pa) applied directly; it now adds on top of pipe/elevation losses (only control valves/orifices still block it).
 - `user_K`, `fitting_K`, `pipe_length_K`, `total_K`, `piping_and_fitting_safety_factor` – manual loss overrides (rare).
- `boundary_pressure` – per-section pressure boundary (Pa).
- `downstream_pressure` – optional outlet pressure (Pa) that seeds the graph when `direction` is `backward`; otherwise the solver uses the network's upstream pressure as the source.
- `direction` – overrides network direction for that section.
- `design_margin` – percent overriding network-level margin.
- `erosional_constant` – used for erosional velocity checks.
 - `flow_splitting_factor` – multiplier for network mass flow rate (defaults to 1.0).
 - `from_node_id` / `to_node_id` – preferred keys for naming the junction at each section’s start/end; the loader builds the topology graph from these node IDs so branching and merges are captured explicitly.
 - `from_pipe_id` / `to_pipe_id` – legacy synonyms for the same junction identifiers (accepted for backwards compatibility); they still drive topology construction and CLI warnings.

### 3.4 Topology and Direction

- **Start nodes** – when the loader builds the directed graph, it records every junction (a pipe section's start/end). The solver picks the node with zero incoming edges as the source, unless a network/section `direction` forces `forward` or `backward`.
- **Branch detection** – multiple start nodes signal branching (e.g., tap-offs) and are reported as warnings during `ConfigurationLoader.build_network()`.
- **Disconnected nodes** – if any junctions can't be reached from the selected start(s), you'll see a warning suggesting you double-check the `from_pipe_id`/`to_pipe_id` references.
- **Direction overrides** – sections can still override `direction`, but the solver relies on the graph order and the network-level `direction` to decide whether it propagates pressures forward or backward. If you need to reverse flow, set `network.direction: backward` or pass `--flow-rate` overrides via the CLI to guide the solver.

Tips:

1. Provide consistent `from_pipe_id`/`to_pipe_id` values for every section when modeling branched networks; otherwise the loader will fall back to autogenerated node names (``<section_id>_start``/``_end``).
2. If you notice warnings about “no start node,” ensure `network.direction` is set and at least one section uses the `to_pipe_id` of another to form a continuous topology.

### 3.5 Multi-Network Configurations

- Instead of a single `network:` block you can declare a collection of networks:

```yaml
networks:
  - id: supply
    name: upstream_supply
    # ... same keys as §1
  - id: branch
    name: downstream_branch
    # ... same schema
links:
  - id: junction-a
    members:
      - network: supply
        node: node-outlet
      - network: branch
        node: node-inlet
```

- Each entry under `networks` mirrors the original schema plus an optional `id` (defaulting to `name`). The `links[]` array ties nodes across those networks; the first `members[]` entry acts as the pressure “leader,” and the solver pushes that node’s pressure into the remaining members.
- Set `primary: true` inside any network block to force that network to become the leader for linked nodes (useful when the shared node should inherit pressure from a specific upstream/downstream model). When no `primary` is specified, the solver defaults to the first member for forward/auto networks and the last member if every participating network runs backward.
- When multiple networks share a config file you can keep a single `output_units:` block at the root; every network inherits those units unless it defines its own `output_units` override inside the individual entry.
- Legacy network configs that only specify `boundary_pressure` continue to work; the loader maps that value to `upstream_pressure`.
- Optional `system_solver` block lets you tune the system-level iteration:

```yaml
system_solver:
  max_iterations: 10
  tolerance: 0.5           # Pascals
  relaxation: 0.7          # (0, 1]
```

- If `system_solver` is omitted, defaults from `NetworkSystemSolver` are used (currently 4 iterations, 1 Pa tolerance, 0.7 relaxation).
- Optional `system_optimizer` block lets you run the valve optimizer automatically before solving:

```yaml
system_optimizer:
  enable: true
  tolerance: 500.0
  damping_factor: 0.65
  max_iterations: 20
  networks:
    supply:
      method: advanced
      downstream_pressure: 330 kPag
    branch:
      method: simple
```

  - `enable` toggles the optimizer globally; `networks` maps network IDs to per-network overrides.
  - You can override method (`advanced` or `simple`), downstream pressure targets, tolerances, damping factors, and iteration caps per bundle; unspecified fields fall back to the global values above.

- Use `ConfigurationLoader.build_network_system()` to construct a `NetworkSystem` and run it via `NetworkSystemSolver`. The CLI auto-detects the new format, runs the valve optimizer when enabled, solves every bundle, prints per-network summaries, and writes a combined results file via `write_system_output`.

 ### 3.1 Auto-Swage

 When adjacent sections have mismatched diameters and neither explicitly sets inlet/outlet diameters, the loader auto-inserts `inlet_swage` or `outlet_swage` fittings to maintain continuity.

 ### 3.2 Allowed Fitting Types

 ```
 elbow_90, elbow_45, u_bend, stub_in_elbow, tee_elbow, tee_through,
 block_valve_full_line_size, block_valve_reduced_trim_0.9d,
 block_valve_reduced_trim_0.8d, globe_valve, diaphragm_valve,
 butterfly_valve, check_valve_swing, lift_check_valve, tilting_check_valve,
 pipe_entrance_normal, pipe_entrance_raise, pipe_exit,
 inlet_swage, outlet_swage
 ```

 *Aliases*: `check_valve_lift` → `lift_check_valve`, `check_valve_tilting` → `tilting_check_valve`.

 ### 3.3 Components

#### Control Valve (`control_valve`)

 | Field | Description |
 | --- | --- |
| `tag` | Identifier for reports. |
| `cv` / `cg` | Flow coefficients (must be positive if provided). |
| `pressure_drop` | Fixed ΔP (Pa). |
| `C1`, `FL`, `Fd`, `xT` | Vendor constants. |
| `inlet_diameter`, `outlet_diameter`, `valve_diameter` | Defaults to section diameters. |
| `adjustable` | When `true`, the valve drop is solved instead of treated as a fixed `pressure_drop`. You can run `run_valve_optimizer.py` (or call `network_hydraulic.optimizer.optimize_control_valves`) to tune these valves so the downstream pressure matches the configured value. | 
- | `adjustable` | When `true`, the valve drop is solved from Cv/Cg instead of fixed `pressure_drop`, letting multiple valves share the total pressure drop along the route. |

 The calculator requires either a specified pressure drop or a Cv/Cg. Liquid valves also need `fluid.vapor_pressure` and `fluid.critical_pressure`.

 #### Orifice (`orifice`)

 | Field | Description |
 | --- | --- |
 | `tag` | Identifier. |
 | `d_over_D_ratio` | Ratio of orifice to pipe diameter. |
 | `pressure_drop` | Fixed ΔP (Pa). |
 | `pipe_diameter`, `orifice_diameter` | Provide at least one; the loader deduces the other. |
 | `meter_type`, `taps`, `tap_position` | Passed to `fluids.flow_meter`. |
 | `discharge_coefficient`, `expansibility` | Optional overrides. |

 ---

 ## 4. Output Units

 `network.output_units` accepts the following keys (default SI in parentheses):

 - `pressure` (Pa)
 - `pressure_drop` (Pa)
 - `temperature` (K)
 - `density` (kg/m³)
 - `velocity` (m/s)
 - `volumetric_flow_rate` (m³/s)
 - `mass_flow_rate` (kg/s)
 - `flow_momentum` (Pa)

 Unit strings are validated via the project’s converter; invalid entries raise `ValueError`.

 ---

 ## 5. Example Minimal Config

 ```yaml
 network:
   name: demo
   direction: auto
 upstream_pressure: {value: 300, unit: kPa}
 mass_flow_rate: 2.5
  boundary_temperature: {value: 35, unit: degC}
   fluid:
     name: nitrogen
     phase: gas
     molecular_weight: 28
     z_factor: 0.98
     specific_heat_ratio: 1.32
     viscosity: 1.8e-5
   sections:
     - id: inlet
       schedule: 40
       pipe_NPD: 6
       roughness: {value: 0.045, unit: mm}
       length: 20
       elevation_change: 0
       fitting_type: LR
       fittings:
         - {type: elbow_90, count: 2}
       control_valve:
         tag: CV-101
         pressure_drop: {value: 10, unit: kPa}
 ```

 ---

 ## 6. Validation Tips

- Use `python main.py --config your.yaml` during authoring to surface loader errors early.
- The solver now fails fast when prerequisites (diameters, positive lengths, component pressures) are missing. Fix configuration issues instead of relying on best-effort runs.
