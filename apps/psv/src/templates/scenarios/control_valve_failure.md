## Control Valve Failure Relief Scenario Analysis

### Background
Describe the process control system and the role of the control valve.

### Design Basis
- **Control valve tag**: [CV-XXX]
- **Valve type**: [globe, butterfly, ball, etc.]
- **Valve size**: [DN/NPS]
- **Cv rating**: [value]
- **Fail position**: [open/closed/last]
- **Normal operating position**: [% open]

### Scenario Description
Control valve failure scenario occurs when:
- Control valve fails to its fail-safe position (typically **fail-open**)
- Loss of instrument air or control signal
- Valve actuator malfunction
- Control system failure

### Relieving Load Calculation

#### Upstream Conditions
- Pressure: [barg]
- Temperature: [°C]
- Fluid: [name]
- Density: [kg/m³]

#### Downstream Conditions
- Protected equipment: [vessel, column, etc.]
- Design pressure: [barg]
- Normal operating pressure: [barg]

#### Flow Through Failed-Open Valve

For **gas/vapor**:
$$W = C_g \times C_v \times P_1 \times \sqrt{\frac{x \times M}{T_1 \times Z}}$$

For **liquid**:
$$W = C_v \times \sqrt{\frac{\Delta P}{\text{SG}}} \times \rho$$

Where:
- $W$ = Mass flow rate
- $C_v$ = Valve flow coefficient
- $P_1$ = Upstream pressure
- $\Delta P$ = Pressure drop across valve
- $M$ = Molecular weight
- $T_1$ = Upstream temperature (K)
- $Z$ = Compressibility factor

**Maximum flow through failed valve**: [kg/h]

### Relief Rate Determination

Consider:
1. **Maximum inflow** from failed control valve
2. **Normal outflow** from protected equipment (if any)
3. **Net accumulation** = Inflow - Outflow

**Required relief capacity**: [kg/h]

### Key Assumptions
- Control valve fails fully open (worst case)
- Upstream pressure maintained
- No credit for operator intervention or automatic shutdown
- No credit for high-pressure trip systems (unless SIL-rated)
- Time to detect and respond: [minutes]

### Safeguards Considered
- High-pressure alarm: [Yes/No]
- High-pressure trip: [Yes/No, SIL rating]
- Redundant control valves: [Yes/No]
- Block valves: [Yes/No, normally open/closed]

### Code References
- API-521 Section 4.3.8: Control Valve Failure
- ISA-84: Safety Instrumented Systems
- IEC 61511: Functional Safety

### Conclusions
Summary of control valve failure analysis:
- Maximum inflow: [kg/h]
- Normal outflow: [kg/h]
- Net relief requirement: [kg/h]
- Recommended PSV size: [orifice designation]
- Additional recommendations: [control system improvements, interlocks, etc.]
