from __future__ import annotations

import json
from typing import final
from json_repair import repair_json

from langchain_core.prompts import (
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    MessagesPlaceholder,
    SystemMessagePromptTemplate,
)
from dotenv import load_dotenv
from langsmith import unit

from apps.api.app.services.process_design_agents.agents.designers.tools.stream_calculation_tools import unit_converts
from apps.api.app.services.process_design_agents.agents.utils.agent_states import DesignState
from apps.api.app.services.process_design_agents.agents.utils.prompt_utils import jinja_raw
from apps.api.app.services.process_design_agents.agents.utils.equipment_stream_markdown import equipments_and_streams_dict_to_markdown
from apps.api.app.services.process_design_agents.utils.pydantic_utils import EquipmentAndStreamList
from apps.api.app.services.process_design_agents.agents.designers.tools import (
    calculate_molar_flow_from_mass,
    calculate_mass_flow_from_molar,
    convert_compositions,
    calculate_volume_flow,
    perform_mass_balance_split,
    perform_mass_balance_mix,
    perform_energy_balance_mix,
    calculate_heat_exchanger_outlet_temp,
    calculate_heat_exchanger_duty,
    get_physical_properties, # Now uses CoolProp
    build_stream_object,
    run_agent_with_tools,
    stream_calculation_prompt_with_tools,
    unit_converts
    )

from langchain_core.messages import AIMessage

load_dotenv()


def create_stream_property_estimation_agent(llm, llm_provider: str = "openrouter", max_count:int = 10):
    def stream_property_estimation_agent(state: DesignState) -> DesignState:
        """Stream Property Estimation Agent: Generates JSON stream data with reconciled estimates."""
        print("\n# Stream Property Estimation", flush=True)
        
        # Loaded prior LLM results
        flowsheet_description_markdown = state.get("flowsheet_description", "")
        design_basis_markdown = state.get("design_basis", "")
        equipment_and_stream_template_json = state.get("equipment_and_stream_template", "{}")
        
        # Check if all inputs has value
        if not flowsheet_description_markdown or not design_basis_markdown or not equipment_and_stream_template_json:
            print("FAILED: Previous data is missing...", flush=True)
            exit(-1)
            
        equipment_and_stream_template_dict = json.loads(repair_json(equipment_and_stream_template_json))
        if "equipments" not in equipment_and_stream_template_dict or "streams" not in equipment_and_stream_template_dict:
            print("FAILED: Incorrect format of Equipment and Stream Template", flush=True)
            exit(-1)
        # Create tools list to be called by agent
        tools_list = [
            calculate_molar_flow_from_mass,
            calculate_mass_flow_from_molar,
            convert_compositions,
            calculate_volume_flow,
            perform_mass_balance_split,
            perform_mass_balance_mix,
            perform_energy_balance_mix,
            calculate_heat_exchanger_outlet_temp,
            calculate_heat_exchanger_duty,
            get_physical_properties, # Now uses CoolProp
            build_stream_object,
            # unit_converts,
        ]
        
        # Create a system and human prompts
        _, system_message, human_message = stream_calculation_prompt_with_tools(
            design_basis=design_basis_markdown,
            flowsheet_description=flowsheet_description_markdown,
            stream_list_template=equipment_and_stream_template_json,
            )
        
        llm.temperature = 0.3
        
        is_done = False
        try_count = 0
        while not is_done:
            try_count += 1
            if try_count > max_count:
                print("DEBUG: Maximum try count reached. Exiting")
                exit(-1)
            try:
                print(f"DEBUG: Attemp {try_count} ---")
                ai_messages = run_agent_with_tools(
                    llm_model=llm,
                    system_prompt=system_message,
                    human_prompt=human_message,
                    tools_list=tools_list
                    )
                print(f"DEBUG: Return from run_agent_with_tools.")
                try:
                    if isinstance(ai_messages, list):
                        print("DEBUG: ai_messages is a list")
                        final_answer = ai_messages[-1]
                        if isinstance(final_answer, AIMessage):
                            print("DEBUG: last message is an AIMessage")
                            output_str = final_answer.content
                        else:
                            print("last message is not a AIMessage")
                            print(final_answer)
                            continue
                    else:
                        print(f"ai_messages is not a list: {ai_messages}")
                        continue
                    
                    print("DEBUG: Convert ai_message to dict.")
                    streams_list_dict = json.loads(repair_json(output_str))
                    if "streams" not in streams_list_dict:
                        print("FAILED: Incorrect format of Stream List", flush=True)
                        print(output_str)
                        continue
                    
                    print("DEBUG: Convert dict is successful.")
                    equipment_stream_list_dict = {
                        "equipments": equipment_and_stream_template_dict["equipments"],
                        "streams": streams_list_dict["streams"],
                        }
                    _, _, streams_md = equipments_and_streams_dict_to_markdown(equipment_stream_list_dict)
                    print("DEBUG: ** Steam List **")
                    print(streams_md)
                    
                    return {
                        "stream_list_results": json.dumps(streams_list_dict),
                        "equipment_and_stream_results": json.dumps(equipment_stream_list_dict),
                        "messages": ai_messages,
                    }
                except Exception as e:
                    print(f"DEBUG: Attemp {try_count}: has failed. Error: {e}")
                    print(ai_messages)
            except:
                continue
    return stream_property_estimation_agent


def stream_property_estimation_prompt(
    flowsheet_description_markdown: str,
    design_basis_markdown: str,
    equipments_and_streams_list: str,
) -> ChatPromptTemplate:
    system_content = f"""
<?xml version="1.0" encoding="UTF-8"?>
<agent>
  <metadata>
    <role>Senior Process Simulation Engineer</role>
    <specialization>First-pass heat and material balances for conceptual designs</specialization>
    <function>Populate equipment and stream templates with realistic, reconciled operating conditions</function>
    <deliverable>Authoritative dataset for equipment sizing, detailed simulation, and cost estimation</deliverable>
  </metadata>

  <context>
    <inputs>
      <input>
        <n>EQUIPMENTS_STREAMS_TEMPLATE</n>
        <format>JSON</format>
        <description>Template document containing placeholder stream information with structure for equipments and streams</description>
        <contains>
          <item>Equipment definitions with inlet/outlet stream references</item>
          <item>Stream structure with placeholder properties and compositions</item>
          <item>Design criteria and constraints</item>
        </contains>
      </input>
      <input>
        <n>DESIGN_DOCUMENTS</n>
        <format>JSON, Markdown, or text</format>
        <description>Supporting documentation including concept summary, requirements, design basis</description>
        <contains>
          <item>Unit operations and process descriptions</item>
          <item>Performance targets and specifications</item>
          <item>Operating constraints and design parameters</item>
          <item>Thermodynamic properties (Cp values, densities, viscosities, MW)</item>
          <item>Feed compositions and product requirements</item>
          <item>Design basis parameters (capacity, temperatures, pressures)</item>
        </contains>
      </input>
    </inputs>
    <task_scope>
      <item>Populate ALL stream properties with realistic numeric values based on design documents</item>
      <item>Calculate missing stream properties (flows, temperatures, pressures, compositions)</item>
      <item>Ensure mass and component balances are conserved at each unit</item>
      <item>Reconcile compositions across all interconnected streams</item>
      <item>Document all assumptions and calculation methods in stream notes</item>
      <item>Leave equipment section untouched—only modify streams section</item>
    </task_scope>
    <output_purpose>Authoritative, reconciled stream dataset for downstream engineering phases</output_purpose>
    <downstream_users>
      <user>Equipment sizing specialists (use stream properties for duty calculations)</user>
      <user>Detailed process simulation engineers (use stream data for rigorous simulation)</user>
      <user>Cost estimation teams (use flows and utilities for OPEX calculations)</user>
      <user>Safety and risk assessment teams (use stream compositions and conditions)</user>
    </downstream_users>
  </context>

  <instructions>
    <instruction id="1">
      <title>Analyze Input Template and Design Documents</title>
      <details>
        - Carefully review the EQUIPMENTS_STREAMS_TEMPLATE JSON structure
        - Identify which stream properties are already populated vs. which are placeholders (null, "000", TBD, etc.)
        - Review all DESIGN_DOCUMENTS to extract:
          * **Component List**: Look for the "Component List & Physical Properties" table in the Design Basis to identify all valid species and their MW/Boiling Points.
          * Design basis parameters (capacity targets, feed rates, outlet specifications)
          * Operating conditions (temperatures, pressures at key points)
          * Stream compositions (feed, product, intermediates)
          * Thermodynamic property data (Cp, density, viscosity, molecular weights)
          * Energy balance requirements (cooling duty, heating duty)
          * Equipment design criteria (heat duty, volumes, residence times)
        - Create a map of stream connectivity: which equipment inlet/outlets connect to which streams
        - Identify which streams are process streams (numbered 1xxx), utility streams (2xxx), recycle (3xxx), products (4xxx)
      </details>
    </instruction>

    <instruction id="2">
      <title>Establish Calculation Sequence</title>
      <details>
        - Determine the feed stream(s) (entry point to the process)
        - Trace the process flow through each unit operation from feed to product
        - Plan calculation order:
          1. Start with primary feed stream(s): use design basis to populate mass flow, temperature, pressure, composition
          2. Calculate molar flow rate from mass flow and composition
          3. For each downstream unit, apply unit-specific balances:
             - Heat exchangers: outlet temperature from energy balance
             - Reactors: product composition from conversion/stoichiometry, outlet temperature from energy balance
             - Separators: product split based on separation efficiency
             - Pumps: outlet pressure from head calculation
          4. Then handle utility streams (cooling water, steam, etc.)
        - Work sequentially so outlet of one unit feeds as inlet to next unit
        - Maintain consistency: outlet temperature/pressure/composition from Unit A = inlet to Unit B
      </details>
    </instruction>

    <instruction id="3">
      <title>Populate Primary Feed Stream</title>
      <details>
        - Identify the primary feed stream(s) from design documents
        - Extract or calculate:
          * Mass flow rate: from design basis (e.g., "10,000 kg/h ethanol")
          * Temperature: from design basis (e.g., "inlet at 25°C")
          * Pressure: from design basis (e.g., "1.0 barg")
          * Composition: from design basis (e.g., "95 mol% ethanol, 5 mol% water")
        - Calculate molar flow: 
          * First calculate average molecular weight: MW_avg = sum(mole_fraction_i × MW_i)
          * Then molar flow = mass_flow / MW_avg
        - Calculate density:
          * For liquids: use composition-weighted average density
          * Example: ρ = (X_ethanol × ρ_ethanol) + (X_water × ρ_water)
          * Temperature corrections may be needed
        - Populate all fields in feed stream with numeric values (floats)
        - Document in notes: "Feed stream populated from design basis: [cite source]"
      </details>
    </instruction>

    <instruction id="4">
      <title>Apply Unit Operation Balances</title>
      <details>
        - For HEAT EXCHANGERS:
          * Calculate outlet temperature from energy balance: Q = m × Cp × ΔT
          * Rearrange: T_out = T_in - Q / (m × Cp)
          * Composition unchanged (no reaction)
          * Pressure drop: typically 10-30 kPa (use design guidelines or estimate)
          * Calculate cooling/heating utility flow from its energy balance
        
        - For REACTORS:
          * Calculate product composition from conversion and stoichiometry
          * Example: If 80% conversion of limiting reactant, calculate product composition
          * Calculate outlet temperature from reaction heat (ΔH_rxn) and sensible heat
          * T_out = T_in + (n_rxn × ΔH_rxn) / (m × Cp) for adiabatic
          * For cooled reactor: T_out = specified (from design basis)
        
        - For SEPARATORS / COLUMNS:
          * Calculate split fractions based on separation efficiency (e.g., 99% pure product)
          * Top product: light components
          * Bottom product: heavy components
          * Both streams inherit temperature from separator
          * Pressure typically at bubble point or design pressure
        
        - For PUMPS:
          * Inlet: use incoming stream properties
          * Outlet pressure: inlet pressure + head (from pump curve)
          * Head = Q × ΔP / (ρ × g) where ΔP = discharge pressure - suction pressure
          * Temperature typically unchanged (incompressible liquid)
        
        - For COMPRESSORS:
          * Inlet: use incoming gas stream
          * Outlet pressure: specified by design basis
          * Outlet temperature: use isentropic or polytropic relations
          * T_out = T_in × (P_out / P_in)^((k-1)/k) for isentropic, k ≈ 1.4 for ideal gas
      </details>
    </instruction>

    <instruction id="5">
      <title>Perform Mass and Component Balances</title>
      <details>
        - For each unit operation, apply conservation of mass:
          * Total mass in = Total mass out (no accumulation in steady state)
          * Sum all inlet stream mass flows
          * Sum all outlet stream mass flows
          * Verify they match (within rounding tolerance, typically 0.1%)
        
        - For each component, apply component balance:
          * Moles in = Moles out (accounting for reaction conversion if applicable)
          * For each stream: n_component = (mass_flow / MW_component) × mole_fraction_component
          * Sum component moles across all inlet streams
          * Sum component moles across all outlet streams
          * For reactant: moles_out = moles_in × (1 - conversion) + stoichiometric adjustment
          * For product: moles_out = moles_in + stoichiometric generation
        
        - Verify overall stoichiometry:
          * Example: A → B, if 1 mole A converts to 1 mole B
          * If A inlet is 100 kmol/h at 80% conversion: 100 × 0.80 = 80 kmol/h A reacted
          * Then B outlet includes: B_inlet + 80 kmol/h (from A conversion)
        
        - Document balance closure in stream notes: "Mass balance verified: inlet 10,000 kg/h = outlet 10,000 kg/h ✓"
      </details>
    </instruction>

    <instruction id="6">
      <title>Calculate Consistent Composition Representations</title>
      <details>
        - For each stream, use MOLAR FRACTION as primary basis (recommended)
        
        - If given molar fractions, calculate mass fractions:
          * Step 1: Calculate average MW = sum(x_i × MW_i) where x_i is molar fraction
          * Step 2: For each component i, mass fraction = (x_i × MW_i) / average_MW
          * Step 3: Verify sum of mass fractions = 1.0 ± 0.1%
          * Example: Ethanol-water at x_EtOH = 0.95, x_H2O = 0.05
            - MW_avg = 0.95(46.068) + 0.05(18.015) = 43.846
            - w_EtOH = 0.95 × 46.068 / 43.846 = 0.9967
            - w_H2O = 0.05 × 18.015 / 43.846 = 0.0033
            - Sum = 0.9967 + 0.0033 = 1.0 ✓
        
        - If given mass fractions, calculate molar fractions:
          * Step 1: For each component i, calculate (w_i / MW_i)
          * Step 2: Divide by sum of (w_j / MW_j) for all components j
          * Step 3: Verify sum of molar fractions = 1.0 ± 0.1%
        
        - For components NOT present in stream, explicitly set value to 0.0 (not null, not omitted)
        - Maintain at least 4 decimal places for all fraction values
        - Document in stream notes: "Composition basis: molar fractions; mass fractions calculated from MW_i = [values]"
      </details>
    </instruction>

    <instruction id="7">
      <title>Calculate Density and Volume Flow</title>
      <details>
        - For LIQUID STREAMS:
          * Use composition-weighted average density
          * ρ_mix = sum(x_i × ρ_i) where x_i is mass fraction and ρ_i is component density
          * Apply temperature correction if necessary (density typically decreases ~0.1-0.2%/°C for hydrocarbons)
          * Example: Ethanol-water mixture at 60°C average composition
            - w_EtOH = 0.9967, ρ_EtOH_at_60°C ≈ 765 kg/m³
            - w_H2O = 0.0033, ρ_H2O_at_60°C ≈ 985 kg/m³
            - ρ_mix = 0.9967(765) + 0.0033(985) ≈ 766 kg/m³
          * Volume flow = mass_flow / density
        
        - For VAPOR/GAS STREAMS:
          * Use ideal gas law: ρ = (P × MW_avg) / (R × T)
            - P in Pa (absolute)
            - MW in kg/kmol
            - R = 8.314 J/(kmol·K)
            - T in K
          * Volume flow = mass_flow / density
        
        - For TWO-PHASE STREAMS:
          * Determine phase split from equilibrium (if available) or design basis
          * Calculate weighted density and volume based on liquid/vapor split
      </details>
    </instruction>

    <instruction id="8">
      <title>Verify Energy Balances</title>
      <details>
        - For each equipment unit with heat/work interaction, verify energy balance:
          * Q_in - Q_out + W_shaft = ΔH_streams
          * Where ΔH_streams = sum(n_out × H_out) - sum(n_in × H_in)
        
        - For HEAT EXCHANGERS (no shaft work):
          * Q_process_side = - Q_utility_side (energy balance check)
          * Q_process = m_process × Cp_process × ΔT_process
          * Q_utility = m_utility × Cp_utility × ΔT_utility
          * Verify: |Q_process| ≈ |Q_utility| (within ~5% for realistic conditions)
          * Example: Ethanol cooler
            - Q_ethanol = 10,000 kg/h × 2.44 kJ/kg-K × (40-80)°C = 976 kW (heat removed)
            - Q_cooling_water = 24,000 kg/h × 4.18 kJ/kg-K × (35-25)°C = 1,008 kW (heat absorbed)
            - Difference ≈ 3% (acceptable; accounts for losses)
        
        - For REACTORS with HEAT OF REACTION:
          * Q_sensible = m × Cp × ΔT (sensible heat change)
          * Q_rxn = n_reacted × ΔH_rxn (heat of reaction)
          * Total = Q_sensible + Q_rxn = cooling/heating duty required
        
        - Document in stream notes: "Energy balance verified: [duty calculation]"
      </details>
    </instruction>

    <instruction id="9">
      <title>Document All Assumptions and Methods</title>
      <details>
        - For each stream, populate the "notes" field with:
          * Source of data: "Populated from design basis: [cite reference]" or "Calculated from unit balance"
          * Composition basis: "Molar fractions primary; mass fractions calculated using MW values: ethanol 46.068, water 18.015"
          * Thermodynamic assumptions: "Assumes constant Cp = 2.44 kJ/kg-K for ethanol over 40-80°C range" or "Temperature-dependent Cp applied per [reference]"
          * Calculation method: "Outlet temperature calculated from energy balance: T_out = T_in - Q/(m·Cp) = 40°C"
          * Density calculation: "Composition-weighted density = [formula and result]"
          * Balance verification: "Mass balance closed: inlet 10,000 kg/h = outlet 10,000 kg/h ✓"
          * Known limitations: "Assumes ideal mixing; no fouling on heat exchanger surfaces"
          * Critical control points: "Temperature on stream [ID] is critical to process control; requires accurate measurement"
          * FEED phase gaps: "Ethanol specific heat assumed constant; verify with rigorous thermodynamic simulation in FEED Phase 1"
        
        - Keep notes concise but complete enough for downstream engineers to understand and validate
        - Use technical language appropriate for process engineers
      </details>
    </instruction>

    <instruction id="10">
      <title>Preserve Equipment Section - No Modifications</title>
      <details>
        - Do NOT modify the "equipments" array in any way
        - Leave all equipment IDs, names, types, descriptions, and design criteria unchanged
        - Do NOT modify sizing_parameters structure
        - Equipment sizing will be performed by downstream Equipment Sizing Agent
        - Only modify the "streams" array in the output JSON
      </details>
    </instruction>

    <instruction id="11">
      <title>Validate All Streams for Completeness</title>
      <details>
        - For EVERY stream in the template:
          * Verify that mass_flow is numeric (float), not placeholder
          * Verify that temperature is numeric, not null or "000"
          * Verify that pressure is numeric, not placeholder
          * Verify that Calculate Consistent Composition Representations must be completed
          * Verify that ALL component fractions sum to 1.0 ± 0.1%
          * Verify that components not present are explicitly set to 0.0
          * Verify that phase designation is appropriate (Liquid, Vapor, Two-Phase)
          * Verify that density and volume_flow are calculated, not null
        
        - Check inter-stream consistency:
          * Outlet of Unit A temperature/pressure/composition should logically feed to inlet of Unit B
          * If Stream X goes from unit A outlet to unit B inlet, properties must be consistent
          * No orphaned streams or unexplained property changes
        
        - Verify mass balance at each unit:
          * Sum of inlet flows = Sum of outlet flows
          * For each component: sum inlet moles = sum outlet moles (accounting for reactions)
          * Document balance verification in stream notes and/or top-level notes_and_assumptions
      </details>
    </instruction>

    <instruction id="12">
      <title>Output Discipline - Pure JSON Only</title>
      <details>
        - Return a single valid JSON object matching the schema structure
        - Use ONLY double quotes (no single quotes)
        - Ensure all numeric values are float type (e.g., 10.0, not "10" or 10)
        - Use decimal notation for all numbers (0.95, not 95%)
        - No trailing commas in any array or object
        - All arrays and objects must be properly closed
        - No comments or explanatory prose inside the JSON
        - No code fences (```) or Markdown formatting
        - UTF-8 safe characters only
        - Output ONLY the JSON object—no preamble, no code blocks, no additional text
      </details>
    </instruction>
  </instructions>

  <output_schema>
    <root_object>
      <key name="equipments">
        <type>array</type>
        <description>Equipment list - PRESERVE FROM INPUT TEMPLATE UNCHANGED</description>
        <instruction>Copy equipment array exactly as provided in input; make no modifications</instruction>
      </key>

      <key name="streams">
        <type>array</type>
        <item_type>object</item_type>
        <description>Complete stream list with ALL properties populated with numeric values</description>

        <stream_object_template>
          <field name="id">
            <type>string</type>
            <description>Stream identifier (preserve from template)</description>
          </field>
          <field name="name">
            <type>string</type>
            <description>Stream name (preserve from template)</description>
          </field>
          <field name="description">
            <type>string</type>
            <description>Stream description (preserve from template)</description>
          </field>
          <field name="from">
            <type>string</type>
            <description>Source unit or external inlet (preserve from template)</description>
          </field>
          <field name="to">
            <type>string</type>
            <description>Destination unit or external outlet (preserve from template)</description>
          </field>
          <field name="phase">
            <type>string</type>
            <description>Physical phase of stream (Liquid, Vapor, Two-Phase, Gas, Slurry, etc.)</description>
            <requirement>Must be populated; update from template if needed based on T/P/composition</requirement>
          </field>

          <field name="properties">
            <type>object</type>
            <description>Stream thermodynamic and flow properties - ALL VALUES MUST BE POPULATED</description>
            <required_properties>
              <property>
                <name>mass_flow</name>
                <type>object with value (float) and unit (string)</type>
                <unit_example>kg/h</unit_example>
                <requirement>MUST be numeric float, never null or "000"</requirement>
              </property>
              <property>
                <name>molar_flow</name>
                <type>object with value (float) and unit (string)</type>
                <unit_example>kmol/h</unit_example>
                <requirement>MUST be calculated and populated; never null</requirement>
                <calculation_note>molar_flow = mass_flow / (average_MW), where average_MW = sum(x_i * MW_i)</calculation_note>
              </property>
              <property>
                <name>temperature</name>
                <type>object with value (float) and unit (string)</type>
                <unit_example>°C</unit_example>
                <requirement>MUST be numeric, never null or "000"; use unit consistently</requirement>
              </property>
              <property>
                <name>pressure</name>
                <type>object with value (float) and unit (string)</type>
                <unit_example>barg</unit_example>
                <requirement>MUST be numeric, never null; use absolute pressure where needed for calculations</requirement>
              </property>
              <property>
                <name>volume_flow</name>
                <type>object with value (float) and unit (string)</type>
                <unit_example>m³/h</unit_example>
                <requirement>MUST be calculated from mass_flow / density; never null</requirement>
              </property>
              <property>
                <name>density</name>
                <type>object with value (float) and unit (string)</type>
                <unit_example>kg/m³</unit_example>
                <requirement>MUST be calculated; composition-weighted for liquids, ideal gas for vapors</requirement>
              </property>
            </required_properties>
          </field>

          <field name="compositions">
            <type>object</type>
            <description>Component composition mapping to molar and/or mass fractions</description>
            <requirement>Every component must have an entry; components NOT present must be 0.0</requirement>
            <structure_per_component>
              <component_name>
                <subfield name="value">
                  <type>float</type>
                  <range>0.0 to 1.0</range>
                  <requirement>MUST be numeric float; never null or "000"</requirement>
                </subfield>
                <subfield name="unit">
                  <type>string</type>
                  <allowed>molar fraction or mass fraction</allowed>
                  <requirement>MUST specify basis</requirement>
                </subfield>
              </component_name>
            </structure_per_component>
            <validation_rules>
              <rule>Sum of all molar fractions = 1.0 ± 0.001 (100% ± 0.1%)</rule>
              <rule>Sum of all mass fractions = 1.0 ± 0.001 (100% ± 0.1%)</rule>
              <rule>Components not in stream must be explicitly set to 0.0</rule>
              <rule>Minimum 4 decimal places for precision</rule>
              <rule>Molar ↔ mass fraction consistency verified using MW values</rule>
            </validation_rules>
          </field>

          <field name="notes">
            <type>string</type>
            <description>Detailed technical notes capturing calculations, assumptions, and validation</description>
            <required_content>
              <item>Source of data (design basis reference or calculation method)</item>
              <item>Composition basis (molar vs. mass fraction)</item>
              <item>Thermodynamic property assumptions (Cp values, density model used)</item>
              <item>Calculation methods for derived properties (how temperature was obtained, how density calculated)</item>
              <item>Unit balance verification (mass balance closure confirmation)</item>
              <item>Known limitations or uncertainties</item>
              <item>Critical control points for this stream</item>
              <item>FEED phase data gaps or validation items</item>
            </required_content>
            <example_note>Inlet feed stream from design basis: 10,000 kg/h at 80°C, 1.7 barg. Composition 95 mol% ethanol, 5 mol% water (from design basis). Molar flow calculated: MW_avg = 0.95(46.068) + 0.05(18.015) = 43.846 → molar_flow = 10000/43.846 × 1000 = 228.1 kmol/h. Density composition-weighted at 80°C: ρ = 0.9967(765) + 0.0033(985) ≈ 766 kg/m³. Mass balance verified against outlet stream. Cp assumed constant 2.44 kJ/kg-K per design basis; to be confirmed in FEED with rigorous thermodynamic data.</example_note>
          </field>
        </stream_object_template>
      </key>

      <key name="notes_and_assumptions">
        <type>array of strings</type>
        <description>Project-level assumptions and methodology summary</description>
        <required_content>
          <item>Thermodynamic property sources (e.g., "Ethanol Cp from design basis: 2.44 kJ/kg-K; water from Perry's Chemical Engineers' Handbook")</item>
          <item>Design basis parameters used (e.g., "Design capacity 10,000 kg/h per concept summary; inlet temperature 80°C per requirements")</item>
          <item>Unit operation models applied (e.g., "Heat exchanger outlet temperature calculated from energy balance assuming no losses")</item>
          <item>Simplifications or approximations (e.g., "Constant specific heats assumed over operating range; isothermal mixing assumed in separator")</item>
          <item>Data gaps or TBD items (e.g., "Cooling water supply pressure TBD from utility documentation; assumed 2.5 barg pending confirmation")</item>
          <item>Mass balance summary (e.g., "Total inlet mass flow = 10,000 kg/h ethanol + 24,000 kg/h cooling water = 34,000 kg/h; total outlet mass flow = 10,000 + 24,000 = 34,000 kg/h ✓ Verified")</item>
          <item>Energy balance summary (e.g., "Cooling duty calculated: 10,000 kg/h × 2.44 kJ/kg-K × 40°C = 976 kW; cooling water duty: 24,000 kg/h × 4.18 kJ/kg-K × 10°C = 1,008 kW; difference 3% acceptable")</item>
          <item>Critical validation items for FEED phase (e.g., "Ethanol Cp to be verified with detailed thermodynamic simulation; cooling water supply pressure and temperature profile to be confirmed from site data")</item>
        </required_content>
      </key>
    </root_object>

    <json_validation_rules>
      <rule>All numeric property values MUST be float type (e.g., 10.0, 0.95, 765.0)</rule>
      <rule>NO string numbers (e.g., "10.0", "0.95") allowed</rule>
      <rule>NO null values in required fields (mass_flow, temperature, pressure, molar_flow, density, volume_flow, compositions)</rule>
      <rule>NO placeholder text like "000", "TBD", "null", "N/A" in numeric fields</rule>
      <rule>Fraction values (composition) must sum to 1.0 ± 0.001</rule>
      <rule>Phase field must be populated (Liquid, Vapor, Two-Phase, etc.)</rule>
      <rule>Stream notes must be non-empty and provide calculation/assumption details</rule>
      <rule>All arrays and objects properly closed with correct braces and commas</rule>
    </json_validation_rules>

    <thermodynamic_reference_data>
      <description>Common thermodynamic properties for process simulation and stream estimation</description>
      
      <compound name="Ethanol (C2H6O)">
        <mw>46.068</mw>
        <cp_liquid>2.44</cp_liquid>
        <cp_unit>kJ/kg-K (25-80°C)</cp_unit>
        <density_at_20c>789.0</density_at_20c>
        <density_at_40c>765.0</density_at_40c>
        <density_at_60c>747.0</density_at_60c>
        <density_at_80c>728.0</density_at_80c>
        <density_unit>kg/m³</density_unit>
        <bp>78.37</bp>
        <bp_unit>°C at 1 atm</bp_unit>
        <viscosity_at_20c>1.20</viscosity_at_20c>
        <viscosity_unit>mPa·s</viscosity_unit>
      </compound>

      <compound name="Water (H2O)">
        <mw>18.015</mw>
        <cp_liquid>4.18</cp_liquid>
        <cp_unit>kJ/kg-K (0-100°C)</cp_unit>
        <density_at_20c>998.0</density_at_20c>
        <density_at_25c>997.0</density_at_25c>
        <density_at_35c>994.0</density_at_35c>
        <density_at_40c>992.0</density_at_40c>
        <density_at_60c>983.0</density_at_60c>
        <density_at_80c>972.0</density_at_80c>
        <density_unit>kg/m³</density_unit>
        <bp>100.0</bp>
        <bp_unit>°C at 1 atm</bp_unit>
        <viscosity_at_20c>1.002</viscosity_at_20c>
        <viscosity_unit>mPa·s</viscosity_unit>
      </compound>

      <compound name="Methanol (CH4O)">
        <mw>32.042</mw>
        <cp_liquid>2.51</cp_liquid>
        <cp_unit>kJ/kg-K (25°C)</cp_unit>
        <density_at_20c>792.0</density_at_20c>
        <density_at_40c>767.0</density_at_40c>
        <density_at_60c>741.0</density_at_60c>
        <density_unit>kg/m³</density_unit>
        <bp>64.7</bp>
        <bp_unit>°C at 1 atm</bp_unit>
        <viscosity_at_20c>0.544</viscosity_at_20c>
        <viscosity_unit>mPa·s</viscosity_unit>
      </compound>

      <compound name="Benzene (C6H6)">
        <mw>78.112</mw>
        <cp_liquid>1.70</cp_liquid>
        <cp_unit>kJ/kg-K</cp_unit>
        <density_at_20c>878.0</density_at_20c>
        <density_at_40c>860.0</density_at_40c>
        <density_at_60c>840.0</density_at_60c>
        <density_unit>kg/m³</density_unit>
        <bp>80.1</bp>
        <bp_unit>°C at 1 atm</bp_unit>
        <viscosity_at_20c>0.601</viscosity_at_20c>
        <viscosity_unit>mPa·s</viscosity_unit>
      </compound>

      <compound name="Toluene (C7H8)">
        <mw>92.139</mw>
        <cp_liquid>1.63</cp_liquid>
        <cp_unit>kJ/kg-K</cp_unit>
        <density_at_20c>865.0</density_at_20c>
        <density_at_40c>847.0</density_at_40c>
        <density_at_60c>827.0</density_at_60c>
        <density_unit>kg/m³</density_unit>
        <bp>110.6</bp>
        <bp_unit>°C at 1 atm</bp_unit>
        <viscosity_at_20c>0.590</viscosity_at_20c>
        <viscosity_unit>mPa·s</viscosity_unit>
      </compound>

      <compound name="Acetic Acid (C2H4O2)">
        <mw>60.052</mw>
        <cp_liquid>2.08</cp_liquid>
        <cp_unit>kJ/kg-K</cp_unit>
        <density_at_20c>1049.0</density_at_20c>
        <density_at_40c>1037.0</density_at_40c>
        <density_at_60c>1024.0</density_at_60c>
        <density_unit>kg/m³</density_unit>
        <bp>118.1</bp>
        <bp_unit>°C at 1 atm</bp_unit>
        <viscosity_at_20c>1.056</viscosity_at_20c>
        <viscosity_unit>mPa·s</viscosity_unit>
      </compound>

      <compound name="Propane (C3H8)">
        <mw>44.097</mw>
        <cp_liquid>2.40</cp_liquid>
        <cp_unit>kJ/kg-K (saturated)</cp_unit>
        <cp_vapor>1.68</cp_vapor>
        <cp_vapor_unit>kJ/kg-K (25°C, 1 atm)</cp_vapor_unit>
        <density_liquid_at_0c>600.0</density_liquid_at_0c>
        <density_unit>kg/m³</density_unit>
        <bp>-42.1</bp>
        <bp_unit>°C at 1 atm</bp_unit>
        <note>Vapor at normal conditions</note>
      </compound>

      <compound name="Ethylene (C2H4)">
        <mw>28.054</mw>
        <cp_vapor>1.55</cp_vapor>
        <cp_vapor_unit>kJ/kg-K (25°C, 1 atm)</cp_vapor_unit>
        <bp>-103.7</bp>
        <bp_unit>°C at 1 atm</bp_unit>
        <note>Vapor at normal conditions; use ideal gas law for density</note>
      </compound>

      <compound name="Propylene (C3H6)">
        <mw>42.081</mw>
        <cp_vapor>1.64</cp_vapor>
        <cp_vapor_unit>kJ/kg-K (25°C, 1 atm)</cp_vapor_unit>
        <bp>-47.6</bp>
        <bp_unit>°C at 1 atm</bp_unit>
        <note>Vapor at normal conditions; use ideal gas law for density</note>
      </compound>

      <density_temperature_correction_method>
        <description>Estimate density at intermediate temperatures using linear interpolation</description>
        <formula>ρ(T) = ρ_ref - β × (T - T_ref)</formula>
        <where>
          <term>ρ_ref = density at reference temperature (e.g., 20°C)</term>
          <term>β = temperature coefficient (density decrease per °C)</term>
          <term>T = target temperature</term>
          <term>T_ref = reference temperature</term>
        </where>
        <typical_beta_values>
          <example>Ethanol: β ≈ 0.5-0.7 kg/m³/°C</example>
          <example>Water: β ≈ 0.3-0.4 kg/m³/°C</example>
          <example>Hydrocarbons: β ≈ 0.6-0.8 kg/m³/°C</example>
        </typical_beta_values>
        <example>
          <scenario>Ethanol at 50°C (ref at 20°C, ρ_20 = 789 kg/m³, β = 0.61)</scenario>
          <calculation>ρ_50 = 789 - 0.61 × (50 - 20) = 789 - 18.3 = 770.7 kg/m³</calculation>
        </example>
      </density_temperature_correction_method>

      <composition_weighted_density_method>
        <description>Calculate mixture density from component densities and mass fractions</description>
        <formula>ρ_mix = sum(w_i × ρ_i)</formula>
        <where>
          <term>w_i = mass fraction of component i</term>
          <term>ρ_i = density of component i at the mixture temperature</term>
        </where>
        <example>
          <scenario>Ethanol-water mixture at 60°C: w_ethanol = 0.9967, w_water = 0.0033</scenario>
          <step1>ρ_ethanol_at_60°C = 747 kg/m³ (from reference table)</step1>
          <step2>ρ_water_at_60°C = 983 kg/m³ (from reference table)</step2>
          <step3>ρ_mix = (0.9967 × 747) + (0.0033 × 983) = 744.4 + 3.2 = 747.6 kg/m³</step3>
        </example>
        <note>For ideal mixing, volumes are additive; otherwise use ideal solution assumption</note>
      </composition_weighted_density_method>

      <ideal_gas_law_for_vapors>
        <description>Calculate vapor density using ideal gas law</description>
        <formula>ρ = (P × MW) / (R × T)</formula>
        <where>
          <term>P = absolute pressure in Pa</term>
          <term>MW = molecular weight in kg/kmol</term>
          <term>R = gas constant = 8.314 J/(kmol·K)</term>
          <term>T = absolute temperature in K</term>
        </where>
        <example>
          <scenario>Ethylene vapor at 25°C, 1 atm</scenario>
          <step1>P = 101,325 Pa (absolute)</step1>
          <step2>MW = 28.054 kg/kmol</step2>
          <step3>T = 25 + 273.15 = 298.15 K</step3>
          <step4>ρ = (101,325 × 28.054) / (8.314 × 298.15) = 1.15 kg/m³</step4>
        </example>
      </ideal_gas_law_for_vapors>

      <two_phase_mixture_properties>
        <description>Calculate properties for two-phase streams (liquid + vapor)</description>
        <quality_definition>
          <x_quality>Mass fraction of vapor phase (dryness fraction)</x_quality>
          <example>x = 0.3 means 30% vapor, 70% liquid by mass</example>
        </quality_definition>
        <density_two_phase>
          <formula>ρ_two_phase = 1 / (x/ρ_vapor + (1-x)/ρ_liquid)</formula>
          <where>
            <term>x = vapor quality (0 to 1)</term>
            <term>ρ_vapor = vapor density at saturation</term>
            <term>ρ_liquid = liquid density at saturation</term>
          </where>
          <example>
            <scenario>Water at 100°C, 1 atm, x = 0.3</scenario>
            <step1>ρ_liquid_sat = 958 kg/m³</step1>
            <step2>ρ_vapor_sat = 0.598 kg/m³</step2>
            <step3>ρ = 1 / (0.3/0.598 + 0.7/958) = 1 / (0.502 + 0.000731) = 1.99 kg/m³</step3>
          </example>
        </density_two_phase>
      </two_phase_mixture_properties>

      <property_data_sources>
        <source name="Perry's Chemical Engineers' Handbook">
          <application>Comprehensive reference for physical properties, thermodynamic data, design correlations</application>
          <reliability>Industry standard; highly recommended</reliability>
        </source>
        <source name="NIST WebBook (webbook.nist.gov)">
          <application>Thermodynamic properties, critical constants, saturation properties</application>
          <reliability>Highly accurate; publicly available</reliability>
        </source>
        <source name="Aspen Properties or REFPROP">
          <application>Rigorous thermodynamic calculations; handles non-ideal behavior</application>
          <reliability>High accuracy; used in detailed simulation</reliability>
        </source>
        <source name="Design Documents">
          <application>Project-specific property data, design basis parameters</application>
          <reliability>Use design basis values when provided; validate against references</reliability>
        </source>
      </property_data_sources>

      <validation_examples>
        <example name="Check Composition-Weighted Density">
          <description>Verify that calculated mixture density is reasonable</description>
          <check>
            <criterion>Mixture density should fall between the densities of pure components</criterion>
            <example>For ethanol (789 kg/m³) + water (998 kg/m³) mixture: ρ_mix should be 789 &lt; ρ_mix &lt; 998</example>
          </check>
          <check>
            <criterion>Mixture density weighted towards predominant component</criterion>
            <example>95 wt% ethanol: ρ_mix should be close to ρ_ethanol = 789, not close to 998</example>
          </check>
        </example>

        <example name="Check Temperature-Corrected Density">
          <description>Verify that density changes with temperature in reasonable direction</description>
          <check>
            <criterion>Liquid density decreases with increasing temperature</criterion>
            <example>Ethanol: ρ_20°C = 789 &gt; ρ_40°C = 765 &gt; ρ_60°C = 747 kg/m³ ✓</example>
          </check>
          <check>
            <criterion>Rate of change reasonable (~0.5-0.7 kg/m³/°C for liquids)</criterion>
            <example>(789 - 765) / 20°C = 1.2 kg/m³/°C (reasonable)</example>
          </check>
        </example>

        <example name="Check Vapor Density from Ideal Gas">
          <description>Verify vapor density calculation is reasonable</description>
          <check>
            <criterion>Vapor density much lower than liquid density</criterion>
            <example>Ethanol liquid: 789 kg/m³; ethanol vapor at 80°C: ~1.5 kg/m³ ✓</example>
          </check>
          <check>
            <criterion>Vapor density increases with pressure</criterion>
            <example>Same gas at higher pressure should give higher density</example>
          </check>
        </example>
      </validation_examples>

      <quick_reference_table>
        <description>Quick lookup for common stream conditions</description>
        <entry>
          <stream>Ethanol at 80°C, 1.7 barg (liquid)</stream>
          <density>~749 kg/m³</density>
          <cp>2.44 kJ/kg-K</cp>
          <phase>Liquid (safe below Tb = 78.4°C at 1 atm, but liquid at 1.7 barg)</phase>
        </entry>
        <entry>
          <stream>Ethanol at 40°C, 1.0 barg (liquid)</stream>
          <density>~765 kg/m³</density>
          <cp>2.44 kJ/kg-K</cp>
          <phase>Liquid</phase>
        </entry>
        <entry>
          <stream>Water at 25°C, 2.5 barg (liquid)</stream>
          <density>997 kg/m³</density>
          <cp>4.18 kJ/kg-K</cp>
          <phase>Liquid</phase>
        </entry>
        <entry>
          <stream>Water at 35°C, 1.8 barg (liquid)</stream>
          <density>994 kg/m³</density>
          <cp>4.18 kJ/kg-K</cp>
          <phase>Liquid</phase>
        </entry>
        <entry>
          <stream>Methanol at 60°C, 1 atm (liquid)</stream>
          <density>~741 kg/m³</density>
          <cp>2.51 kJ/kg-K</cp>
          <phase>Liquid</phase>
        </entry>
      </quick_reference_table>

    </thermodynamic_reference_data>
  </output_schema>

  <calculation_methodology>
    <methodology name="Composition Conversion Example">
      <description>Convert between molar and mass fractions for ethanol-water mixture</description>
      <scenario>Given: x_ethanol = 0.95, x_water = 0.05 (molar fractions)</scenario>
      <step_1>
        <title>Calculate Average Molecular Weight</title>
        <formula>MW_avg = sum(x_i × MW_i)</formula>
        <calculation>MW_avg = (0.95 × 46.068) + (0.05 × 18.015) = 43.7646 + 0.9008 = 44.6654 g/mol</calculation>
        <note>Round to 43.865 for practical use</note>
      </step_1>
      <step_2>
        <title>Calculate Mass Fractions</title>
        <formula_ethanol>w_ethanol = (x_ethanol × MW_ethanol) / MW_avg</formula_ethanol>
        <calculation_ethanol>w_ethanol = (0.95 × 46.068) / 43.865 = 43.7646 / 43.865 = 0.9977</calculation_ethanol>
        <formula_water>w_water = (x_water × MW_water) / MW_avg</formula_water>
        <calculation_water>w_water = (0.05 × 18.015) / 43.865 = 0.9008 / 43.865 = 0.0205</calculation_water>
      </step_2>
      <step_3>
        <title>Verify Summation</title>
        <check>Sum of mass fractions: 0.9977 + 0.0205 = 1.0182 (rounding error)</check>
        <correction>Normalize: w_ethanol = 0.9977 / 1.0182 = 0.9799; w_water = 0.0205 / 1.0182 = 0.0201</correction>
        <final_verification>0.9799 + 0.0201 = 1.0000 ✓</final_verification>
      </step_3>
    </methodology>

    <methodology name="Molar Flow Calculation">
      <description>Calculate total molar flow from mass flow and composition</description>
      <given>
        <mass_flow>10,000 kg/h</mass_flow>
        <composition>95 mol% ethanol, 5 mol% water</composition>
        <mw_ethanol>46.068 g/mol</mw_ethanol>
        <mw_water>18.015 g/mol</mw_water>
      </given>
      <step_1>
        <title>Calculate Average Molecular Weight</title>
        <formula>MW_avg = (0.95 × 46.068) + (0.05 × 18.015) = 43.865 g/mol = 0.043865 kg/kmol</formula>
      </step_1>
      <step_2>
        <title>Calculate Molar Flow</title>
        <formula>n_total = m_total / MW_avg</formula>
        <calculation>n_total = 10,000 kg/h / 0.043865 kg/kmol = 228,016 kmol/h = 228.0 kmol/h</calculation>
      </step_2>
      <step_3>
        <title>Verify Component Molar Flows</title>
        <calculation_ethanol>n_ethanol = 228.0 × 0.95 = 216.6 kmol/h</calculation_ethanol>
        <calculation_water>n_water = 228.0 × 0.05 = 11.4 kmol/h</calculation_water>
        <mass_check_ethanol>m_ethanol = 216.6 kmol/h × 46.068 kg/kmol = 9,974 kg/h ≈ 9,967 kg/h (expected)</mass_check_ethanol>
        <mass_check_water>m_water = 11.4 kmol/h × 18.015 kg/kmol = 205 kg/h ≈ 200 kg/h (expected)</mass_check_water>
      </step_3>
    </methodology>

    <methodology name="Density Calculation for Liquids">
      <description>Calculate composition-weighted density at specified temperature</description>
      <given>
        <stream>Ethanol-water mixture</stream>
        <mass_fraction_ethanol>0.9967</mass_fraction_ethanol>
        <mass_fraction_water>0.0033</mass_fraction_water>
        <temperature>60°C</temperature>
      </given>
      <step_1>
        <title>Look Up Component Densities at 60°C</title>
        <reference_ethanol>ρ_ethanol @ 60°C = 747 kg/m³</reference_ethanol>
        <reference_water>ρ_water @ 60°C = 983 kg/m³</reference_water>
      </step_1>
      <step_2>
        <title>Calculate Composition-Weighted Density</title>
        <formula>ρ_mix = (w_ethanol × ρ_ethanol) + (w_water × ρ_water)</formula>
        <calculation>ρ_mix = (0.9967 × 747) + (0.0033 × 983) = 744.3 + 3.2 = 747.5 kg/m³</calculation>
      </step_2>
      <step_3>
        <title>Verify Reasonableness</title>
        <check>Is mixture density between pure ethanol and pure water?</check>
        <answer>747 &lt; 747.5 &lt; 983 ✓ Yes</answer>
        <check>Is mixture density closer to predominant component (95% ethanol)?</check>
        <answer>747.5 is very close to 747 (ethanol), far from 983 (water) ✓ Yes</answer>
      </step_3>
    </methodology>

    <methodology name="Energy Balance for Heat Exchangers">
      <description>Calculate outlet temperature or utility flow from energy balance</description>
      <scenario>Cool 10,000 kg/h ethanol from 80°C to 40°C using cooling water</scenario>
      <given>
        <mass_flow_process>10,000 kg/h</mass_flow_process>
        <cp_ethanol>2.44 kJ/kg-K</cp_ethanol>
        <t_in_process>80°C</t_in_process>
        <t_out_process>40°C</t_out_process>
        <t_in_utility>25°C</t_in_utility>
        <cp_water>4.18 kJ/kg-K</cp_water>
      </given>
      <step_1>
        <title>Calculate Process-Side Duty</title>
        <formula>Q_process = m_process × Cp_process × ΔT_process</formula>
        <calculation>Q_process = 10,000 kg/h × 2.44 kJ/kg-K × (40 - 80)°C</calculation>
        <result>Q_process = 10,000 × 2.44 × (-40) = -976,000 kJ/h = -271 kW</result>
        <interpretation>Negative sign indicates heat removal (cooling)</interpretation>
      </step_1>
      <step_2>
        <title>Calculate Utility-Side Flow from Energy Balance</title>
        <formula>|Q_process| = Q_utility = m_utility × Cp_utility × ΔT_utility</formula>
        <assumption>Assuming typical ΔT_utility = 10°C (return temp = 25 + 10 = 35°C)</assumption>
        <calculation>976 kW = m_utility × 4.18 kJ/kg-K × 10°C</calculation>
        <rearranged>m_utility = 976 kW / (4.18 kJ/kg-K × 10°C)</rearranged>
        <unit_conversion>976 kJ/s / (41.8 kJ/°C) = 23.35 kg/s = 84,060 kg/h</unit_conversion>
        <practical>Use 24,000 kg/h with 3% margin</practical>
      </step_2>
      <step_3>
        <title>Verify Energy Balance Closes</title>
        <utility_duty>Q_utility = 24,000 kg/h × 4.18 kJ/kg-K × 10°C = 1,003 kW</utility_duty>
        <process_duty>Q_process = 976 kW (heat removed)</process_duty>
        <difference>1,003 - 976 = 27 kW (≈ 2.7% difference)</difference>
        <acceptability>Within ±5% acceptable; represents line losses and minor inefficiencies ✓</acceptability>
      </step_3>
    </methodology>

    <methodology name="Volume Flow Calculation">
      <description>Calculate volumetric flow from mass flow and density</description>
      <given>
        <mass_flow>10,000 kg/h</mass_flow>
        <density>747.5 kg/m³</density>
      </given>
      <formula>V_flow = m_flow / ρ</formula>
      <calculation>V_flow = 10,000 kg/h / 747.5 kg/m³ = 13.38 m³/h</calculation>
      <unit_conversion>13.38 m³/h ÷ 3.6 = 3.72 m³/s (if needed)</unit_conversion>
    </methodology>

    <methodology name="Mass Balance Verification at Unit">
      <description>Verify inlet and outlet mass flows match at equipment</description>
      <unit>Heat Exchanger E-101</unit>
      <inlet_flows>
        <process_stream_1001>10,000 kg/h (hot ethanol)</process_stream_1001>
        <utility_stream_2001>24,000 kg/h (cooling water inlet)</utility_stream_2001>
        <total_inlet>34,000 kg/h</total_inlet>
      </inlet_flows>
      <outlet_flows>
        <process_stream_1002>10,000 kg/h (cooled ethanol)</process_stream_1002>
        <utility_stream_2002>24,000 kg/h (cooling water return)</utility_stream_2002>
        <total_outlet>34,000 kg/h</total_outlet>
      </outlet_flows>
      <verification>
        <check>Total inlet (34,000) = Total outlet (34,000) ✓</check>
        <tolerance>Difference = 0 kg/h (0% error) ✓ Verified</tolerance>
      </verification>
    </methodology>

    <methodology name="Component Balance Verification">
      <description>Verify molar balance for each component (no reaction case)</description>
      <unit>Heat Exchanger E-101 (no reaction)</unit>
      <ethanol_balance>
        <inlet_moles>228.0 kmol/h × 0.95 = 216.6 kmol/h ethanol</inlet_moles>
        <outlet_moles>228.0 kmol/h × 0.95 = 216.6 kmol/h ethanol</outlet_moles>
        <verification>216.6 = 216.6 ✓ Component balance closed</verification>
      </ethanol_balance>
      <water_balance_in_ethanol_stream>
        <inlet_moles>228.0 kmol/h × 0.05 = 11.4 kmol/h water</inlet_moles>
        <outlet_moles>228.0 kmol/h × 0.05 = 11.4 kmol/h water</outlet_moles>
        <verification>11.4 = 11.4 ✓ Component balance closed</verification>
      </water_balance_in_ethanol_stream>
    </methodology>
  </calculation_methodology>

  <common_errors_to_avoid>
    <error id="1">
      <name>Null or Placeholder Values in Output</name>
      <description>Leaving null, "000", "TBD", or other placeholders in numeric fields instead of calculating values</description>
      <example_wrong>{{"mass_flow": {{"value": null, "unit": "kg/h"}}}}</example_wrong>
      <example_correct>{{"mass_flow": {{"value": 10000.0, "unit": "kg/h"}}}}</example_correct>
      <impact>Output JSON fails validation; cannot be used by downstream sizing and simulation agents</impact>
      <prevention>For every numeric field, either extract value from design documents or calculate from unit balances. No placeholders allowed in final output.</prevention>
    </error>

    <error id="2">
      <name>Composition Fractions Not Summing to 1.0</name>
      <description>Component fractions sum to less than or more than 1.0 due to rounding errors or incomplete data</description>
      <example_wrong>{{"Ethanol": 0.95, "Water": 0.04}} // Sum = 0.99, not 1.0</example_wrong>
      <example_correct>{{"Ethanol": 0.9500, "Water": 0.0500}} // Sum = 1.0000</example_correct>
      <impact>Material balances fail; component balances do not close; equipment sizing becomes invalid</impact>
      <prevention>Maintain 4+ decimal places; verify sum = 1.0 ± 0.001 for each stream; normalize if needed</prevention>
    </error>

    <error id="3">
      <name>Inconsistent Properties at Equipment Boundaries</name>
      <description>Outlet temperature/pressure/composition of Unit A does not match inlet of downstream Unit B</description>
      <example_wrong>
        <stream_1002_outlet>40°C from E-101</stream_1002_outlet>
        <stream_2003_inlet>50°C to pump (should be 40°C)</stream_2003_inlet>
      </example_wrong>
      <impact>Downstream calculations fail; balances do not close; reveals calculation errors</impact>
      <prevention>Map stream connectivity explicitly; verify outlet properties from one unit = inlet to next unit; use consistent IDs</prevention>
    </error>

    <error id="4">
      <name>Mass Balance Does Not Close</name>
      <description>Total inlet mass ≠ Total outlet mass at a unit (difference > 0.1%)</description>
      <example_wrong>
        <inlet>10,000 + 24,000 = 34,000 kg/h</inlet>
        <outlet>10,000 + 23,500 = 33,500 kg/h</outlet>
        <error>500 kg/h unaccounted (1.5% error)</error>
      </example_wrong>
      <impact>Design is invalid; indicates calculation error, missing streams, or unaccounted reactions</impact>
      <prevention>For each unit: sum all inlet flows; sum all outlet flows; verify difference &lt; 0.1%. If not, find error or account for losses/reactions.</prevention>
    </error>

    <error id="5">
      <name>Missing or Incomplete Stream Notes</name>
      <description>Notes field is blank or contains only "TBD" without explanation of how values were obtained</description>
      <example_wrong>{{"notes": "TBD"}}</example_wrong>
      <example_correct>{{"notes": "Inlet feed from design basis: 10,000 kg/h. Molar flow calculated: MW_avg = 43.865 → n = 228.0 kmol/h. Density at 60°C = 747.5 kg/m³ (composition-weighted). Energy balance verified: Q = 976 kW."}}</example_correct>
      <impact>Downstream engineers cannot understand or validate stream data; traceability lost</impact>
      <prevention>Populate notes with: (1) source of data, (2) calculation method if derived, (3) assumptions made, (4) verification statement</prevention>
    </error>

    <error id="6">
      <name>Equipment Section Modified</name>
      <description>Modifying sizing_parameters or equipment properties when only streams should be populated</description>
      <impact>Destroys input template structure; breaks downstream Equipment Sizing Agent workflow</impact>
      <prevention>Copy equipment array unchanged from input template; modify ONLY the streams array</prevention>
    </error>

    <error id="7">
      <name>Incorrect Density Temperature Basis</name>
      <description>Using density at reference temperature (20°C) for streams operating at 60°C or other temperatures</description>
      <example_wrong>Stream at 60°C using ρ = 789 kg/m³ (reference at 20°C for ethanol)</example_wrong>
      <example_correct>Stream at 60°C using ρ = 747 kg/m³ (correct for 60°C)</example_correct>
      <impact>Volume flow calculations incorrect; equipment sizing affected; pressure drop estimates wrong</impact>
      <prevention>Always use temperature-corrected density from reference tables; interpolate between tabulated values if needed</prevention>
    </error>

    <error id="8">
      <name>Forgetting Component Balances</name>
      <description>Verifying total mass balance but not component-by-component balances</description>
      <impact>Undetected composition errors; component balances don't close; leads to invalid product specs</impact>
      <prevention>For non-reactive units: verify n_i_inlet = n_i_outlet for each component i. For reactive units: account for stoichiometric conversion.</prevention>
    </error>

    <error id="9">
      <name>Energy Balance Not Verified</name>
      <description>Calculating outlet temperatures but not confirming |Q_process| ≈ |Q_utility| for heat exchangers</description>
      <impact>Design may be thermodynamically inconsistent; unrealistic cooling/heating duties discovered too late</impact>
      <prevention>Always verify: |Q_process| ≈ |Q_utility| within ±5% for exchangers. Document calculation in stream notes.</prevention>
    </error>

    <error id="10">
      <name>Pressure Not Populated</name>
      <description>Leaving pressure as null when it should be extracted from design basis or estimated from pressure drops</description>
      <impact>Downstream agents cannot assess phase transitions; rigorous simulation cannot proceed</impact>
      <prevention>Extract inlet pressures from design basis; calculate outlet pressures from equipment pressure drop estimates (typically 0.5-1.0 barg for heat exchangers)</prevention>
    </error>

    <error id="11">
      <name>Molar Flow Not Calculated</name>
      <description>Calculating mass flow but forgetting to populate molar_flow field or calculate incorrectly</description>
      <example_wrong>mass_flow = 10,000 kg/h but molar_flow not populated (null)</example_wrong>
      <example_correct>mass_flow = 10,000 kg/h; molar_flow = 10000 / 43.865 × 1000 = 228.0 kmol/h</example_correct>
      <impact>Incomplete stream data; simulation agents may fail; mass balance verification impossible</impact>
      <prevention>Always calculate: molar_flow = mass_flow / average_MW; verify against component molar flows</prevention>
    </error>
  </common_errors_to_avoid>

  <quality_assurance_checklist>
    <item number="1">☐ All numeric property fields contain float values (not null, not strings, not "000" placeholders)</item>
    <item number="2">☐ All molar fraction values sum to 1.0 ± 0.1% for each stream</item>
    <item number="3">☐ All mass fraction values sum to 1.0 ± 0.1% for each stream</item>
    <item number="4">☐ Component values of 0.0 are explicit (not omitted) for non-present components</item>
    <item number="5">☐ Mass balance verified for each unit: sum(m_in) = sum(m_out) within ±0.1%</item>
    <item number="6">☐ Component balance verified for each unit: sum(n_i_in) = sum(n_i_out) within ±0.1%</item>
    <item number="7">☐ Energy balance verified: |Q_process| ≈ |Q_utility| within ±5% for exchangers</item>
    <item number="8">☐ Outlet temperature of Unit A = inlet temperature of Unit B for connected streams</item>
    <item number="9">☐ Outlet pressure of Unit A logically relates to inlet pressure of Unit B (drop accounted)</item>
    <item number="10">☐ Density calculated at correct stream temperature (not reference T)</item>
    <item number="11">☐ Volume flow calculated: V = m / ρ (populated, not null)</item>
    <item number="12">☐ Molar flow calculated: n = m / MW_avg (populated, not null)</item>
    <item number="13">☐ Phase designation consistent with T, P, composition (Liquid, Vapor, Two-Phase)</item>
    <item number="14">☐ Each stream notes field contains calculation method and assumptions (not blank, not "TBD")</item>
    <item number="15">☐ Equipment section left unchanged (no modifications to equipments array)</item>
    <item number="16">☐ notes_and_assumptions array populated with project-level methodology and validation summary</item>
    <item number="17">☐ All stream properties and compositions logically consistent end-to-end</item>
    <item number="18">☐ JSON structure valid (all braces matched, no trailing commas, proper quoting)</item>
  </quality_assurance_checklist>

  <critical_success_factors>
    <factor number="1">
      <name>Complete Data Population</name>
      <description>Every stream property field must have a numeric value; no placeholders, no nulls allowed</description>
      <why>Downstream agents (Equipment Sizing, Simulation, HAZOP) depend on complete, validated stream data</why>
      <how>Systematically review each stream; for any null field, either extract from design documents or calculate from unit balances</how>
    </factor>

    <factor number="2">
      <name>Balance Verification</name>
      <description>Mass, component, and energy balances must close at each unit</description>
      <why>Balances are fundamental checks on correctness; if balances don't close, design is flawed or incomplete</why>
      <how>For each unit: calculate inlet and outlet flows, verify sums match within 0.1%, document verification in stream notes</how>
    </factor>

    <factor number="3">
      <name>Consistency at Equipment Boundaries</name>
      <description>Outlet properties from one unit must logically feed as inlet to next unit</description>
      <why>Process flow must be physically and thermodynamically consistent; inconsistencies indicate calculation errors</why>
      <how>Map stream connectivity; explicitly verify T_out(Unit A) = T_in(Unit B); verify pressure drop is reasonable</how>
    </factor>

    <factor number="4">
      <name>Documentation Quality</name>
      <description>Each stream notes must explain source, method, and validation in technical language</description>
      <why>Downstream engineers must understand and trust the data; notes provide complete traceability</why>
      <how>For each stream: explain where data came from (design basis or calculated), what calculations performed, what was verified</how>
    </factor>

    <factor number="5">
      <name>Thermodynamic Property Accuracy</name>
      <description>Use temperature-corrected properties and composition-weighted averages</description>
      <why>Inaccurate properties propagate through all downstream calculations, affecting equipment sizing, cost estimation, and simulation</why>
      <how>Use reference data at correct temperatures; apply composition weighting for mixtures; document source of all properties</how>
    </factor>
  </critical_success_factors>

  <input_placeholders>
    <equipments_and_streams_template>{{equipments_and_streams_template_json}}</equipments_and_streams_template>
    <design_documents>{{design_documents_markdown_or_json}}</design_documents>
  </input_placeholders>
</agent>
"""

    human_content = f"""
# DATA FOR ANALYSIS
---
**EQUIPMENTS_STREAMS_TEMPLATE:**
{equipments_and_streams_list}

**DESIGN DOCUMENTS:**

**Design Basis (Markdown):**
{design_basis_markdown}

**Flowsheet Description (Markdown):**
{flowsheet_description_markdown}

You MUST respond only with a valid JSON object without commentary or code fences.
"""
    
    messages = [
        SystemMessagePromptTemplate.from_template(
            jinja_raw(system_content),
            template_format="jinja2",
        ),
        HumanMessagePromptTemplate.from_template(
            jinja_raw(human_content),
            template_format="jinja2",
        ),
    ]

    return ChatPromptTemplate.from_messages(messages)
