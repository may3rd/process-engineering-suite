## Abnormal Heat Input Relief Scenario Analysis

### Background
Describe the process equipment and normal heat input sources.

### Design Basis
- **Equipment tag**: [V-XXX, R-XXX, etc.]
- **Equipment type**: [reactor, vessel, reboiler, etc.]
- **Normal heat input**: [kW]
- **Design pressure**: [barg]
- **Operating pressure**: [barg]

### Scenario Description
Abnormal heat input occurs when:
- Runaway exothermic reaction
- Reboiler steam control valve fails open
- Fired heater burner malfunction
- Loss of cooling with continued heat input
- External fire exposure (see separate fire case template)

### Heat Input Sources

#### Normal Heat Input
- Reboiler/heater duty: [kW]
- Reaction heat: [kW]
- Feed preheat: [kW]
- **Total normal**: [kW]

#### Abnormal Heat Input
Identify the abnormal condition:
- **Failed-open steam valve**: Maximum steam flow × latent heat
- **Runaway reaction**: Adiabatic temperature rise × heat capacity
- **Loss of cooling**: Continued heat input without removal

**Maximum credible heat input**: [kW]

### Vapor Generation Calculation

For **liquid vaporization**:
$$W = \frac{Q}{\lambda}$$

For **gas expansion** (non-condensable):
$$W = \frac{Q}{C_p \times \Delta T}$$

Where:
- $W$ = Relief rate (kg/h)
- $Q$ = Abnormal heat input (kW)
- $\lambda$ = Latent heat of vaporization (kJ/kg)
- $C_p$ = Specific heat capacity (kJ/kg·K)
- $\Delta T$ = Temperature rise (K)

**Required relief capacity**: [kg/h]

### Runaway Reaction Analysis (if applicable)

#### Reaction Kinetics
- Reaction type: [exothermic, polymerization, decomposition]
- Heat of reaction: [kJ/kg or kJ/mol]
- Adiabatic temperature rise: [°C]
- Time to maximum rate: [minutes]

#### Pressure Rise Rate
$$\frac{dP}{dt} = \frac{Q \times R \times T}{V \times M \times C_p}$$

Where:
- $dP/dt$ = Pressure rise rate (bar/min)
- $Q$ = Heat generation rate (kW)
- $V$ = Reactor volume (m³)

**Maximum pressure rise rate**: [bar/min]

### Key Assumptions
- Maximum credible heat input scenario
- No credit for cooling system (if failure is the cause)
- No credit for operator intervention
- No credit for automatic shutdown (unless SIL-rated)
- Conservative reaction kinetics

### Safeguards Considered
- High temperature alarm/trip
- High pressure alarm/trip
- Automatic steam/heat cutoff
- Emergency cooling system
- Inhibitor injection system (for runaway reactions)
- Rupture disc (for fast pressure rise)

### Code References
- API-521 Section 4.3.7: Abnormal Heat Input
- DIERS (Design Institute for Emergency Relief Systems) methodology
- CCPS Guidelines for Chemical Reactivity Evaluation

### Conclusions
Summary of abnormal heat input analysis:
- Maximum heat input: [kW]
- Vapor generation rate: [kg/h]
- Pressure rise rate: [bar/min]
- Required relief capacity: [kg/h]
- Recommended PSV size: [orifice designation]
- Consider rupture disc for fast pressure rise: [Yes/No]
- Process safety improvements recommended
