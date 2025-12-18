## Tube Rupture Relief Scenario Analysis

### Background
Describe the heat exchanger configuration and operating conditions.

### Design Basis
- **Heat exchanger type**: [shell-and-tube, plate, air cooler, etc.]
- **Shell side design pressure**: [barg]
- **Tube side design pressure**: [barg]
- **MAWP (low pressure side)**: [barg]
- **Set pressure**: [barg]

### Scenario Description
Tube rupture occurs when:
- Tube failure due to corrosion, erosion, or mechanical damage
- High pressure fluid enters low pressure side
- Rapid pressure buildup on low pressure side

### Tube Rupture Flow Calculation

#### High Pressure Side Conditions
- Fluid: [name]
- Pressure: [barg]
- Temperature: [°C]
- Density: [kg/m³]
- Viscosity: [cP]

#### Low Pressure Side Conditions
- Fluid: [name]
- Normal pressure: [barg]
- Temperature: [°C]

#### Rupture Orifice Size
Per API-521 Section 4.3.3:
- Number of tubes: [count]
- Tube OD: [mm]
- Tube ID: [mm]
- **Assumed rupture area**: [Full bore of largest tube or multiple tubes]

### Relief Rate Calculation

For **gas/vapor** flow through rupture:
$$W = C \times A \times \sqrt{\rho \times \Delta P}$$

For **liquid** flow through rupture:
$$W = C_d \times A \times \sqrt{2 \times \rho \times \Delta P}$$

Where:
- $W$ = Mass flow rate (kg/s)
- $C$ or $C_d$ = Discharge coefficient (typically 0.6-0.8)
- $A$ = Rupture area (m²)
- $\rho$ = Fluid density (kg/m³)
- $\Delta P$ = Pressure differential (Pa)

**Calculated relief rate**: [kg/h]

### Key Assumptions
- Single tube rupture (conservative) or multiple tube failure
- Full bore rupture vs. partial crack
- Discharge coefficient: [value with justification]
- Upstream pressure maintained by process
- No credit for isolation or shutdown systems

### Code References
- API-521 Section 4.3.3: Heat Exchanger Tube Rupture
- ASME Section VIII: Pressure Vessel Code
- TEMA Standards: Tubular Exchanger Manufacturers Association

### Conclusions
Summary of tube rupture analysis:
- Rupture orifice area: [mm²]
- Pressure differential: [bar]
- Required relief capacity: [kg/h]
- Recommended PSV size: [orifice designation]
- Additional safeguards: [isolation valves, pressure monitoring, etc.]
