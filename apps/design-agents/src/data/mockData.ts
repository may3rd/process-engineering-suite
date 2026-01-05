import { DesignProject } from './types';

export const mockProject: DesignProject = {
    id: 'demo-001',
    name: 'Methanol Production Plant',
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    status: 'in_progress',
};

export const mockProblemStatement = `Design a methanol production plant with a capacity of 500 metric tons per day. The plant should use natural gas as feedstock and incorporate modern, energy-efficient technologies. The design should prioritize safety, environmental compliance, and operational reliability.

Key requirements:
- Production capacity: 500 MT/day of methanol (99.9% purity)
- Feedstock: Natural gas (primarily methane)
- Operating pressure: Up to 80 bar
- Utilities: Steam, cooling water, electricity available
- Location: Gulf Coast region (consider climate)
- Design life: 25 years`;

export const mockProcessRequirements = `# Process Requirements: Methanol Production Plant

## Production Specifications
- **Capacity**: 500 metric tons per day (MT/day) of methanol
- **Product Purity**: 99.9% minimum
- **Operating Hours**: 8,000 hours/year (91.3% availability)

## Feedstock
- **Primary**: Natural gas (85% CH₄, 10% C₂H₆, 5% inerts)
- **Consumption**: ~1.2 kg natural gas per kg methanol
- **Supply Pressure**: 30 barg

## Operating Conditions
- **Synthesis Pressure**: 50-80 bar
- **Synthesis Temperature**: 250-280°C
- **Distillation**: Atmospheric to 5 barg

## Utilities
- **Steam**: HP (40 barg), MP (10 barg), LP (3 barg)
- **Cooling Water**: 30°C supply, 40°C return
- **Electricity**: 480V, 3-phase, 60Hz
- **Instrument Air**: 7 barg, -40°C dewpoint

## Safety & Environmental
- **Design Code**: ASME Section VIII
- **Emissions**: Meet EPA Tier 3 standards
- **Safety Systems**: SIL 2 minimum for critical loops
- **Flare System**: Required for emergency relief`;

export const mockResearchConcepts = JSON.stringify([
    {
        name: "Steam Reforming with GHR",
        description: "Natural gas is reformed in a primary reformer and a Gas Heated Reformer (GHR).",
        maturity: "Proven",
        key_features: ["Lower fuel consumption", "Compact primary reformer", "High methane conversion"]
    },
    {
        name: "Autothermal Reforming (ATR)",
        description: "A single-step reforming process where heat is supplied by partial oxidation of the feedstock.",
        maturity: "Proven",
        key_features: ["Ideal for large capacities", "Lower CO2 emissions", "Single reactor design"]
    },
    {
        name: "Solar-Driven Steam Reforming",
        description: "Using concentrated solar power to provide the heat for the endothermic reforming reaction.",
        maturity: "Experimental",
        key_features: ["Ultra-low carbon footprint", "Renewable energy integration", "Hybrid operation possible"]
    }
]);

export const mockResearchRatingResults = JSON.stringify([
    {
        concept_name: "Steam Reforming with GHR",
        feasibility_score: 8.5,
        risks: ["Higher capital cost for GHR", "Complexity in heat recovery"],
        recommendations: ["Best for mid-scale plants", "Focus on metallurgy for GHR"]
    },
    {
        concept_name: "Autothermal Reforming (ATR)",
        feasibility_score: 9.0,
        risks: ["Requires Air Separation Unit (ASU)", "High temperature reactor concerns"],
        recommendations: ["Standard for megaplants", "Optimize oxygen-to-carbon ratio"]
    }
]);

export const mockComponentList = `| Component | Formula | MW | Role |
| --- | --- | --- | --- |
| Methane | CH4 | 16.04 | Feedstock |
| Methanol | CH3OH | 32.04 | Product |
| Carbon Monoxide | CO | 28.01 | Intermediate |
| Hydrogen | H2 | 2.02 | Intermediate |
| Water | H2O | 18.02 | Reactant/Utility |`;

export const mockDesignBasis = `# Design Basis: ATR Methanol Plant

## Process Technology
- **Technology**: Autothermal Reforming (ATR) followed by low-pressure methanol synthesis.
- **Licensor**: Based on standard industry configurations.

## Feedstock Specifications
- Natural gas at 30 barg, 25°C.
- Desulfurization via activated carbon and ZnO.

## Reforming Section
- **Reactor**: Single ATR reactor with burner.
- **Oxygen Supply**: ASU required (99.5% O2).
- **Steam-to-Carbon Ratio**: 0.6 - 1.0.

## Synthesis Section
- **Reactor**: Water-cooled isothermal reactor.
- **Catalyst**: Cu/ZnO/Al2O3.
- **Recycle Ratio**: 3:1 to 5:1.`;

export const mockFlowsheetDescription = `# Flowsheet Narrative

1. **Feed Preparation**: Natural gas is heated and desulfurized before being mixed with steam.
2. **Reforming**: The feed enters the ATR reactor where partial oxidation and steam reforming occur simultaneously.
3. **Syngas Cooling**: Effluent syngas is cooled in a waste heat boiler, generating HP steam.
4. **Compression**: Syngas is compressed in a multi-stage centrifugal compressor to 80 bar.
5. **Synthesis**: Syngas reacts in the methanol converter.
6. **Purification**: Crude methanol is purified in a sequence of distillation columns.`;

export const mockEquipmentList = JSON.stringify([
    { tag: "R-101", type: "ATR Reactor", description: "Autothermal Reformer with refractory lining", duty: 45000, duty_unit: "kW", size: "3.5m ID x 12m", notes: "Requires periodic burner inspection" },
    { tag: "C-101", type: "Syngas Compressor", description: "Multi-stage centrifugal compressor", duty: 12000, duty_unit: "kW", size: "N/A", notes: "Dual steam turbine drive" },
    { tag: "T-201", type: "Methanol Still", description: "Crude methanol distillation column", duty: 8500, duty_unit: "kW", size: "2.8m ID x 45m", notes: "55 sieve trays" }
]);

export const mockStreamList = JSON.stringify([
    { tag: "S-01", from: "Battery Limit", to: "Pre-heater", phase: "Gas", temperature: 25, temperature_unit: "C", pressure: 30, pressure_unit: "barg", mass_flow: 25000, mass_flow_unit: "kg/h" },
    { tag: "S-15", from: "ATR Exit", to: "Waste Heat Boiler", phase: "Gas", temperature: 1050, temperature_unit: "C", pressure: 28, pressure_unit: "barg", mass_flow: 42000, mass_flow_unit: "kg/h" },
    { tag: "S-40", from: "Separator", to: "Distillation", phase: "Liquid", temperature: 40, temperature_unit: "C", pressure: 3, pressure_unit: "barg", mass_flow: 21000, mass_flow_unit: "kg/h" }
]);

export const mockSafetyReport = `# Safety & Risk Assessment (HAZOP)

| Node | Hazard | Cause | Mitigation |
| --- | --- | --- | --- |
| ATR Reactor | Over-temperature | Poor burner control | SIL 3 Shutdown (oxygen cut-off) |
| Compressor | Surge | Rapid flow change | Automated anti-surge valves |
| Distillation | Loss of containment | Seal failure | Bunding and flare connection |`;

export const mockPMReport = `# Project Manager Final Memo

**Decision**: **Approved with Conditional Sizing Verification**.

The design concept using ATR technology is highly scalable and fits the project requirements. The capital cost estimate is within the +/- 30% range for this phase.

**Next Steps**:
1. Proceed to FEED (Front-End Engineering Design).
2. Detail the ASU requirements with external vendors.
3. Finalize utility balance for steam export.`;
