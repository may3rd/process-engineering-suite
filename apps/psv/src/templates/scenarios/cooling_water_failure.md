## Cooling Water Failure Relief Scenario Analysis

### Background
Describe the cooling water system and its role in maintaining safe operating conditions for the protected equipment.

### Design Basis
- **Design pressure**: [MAWP value]
- **Maximum allowable working pressure (MAWP)**: [value]
- **Set pressure**: [PSV set pressure]
- **Cooling water supply**: [source description]

### Scenario Description
Cooling water failure can occur due to:
- Cooling water pump failure
- Cooling tower malfunction
- Pipe blockage or rupture
- Loss of makeup water
- Fouling in heat exchangers

### Equipment Dependent on Cooling Water

List all equipment requiring cooling water:

1. **Heat Exchangers**:
   - [Equipment Tag]: [duty in kW]
   - [Equipment Tag]: [duty in kW]

2. **Condensers**:
   - [Equipment Tag]: [condensing duty in kW]

3. **Compressor Coolers**:
   - [Equipment Tag]: [aftercooler duty in kW]

4. **Reactor Cooling**:
   - [Equipment Tag]: [cooling requirement]

### Heat Balance Analysis

Without cooling water:

1. **Heat input sources**:
   - Process reaction heat: [kW]
   - Compression heat: [kW]
   - External heat sources: [kW]
   - **Total heat input**: [kW]

2. **Lost cooling capacity**:
   - [Equipment] cooling duty lost: [kW]
   - **Total cooling lost**: [kW]

3. **Net heat accumulation**:
   - Net heat = Heat input - Remaining cooling
   - Rate of temperature rise: [°C/min]

### Relief Load Calculation

$$W = \frac{Q_{net}}{\lambda}$$

Where:
- $W$ = Required relief rate (kg/h)
- $Q_{net}$ = Net heat accumulation (kW)
- $\lambda$ = Latent heat of vaporization (kJ/kg)

### Key Assumptions
- Complete loss vs. partial loss of cooling water
- Time for cooling water to be restored
- Operator detection and response time
- Process holdup and thermal mass

### Mitigating Factors
- Backup cooling water sources
- Emergency water supply
- Process trip on high temperature
- Reflux/recirculation systems

### Code References
- API-521: Pressure-Relieving and Depressuring Systems
- Heat exchanger design specifications
- Cooling water system P&IDs

### Conclusions
Summary of cooling water failure scenario:
- Critical equipment affected
- Time to reach relieving conditions: [minutes]
- Required relief capacity: [kg/h]
- Recommended protective measures
