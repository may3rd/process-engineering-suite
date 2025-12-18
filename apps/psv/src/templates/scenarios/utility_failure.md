## Utility Failure Relief Scenario Analysis

### Background
Describe the process dependency on utilities and normal operating conditions.

### Design Basis
- **Critical utility**: [cooling water, instrument air, steam, power, etc.]
- **Equipment affected**: [list equipment tags]
- **Normal utility supply**: [flow rate, pressure, temperature]
- **Design pressure**: [barg]

### Scenario Description
Utility failure occurs when:
- Complete loss of cooling water supply
- Loss of instrument air (affects control valves, instruments)
- Steam supply interruption
- Electrical power failure
- Nitrogen/inert gas supply loss

### Impact Analysis

#### Cooling Water Failure
Loss of cooling affects:
- Condensers: Loss of condensing capacity
- Coolers: Loss of product cooling
- Reflux systems: See reflux failure template
- Jacket cooling: Temperature rise in reactors

#### Instrument Air Failure
Affects control valves:
- Fail-open valves: Increase inflow
- Fail-closed valves: Block outflow
- Fail-last: Unpredictable behavior

#### Power Failure
Affects:
- Pumps: Loss of circulation/reflux
- Compressors: Loss of vapor removal
- Agitators: Loss of mixing (may affect reactions)
- Control systems: Loss of control

### Relieving Load Calculation

Identify the **worst-case** utility failure impact:

#### Heat Accumulation (Cooling Loss)
- Normal heat removal: [kW]
- Heat input continues: [kW]
- Net heat accumulation: [kW]

Vapor generation:
$$W = \frac{Q}{\lambda}$$

#### Flow Imbalance (Control Valve Failure)
- Maximum inflow (fail-open valves): [kg/h]
- Minimum outflow (fail-closed valves): [kg/h]
- Net accumulation: [kg/h]

**Required relief capacity**: [kg/h]

### Time to Overpressure

Estimate time available for operator response:
$$t = \frac{V \times \Delta P}{W \times R \times T / M}$$

Where:
- $V$ = Equipment volume (m³)
- $\Delta P$ = Pressure rise to set pressure (Pa)
- $W$ = Net accumulation rate (kg/s)

**Time to reach set pressure**: [minutes]

### Key Assumptions
- Complete and sustained utility loss
- No credit for backup utility systems (unless dedicated and reliable)
- No credit for operator intervention within [X] minutes
- Simultaneous worst-case failures
- No credit for automatic shutdown (unless SIL-rated)

### Safeguards Considered
- Backup utility systems: [Yes/No, describe]
- Uninterruptible power supply (UPS): [Yes/No, duration]
- Backup instrument air receiver: [Yes/No, capacity]
- Emergency cooling water: [Yes/No, source]
- Automatic shutdown on utility loss: [Yes/No, SIL rating]
- Fail-safe valve positions: [optimized for safety]

### Code References
- API-521 Section 4.3.11: Utility Failure
- ISA-84: Safety Instrumented Systems
- IEC 61511: Functional Safety

### Conclusions
Summary of utility failure analysis:
- Critical utility: [name]
- Failure impact: [heat accumulation, flow imbalance, etc.]
- Time to overpressure: [minutes]
- Required relief capacity: [kg/h]
- Recommended PSV size: [orifice designation]
- Recommended safeguards: [backup systems, interlocks, etc.]
