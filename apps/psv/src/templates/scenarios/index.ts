/**
 * Scenario Case Consideration Templates
 *
 * Each template provides a structured markdown format for documenting
 * overpressure scenario analysis per API-521 guidelines.
 *
 * Templates are stored as string constants for easy bundling.
 */

import { ScenarioCause } from '@/data/types';

// ==================== TEMPLATES ====================

const blockedOutletTemplate = `## Relief Scenario Analysis

### Background
Describe the process conditions and operating envelope that lead to this blocked outlet scenario.

### Design Basis
- **Design pressure**: [MAWP value]
- **Maximum allowable working pressure (MAWP)**: [value]
- **Set pressure**: [PSV set pressure]
- **Operating pressure**: [normal operating pressure]
- **Operating temperature**: [normal operating temperature]

### Scenario Description
The blocked outlet scenario occurs when:
- Downstream isolation valve is inadvertently closed
- Flow path becomes obstructed
- Continued operation of upstream equipment (pump, compressor, etc.)

### Relieving Load Calculation
Document the calculation methodology:

1. **Fluid properties at relieving conditions**:
   - Temperature: [°C]
   - Pressure: [barg]
   - Density: [kg/m³]
   - Viscosity: [cP]

2. **Equipment capacity**:
   - Pump/compressor rated capacity: [kg/h or m³/h]
   - Maximum discharge pressure: [barg]

3. **Relief rate determination**:
   - Relief rate = Equipment maximum capacity
   - Adjustments for temperature/pressure effects

### Key Assumptions
- List all critical assumptions made in the analysis
- Include safety factors applied
- Reference any industry standards or company guidelines

### Code References
- API-520 Part I: Sizing and Selection
- API-521: Pressure-Relieving and Depressuring Systems
- [Add other relevant codes]

### Conclusions
Summary of findings and recommendations:
- Required relief capacity: [kg/h]
- Recommended PSV size: [orifice designation]
- Additional safeguards considered
`;

const fireCaseTemplate = `## Fire Case Relief Scenario Analysis

### Background
Describe the equipment layout, fire exposure risk, and protection measures in place.

### Design Basis
- **Design code**: API-521 Section 4.4
- **Environmental factor (F)**: [0.075 - 1.0]
- **Insulation type**: [mineral wool, calcium silicate, etc.]
- **Insulation thickness**: [mm]

### Fire Exposure Scenario
External fire exposure due to:
- Pool fire from nearby equipment
- Jet fire from piping failure
- Flash fire from vapor cloud ignition

### Wetted Surface Area Calculation

#### Equipment Details
List all equipment exposed to fire:

1. **[Equipment Tag]**:
   - Type: [vessel, tank, heat exchanger, etc.]
   - Orientation: [horizontal/vertical]
   - Dimensions: [diameter × length]
   - Liquid level: [% or height]
   - Wetted area: [m²]

2. **[Equipment Tag]**:
   - [Similar details]

**Total wetted area**: [m²]

### Heat Absorption Calculation

Using API-521 methodology:

$$Q = 43,200 \\times F \\times A^{0.82}$$

Where:
- $Q$ = Heat absorption rate (W)
- $F$ = Environmental factor
- $A$ = Total wetted surface area (m²)

**Calculated heat input**: [kW]

### Relief Load Determination

1. **Latent heat of vaporization**: [kJ/kg]
2. **Required relief rate**:
   $$W = \\frac{Q}{\\lambda}$$
   
   Where:
   - $W$ = Relief rate (kg/h)
   - $Q$ = Heat input (kW)
   - $\\lambda$ = Latent heat (kJ/kg)

**Required relief capacity**: [kg/h]

### Key Assumptions
- Fire duration: 10 minutes minimum (per API-521)
- All equipment within fire zone exposed simultaneously
- Credit for fireproofing/insulation: [Yes/No, with justification]
- Drainage and fire protection systems: [describe]

### Code References
- API-521 Section 4.4: Fire Exposure
- API-2000: Venting Atmospheric and Low-Pressure Storage Tanks
- NFPA 30: Flammable and Combustible Liquids Code

### Conclusions
Summary of fire case analysis:
- Total wetted area: [m²]
- Heat absorption: [kW]
- Required relief capacity: [kg/h]
- Recommended mitigation measures
`;

const externalFireTemplate = `## External Fire Relief Scenario Analysis

### Background
Describe the external fire exposure conditions and their potential impact on the protected equipment.

### Design Basis
- **Design code**: API-521 Section 4.4
- **Environmental factor (F)**: [0.075 - 1.0]
- **Insulation type**: [mineral wool, calcium silicate, etc.]
- **Insulation thickness**: [mm]
- **Fire scenario**: [pool fire, jet fire, flash fire]

### Fire Source Identification
Identify potential fire sources:
- Adjacent equipment containing flammable materials
- Piping containing hydrocarbons
- Storage tanks in vicinity
- Process vessels with combustible contents

### Wetted Surface Area Calculation

#### Equipment Exposed to Fire
List all equipment within the fire zone:

1. **[Equipment Tag]**:
   - Type: [vessel, tank, column, etc.]
   - Orientation: [horizontal/vertical]
   - Dimensions: [diameter × height/length]
   - Normal liquid level: [% or m]
   - Calculated wetted area: [m²]

**Total wetted surface area**: [m²]

### Heat Input Calculation

Using API-521 equation:

$$Q = 43,200 \\times F \\times A^{0.82}$$

Where:
- $Q$ = Heat absorption rate (W)
- $F$ = Environmental factor (considering insulation, drainage, firefighting)
- $A$ = Total wetted surface area (m²)

**Calculated heat input**: [kW]

### Relief Load Determination

$$W = \\frac{Q}{\\lambda}$$

Where:
- $W$ = Required relief rate (kg/h)
- $Q$ = Heat input (kW)
- $\\lambda$ = Latent heat of vaporization (kJ/kg)

### Key Assumptions
- Fire duration as per API-521 guidelines
- Simultaneous exposure of all equipment in fire zone
- Credit taken for approved fireproofing: [Yes/No]
- Fire water/deluge systems available: [Yes/No]

### Code References
- API-521 Section 4.4: Fire Exposure
- NFPA 30: Flammable and Combustible Liquids Code
- Company HSE guidelines

### Conclusions
Summary of external fire analysis:
- Total wetted area: [m²]
- Heat absorption rate: [kW]
- Required relief capacity: [kg/h]
- Recommended protective measures
`;

const tubeRuptureTemplate = `## Tube Rupture Relief Scenario Analysis

### Background
Describe the heat exchanger configuration and the potential for tube rupture overpressure.

### Design Basis
- **Heat exchanger type**: [shell & tube, plate, etc.]
- **Shell side design pressure**: [barg]
- **Tube side design pressure**: [barg]
- **Set pressure**: [PSV set pressure]

### Scenario Description
Tube rupture occurs when:
- High-pressure fluid from tube side enters the low-pressure shell side
- Pressure equalization between two systems of different design pressures
- Sudden release of high-pressure fluid

### Equipment Details
- **Heat exchanger tag**: [Tag]
- **Number of tubes**: [N]
- **Tube OD / ID**: [mm / mm]
- **Shell side MAWP**: [barg]
- **Tube side operating pressure**: [barg]
- **Tube side fluid**: [describe]
- **Shell side fluid**: [describe]

### Rupture Flow Calculation

1. **Single tube rupture flow**:
   Based on orifice flow through ruptured tube ends:
   
   $$W = C_d \\times A \\times \\sqrt{2 \\rho \\Delta P}$$

2. **Flow restriction**:
   - Tube side: [any restrictions noted]
   - Shell side: [relief path capacity]

### Relief Load Determination
- **Rupture flow rate**: [kg/h]
- **Condensation credit**: [if applicable]
- **Net relief requirement**: [kg/h]

### Key Assumptions
- Single tube rupture (worst case single failure)
- Maximum tube side pressure at rupture
- No operator intervention assumed
- Relief device located on shell side

### Code References
- API-521: Section on Heat Exchanger Tube Rupture
- TEMA standards
- Company heat exchanger design specifications

### Conclusions
Summary of tube rupture scenario:
- Maximum rupture flow: [kg/h]
- Required relief capacity: [kg/h]
- PSV sizing recommendation
`;

const thermalExpansionTemplate = `## Thermal Expansion Relief Scenario Analysis

### Background
Describe the system where liquid thermal expansion could lead to overpressure of blocked-in equipment.

### Design Basis
- **Protected equipment**: [describe]
- **Design pressure**: [MAWP value]
- **Normal operating temperature range**: [min to max °C]
- **Liquid properties**: [describe fluid]

### Scenario Description
Thermal expansion overpressure occurs when:
- Liquid-full equipment or piping is blocked in
- Temperature increases due to ambient conditions or process heat
- No provision for liquid expansion

### System Details

1. **Equipment volume**: [m³]
2. **Initial conditions**:
   - Temperature: [°C]
   - Pressure: [barg]
3. **Final conditions**:
   - Maximum temperature: [°C]
   - Calculated pressure rise: [bar]

### Thermal Expansion Calculation

Liquid expansion coefficient:
$$\\beta = \\frac{1}{V} \\frac{dV}{dT}$$

Volume increase:
$$\\Delta V = V_0 \\times \\beta \\times \\Delta T$$

Pressure rise (liquid compressibility):
$$\\Delta P = \\frac{\\Delta V}{V_0 \\times \\kappa}$$

Where:
- $\\beta$ = Coefficient of thermal expansion [1/°C]
- $\\kappa$ = Liquid compressibility [1/bar]
- $\\Delta T$ = Temperature change [°C]

### Relief Load Determination

For thermal relief valves, the relief rate is typically small:
- **Volumetric flow**: [L/min or m³/h]
- **Mass flow**: [kg/h]

### Key Assumptions
- Liquid completely fills the system (no vapor space)
- System is completely blocked in
- Maximum temperature rise scenario
- No heat loss to ambient

### Code References
- API-521: Section on Thermal Expansion
- ASME B31.3: Process Piping
- Company thermal relief standards

### Conclusions
Summary of thermal expansion analysis:
- Maximum pressure rise without relief: [bar]
- Required relief capacity: [kg/h]
- Recommended thermal relief valve: [size and type]
`;

const utilityFailureTemplate = `## Utility Failure Relief Scenario Analysis

### Background
Describe the utility systems and their criticality to maintaining safe operating conditions.

### Design Basis
- **Protected equipment**: [describe]
- **Design pressure**: [MAWP value]
- **Set pressure**: [PSV set pressure]
- **Critical utilities**: [list affected utilities]

### Scenario Description
Utility failure can lead to overpressure when:
- Instrument air failure affects control valves
- Cooling medium failure (water, refrigerant)
- Heating medium failure (steam, hot oil)
- Electrical power failure

### Utility Failure Analysis

#### Affected Utility: [Utility Name]

1. **Normal operating conditions**:
   - Process temperature: [°C]
   - Process pressure: [barg]
   - Heat input/removal rate: [kW]

2. **Failure consequences**:
   - Control valve fail positions: [describe]
   - Process impact: [describe]
   - Time to overpressure: [minutes]

3. **Mitigating factors**:
   - Backup systems: [describe]
   - Operator response time: [minutes]
   - Automatic trips: [describe]

### Relief Load Determination

Calculate the relief rate based on:
- Continued heat input without cooling
- Maximum process flow without control
- Pressure generation rate

$$W = \\frac{Q}{\\lambda}$$ or $$W = \\rho \\times Q_v$$

### Key Assumptions
- Single utility failure (not common cause)
- Duration of failure before restoration
- Control system fail-safe positions
- Operator awareness and response

### Code References
- API-521: Pressure-Relieving and Depressuring Systems
- IEC 61511: Safety Instrumented Systems
- Company utility failure response procedures

### Conclusions
Summary of utility failure scenario:
- Critical utility: [name]
- Time to reach relieving conditions: [minutes]
- Required relief capacity: [kg/h]
- Recommended protective measures
`;

const controlValveFailureTemplate = `## Control Valve Failure Relief Scenario Analysis

### Background
Describe the control valve function and the consequences of its failure.

### Design Basis
- **Protected equipment**: [describe]
- **Design pressure**: [MAWP value]
- **Set pressure**: [PSV set pressure]
- **Control valve tag**: [CV-XXX]

### Control Valve Details
- **Service**: [describe]
- **Size**: [mm]
- **Cv rating**: [value]
- **Fail position**: [open/closed/last]
- **Normal operating position**: [% open]

### Failure Scenarios

#### Scenario 1: Fail Open
- Maximum flow through valve: [kg/h]
- Downstream pressure impact: [describe]
- Overpressure mechanism: [describe]

#### Scenario 2: Fail Closed
- Flow interruption impact: [describe]
- Upstream pressure buildup: [describe]
- Overpressure mechanism: [describe]

### Relief Load Calculation

For fail-open scenario:
$$W_{max} = C_v \\times \\sqrt{\\Delta P \\times \\rho}$$

For fail-closed scenario:
- Based on upstream pressure buildup
- Heat accumulation in blocked system

### Key Assumptions
- Single control valve failure
- Maximum process conditions at failure
- No operator intervention for [X] minutes
- Other control loops functioning normally

### Mitigating Factors
- Redundant control systems
- Safety instrumented functions (SIF)
- Operator alarms and response
- Position feedback and monitoring

### Code References
- API-521: Pressure-Relieving and Depressuring Systems
- ISA-75.01: Control Valve Sizing
- IEC 61511: Safety Instrumented Systems

### Conclusions
Summary of control valve failure scenario:
- Worst case failure mode: [open/closed]
- Required relief capacity: [kg/h]
- Recommended protective measures
`;

const powerFailureTemplate = `## Power Failure Relief Scenario Analysis

### Background
Describe the impact of total or partial power failure on the process unit and overpressure potential.

### Design Basis
- **Design pressure**: [MAWP value]
- **Set pressure**: [PSV set pressure]
- **Power failure type**: [Total plant / Partial / UPS failure]

### Scenario Description
Power failure can lead to overpressure when:
- Cooling systems (fans, pumps) stop operating
- Control systems fail to safe positions
- Emergency shutdown systems may or may not activate
- Continued heat input from process reactions

### Equipment Affected

1. **Cooling Systems**:
   - Air coolers: [list affected units]
   - Cooling water pumps: [list affected units]
   - Refrigeration systems: [list affected units]

2. **Control Systems**:
   - DCS/PLC status: [fail-safe mode description]
   - Control valve positions: [fail open/closed]
   - Emergency shutdown: [battery-backed? duration?]

3. **Rotating Equipment**:
   - Pumps: [trip behavior]
   - Compressors: [trip behavior]

### Heat Accumulation Analysis

Without cooling:
1. **Heat input sources**:
   - Process reaction heat: [kW]
   - External heat sources: [kW]

2. **Lost cooling capacity**: [kW]

3. **Pressure rise rate**: [bar/min]

### Relief Load Calculation

$$W = \\frac{Q_{net}}{\\lambda}$$

### Key Assumptions
- Duration of power outage before backup power
- UPS/generator availability
- Operator response time
- Fail-safe positions of automated valves

### Code References
- API-521: Pressure-Relieving and Depressuring Systems
- IEC 61511: Safety Instrumented Systems

### Conclusions
Summary of power failure scenario:
- Required relief capacity: [kg/h]
- Time to reach relieving conditions: [minutes]
- Recommended protective measures
`;

const coolingWaterFailureTemplate = `## Cooling Water Failure Relief Scenario Analysis

### Background
Describe the cooling water system and its role in maintaining safe operating conditions.

### Design Basis
- **Design pressure**: [MAWP value]
- **Set pressure**: [PSV set pressure]
- **Cooling water supply**: [source description]

### Scenario Description
Cooling water failure can occur due to:
- Cooling water pump failure
- Cooling tower malfunction
- Pipe blockage or rupture
- Loss of makeup water

### Equipment Dependent on Cooling Water

1. **Heat Exchangers**: [list with duties in kW]
2. **Condensers**: [list with condensing duties]
3. **Compressor Coolers**: [list with aftercooler duties]

### Heat Balance Analysis

Without cooling water:
1. **Heat input sources**: [kW]
2. **Lost cooling capacity**: [kW]
3. **Net heat accumulation**: [kW]
4. **Rate of temperature rise**: [°C/min]

### Relief Load Calculation

$$W = \\frac{Q_{net}}{\\lambda}$$

### Key Assumptions
- Complete loss vs. partial loss of cooling water
- Time for cooling water to be restored
- Operator detection and response time

### Code References
- API-521: Pressure-Relieving and Depressuring Systems
- Heat exchanger design specifications

### Conclusions
Summary of cooling water failure scenario:
- Critical equipment affected
- Time to reach relieving conditions: [minutes]
- Required relief capacity: [kg/h]
`;

const refluxFailureTemplate = `## Loss of Reflux Relief Scenario Analysis

### Background
Describe the distillation column or fractionator where loss of reflux could lead to overpressure.

### Design Basis
- **Column design pressure**: [MAWP value]
- **Set pressure**: [PSV set pressure]
- **Normal reflux rate**: [kg/h or m³/h]
- **Condenser duty**: [kW]

### Scenario Description
Loss of reflux can occur due to:
- Reflux pump failure
- Reflux control valve failure (fail closed)
- Loss of cooling to overhead condenser
- Accumulator level control failure

### Column Operating Data

1. **Normal conditions**:
   - Column pressure: [barg]
   - Overhead temperature: [°C]
   - Reflux ratio: [value]
   - Condenser duty: [kW]

2. **Feed conditions**:
   - Feed rate: [kg/h]
   - Feed temperature: [°C]
   - Feed composition: [describe]

### Heat Balance Without Reflux

1. **Heat input**:
   - Reboiler duty: [kW]
   - Feed enthalpy: [kW]

2. **Heat removal lost**:
   - Reflux subcooling: [kW]
   - Overhead condensing: [kW]

3. **Net heat accumulation**:
   - Rate of pressure rise: [bar/min]

### Relief Load Determination

Without reflux, all overhead vapor must be relieved:
$$W = \\text{Overhead vapor rate at relieving conditions}$$

### Key Assumptions
- Complete loss of reflux
- Reboiler continues operation
- Feed continues at normal rate
- No operator intervention

### Code References
- API-521: Column Overpressure Scenarios
- Distillation design specifications
- Company operating procedures

### Conclusions
Summary of loss of reflux scenario:
- Overhead vapor relief rate: [kg/h]
- Time to reach relieving pressure: [minutes]
- Required relief capacity: [kg/h]
`;

const abnormalHeatInputTemplate = `## Abnormal Heat Input Relief Scenario Analysis

### Background
Describe the process system where abnormal heat input could lead to overpressure.

### Design Basis
- **Protected equipment**: [describe]
- **Design pressure**: [MAWP value]
- **Set pressure**: [PSV set pressure]
- **Normal heat input**: [kW]

### Scenario Description
Abnormal heat input can occur due to:
- Reboiler control failure (steam or hot oil)
- Fired heater control malfunction
- Exothermic reaction runaway
- Solar radiation on uninsulated vessels
- Adjacent hot equipment

### Heat Source Analysis

1. **Normal heating conditions**:
   - Heat input rate: [kW]
   - Temperature control: [describe]
   - Heat removal rate: [kW]

2. **Abnormal conditions**:
   - Maximum uncontrolled heat input: [kW]
   - Heat removal capacity: [kW]
   - Net excess heat: [kW]

### Vaporization Rate Calculation

$$W = \\frac{Q_{excess}}{\\lambda}$$

Where:
- $W$ = Vaporization rate (kg/h)
- $Q_{excess}$ = Excess heat input (kW)
- $\\lambda$ = Latent heat of vaporization (kJ/kg)

### Key Assumptions
- Maximum heat source capacity
- Minimum heat removal
- Liquid inventory available for vaporization
- No operator intervention

### Mitigating Factors
- High temperature trips
- Heat source isolation
- Emergency cooling systems
- Operator alarms

### Code References
- API-521: Pressure-Relieving and Depressuring Systems
- Process design heat and material balance
- Safety instrumented system documentation

### Conclusions
Summary of abnormal heat input scenario:
- Maximum excess heat: [kW]
- Vaporization rate: [kg/h]
- Required relief capacity: [kg/h]
`;

const checkValveFailureTemplate = `## Check Valve Failure Relief Scenario Analysis

### Background
Describe the check valve location and the reverse flow scenario that could lead to overpressure.

### Design Basis
- **Design pressure**: [MAWP value]
- **Set pressure**: [PSV set pressure]
- **Check valve location**: [describe in process flow]

### Scenario Description
Check valve failure (stuck open or leaking) can cause:
- Reverse flow from high-pressure system to low-pressure system
- Backflow during pump trip
- Pressure equalization between systems of different design pressures

### System Configuration

#### High-Pressure Side
- Normal operating pressure: [barg]
- Maximum source pressure: [barg]
- Fluid: [describe]

#### Low-Pressure Side (Protected Equipment)
- Normal operating pressure: [barg]
- Design pressure (MAWP): [barg]
- Volume: [m³]

### Reverse Flow Analysis

1. **Driving force**: Pressure differential [ΔP in bar]
2. **Flow rate calculation**: Based on orifice/restriction
3. **Pressurization rate**: Time to reach set pressure

### Relief Load Determination

Relief rate = Maximum reverse flow rate + process contributions

### Key Assumptions
- Complete check valve failure (stuck open)
- No operator intervention
- High-pressure source at maximum pressure

### Code References
- API-521: Pressure-Relieving and Depressuring Systems
- API 594: Check Valves

### Conclusions
Summary of check valve failure scenario:
- Maximum reverse flow rate: [kg/h]
- Required relief capacity: [kg/h]
`;

const otherTemplate = `## Relief Scenario Analysis

### Background
Describe the process conditions and operating envelope for this overpressure scenario.

### Design Basis
- **Design pressure**: [MAWP value]
- **Maximum allowable working pressure (MAWP)**: [value]
- **Set pressure**: [PSV set pressure]
- **Operating pressure**: [normal operating pressure]
- **Operating temperature**: [normal operating temperature]

### Scenario Description
Describe the specific overpressure scenario and its causes.

### Relieving Load Calculation
Document the calculation methodology:

1. **Fluid properties at relieving conditions**:
   - Temperature: [°C]
   - Pressure: [barg]
   - Phase: [gas/liquid/two-phase]

2. **Relief rate determination**:
   - Calculation method: [describe]
   - Basis: [describe]

### Key Assumptions
- List all critical assumptions made in the analysis
- Include safety factors applied
- Reference any industry standards or company guidelines

### Code References
- API-520 Part I: Sizing and Selection
- API-521: Pressure-Relieving and Depressuring Systems
- [Add other relevant codes]

### Conclusions
Summary of findings and recommendations:
- Required relief capacity: [kg/h]
- Recommended PSV size: [orifice designation]
- Additional safeguards considered
`;

// ==================== TEMPLATE MAP ====================

/**
 * Map of scenario causes to their markdown templates
 */
export const scenarioTemplates: Record<ScenarioCause, string> = {
    blocked_outlet: blockedOutletTemplate,
    fire_case: fireCaseTemplate,
    external_fire: externalFireTemplate,
    tube_rupture: tubeRuptureTemplate,
    thermal_expansion: thermalExpansionTemplate,
    utility_failure: utilityFailureTemplate,
    control_valve_failure: controlValveFailureTemplate,
    power_failure: powerFailureTemplate,
    cooling_water_failure: coolingWaterFailureTemplate,
    reflux_failure: refluxFailureTemplate,
    abnormal_heat_input: abnormalHeatInputTemplate,
    check_valve_failure: checkValveFailureTemplate,
    other: otherTemplate,
};

/**
 * Get the markdown template for a given scenario cause
 */
export function getScenarioTemplate(cause: ScenarioCause): string {
    return scenarioTemplates[cause] || otherTemplate;
}
