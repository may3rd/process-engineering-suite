## Thermal Expansion Relief Scenario Analysis

### Background
Describe the piping or equipment configuration susceptible to thermal expansion.

### Design Basis
- **Isolated section**: [piping segment, vessel, etc.]
- **Isolation valves**: [valve tags]
- **Fluid**: [name]
- **Normal operating temperature**: [°C]
- **Maximum ambient temperature**: [°C]
- **Design pressure**: [barg]

### Scenario Description
Thermal expansion occurs when:
- Liquid-filled piping or equipment is isolated (block valves closed)
- Temperature increases due to ambient heating, solar radiation, or process heat
- Liquid expansion causes rapid pressure buildup
- No vapor space to accommodate expansion

### Thermal Expansion Calculation

#### Initial Conditions
- Initial temperature: $T_1$ = [°C]
- Initial pressure: $P_1$ = [barg]
- Liquid density at $T_1$: $\rho_1$ = [kg/m³]
- Isolated volume: $V$ = [m³ or liters]

#### Final Conditions
- Final temperature: $T_2$ = [°C]
- Liquid density at $T_2$: $\rho_2$ = [kg/m³]

#### Volume Expansion
$$\Delta V = V \times \beta \times \Delta T$$

Where:
- $\beta$ = Volumetric expansion coefficient [1/°C]
- $\Delta T = T_2 - T_1$

#### Pressure Rise
For incompressible liquid in rigid container:
$$\Delta P = \frac{K \times \Delta V}{V}$$

Where:
- $K$ = Bulk modulus of liquid [Pa]
- Typical values: Water ≈ 2.2 GPa, Hydrocarbons ≈ 1.0-1.5 GPa

**Calculated pressure rise**: [bar]

### Relief Rate Determination

Per API-521 Section 4.3.10, relief rate for thermal expansion:

$$W = \frac{H \times B \times L \times U \times \Delta T}{500 \times G_p \times \lambda}$$

Where:
- $W$ = Relief rate (kg/h)
- $H$ = Heat transfer rate (W/m²)
- $B$ = Coefficient of volumetric expansion (1/°C)
- $L$ = Length of pipe or perimeter (m)
- $U$ = Heat transfer coefficient (W/m²·K)
- $\Delta T$ = Temperature difference (°C)
- $G_p$ = Specific gravity
- $\lambda$ = Latent heat (kJ/kg)

**Required relief capacity**: [kg/h]

### Key Assumptions
- Both isolation valves are closed
- Maximum credible temperature rise
- No vapor space or pressure relief
- No credit for thermal relief valves (if separate)
- Conservative heat input assumptions

### Mitigation Measures Considered
- Thermal relief valves on isolated sections
- Bypass lines around isolation valves
- Operational procedures (avoid isolation when hot)
- Insulation to limit heat gain
- Pressure monitoring

### Code References
- API-521 Section 4.3.10: Thermal Expansion
- ASME B31.3: Process Piping
- API-RP-520 Part II: Installation

### Conclusions
Summary of thermal expansion analysis:
- Temperature rise: [°C]
- Pressure rise: [bar]
- Required relief capacity: [kg/h]
- Recommended PSV size: [orifice designation] or thermal relief valve
- Operational recommendations
