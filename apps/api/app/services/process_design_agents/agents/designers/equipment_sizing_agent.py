from __future__ import annotations

import json
from json_repair import repair_json
from typing import Dict, Any

from langchain_core.messages import AIMessage

from langchain_core.prompts import (
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    MessagesPlaceholder,
    SystemMessagePromptTemplate,
)

from dotenv import load_dotenv
from regex import FULLCASE

from apps.api.app.services.process_design_agents.agents.utils.agent_states import DesignState
from apps.api.app.services.process_design_agents.agents.utils.prompt_utils import jinja_raw
from apps.api.app.services.process_design_agents.agents.utils.equipment_stream_markdown import equipments_and_streams_dict_to_markdown
from apps.api.app.services.process_design_agents.agents.designers.tools import equipment_sizing_prompt_with_tools, run_agent_with_tools
# Import equipment sizing tools
from apps.api.app.services.process_design_agents.agents.utils.agent_sizing_tools import (
    size_air_cooler_basic,
    size_absorption_column_basic,
    size_storage_tank_basic,
    size_surge_drum_basic,
    size_blowdown_valve_basic,
    size_compressor_basic,
    size_heat_exchanger_basic,
    size_pump_basic,
    size_reactor_vessel_basic,
    size_separator_vessel_basic,
    size_vent_valve_basic,
    size_distillation_column_basic,
    size_dryer_vessel_basic,
    size_filter_vessel_basic,
    size_knockout_drum_basic,
    size_pressure_safety_valve_basic,
)

load_dotenv()


# Helper functions
def create_equipment_category_list(equipment_stream_list_str: str) -> Dict[str, Any]:
    try:
        equipment_category_list = {}
        equipment_category_set = set()  # define as set
        equipment_stream_list_dict = json.loads(equipment_stream_list_str)
        
        if "equipments" in equipment_stream_list_dict:
            # Get the equipment list from master dict
            equipment_list = equipment_stream_list_dict["equipments"]
            
            # Loop throught equipment list
            for eq in equipment_list:
                equipment_category_set.add(eq.get("category", ""))
                
            equipment_category_names = list(equipment_category_set)
            
            equipment_category_list["category_names"] = equipment_category_names
            equipment_category_list["category_ids"] = [
                {
                    "name": name,
                    "id": [eq.get("id", "") for eq in equipment_list if eq.get("category", "") == name]
                }
                for name in equipment_category_names
            ]
        else:
            print("Equipments not found")
            return None
    except Exception as e:
        print(f"Error creating category list: {e}")
        return None
    
    return equipment_category_list

def create_equipment_sizing_agent(llm, llm_provider: str = "openrouter", max_count: int = 10):
    def equipment_sizing_agent(state: DesignState) -> DesignState:
        """Equipment Sizing Agent: populates the equipment table using tool-assisted estimates."""
        print("\n# Equipment Sizing", flush=True)
        design_basis_markdown = state.get("design_basis", "")
        flowsheet_description_markdown = state.get("flowsheet_description", "")
        equipment_and_stream_results_json = state.get("equipment_and_stream_results", "{}")
        equipment_and_stream_results_dict = json.loads(repair_json(equipment_and_stream_results_json))
        
        if "equipments" not in equipment_and_stream_results_dict or "streams" not in equipment_and_stream_results_dict:
            print("FAILED: Incorrect format of Equipment and Stream Template", flush=True)
            exit(-1)
            
        # Create tools list to be called by agent
        tools_list = [
            size_air_cooler_basic,
            size_absorption_column_basic,
            size_storage_tank_basic,
            size_surge_drum_basic,
            size_blowdown_valve_basic,
            size_compressor_basic,
            size_heat_exchanger_basic,
            size_pump_basic,
            size_reactor_vessel_basic,
            size_separator_vessel_basic,
            size_vent_valve_basic,
            size_distillation_column_basic,
            size_dryer_vessel_basic,
            size_filter_vessel_basic,
            size_knockout_drum_basic,
            size_pressure_safety_valve_basic,
        ]
        
        # Create equipment category list from equipment_and_stream_list_template
        equipment_category_list = create_equipment_category_list(equipment_and_stream_results_json)
        
        # Print the equipment category list in the temeplate
        if "category_names" in equipment_category_list:
            print(equipment_category_list["category_names"])
            for ids in equipment_category_list["category_ids"]:
                print(f"{ids['name']} -> {', '.join(ids['id'])}")
        else:
            print("No category names found in the list.")
        
        # Create system and human messages
        _, system_message, human_message = equipment_sizing_prompt_with_tools(
            design_basis=design_basis_markdown,
            flowsheet_description=flowsheet_description_markdown,
            equipment_and_stream_results=equipment_and_stream_results_json,
        )
        
        llm.temperature = 0.3
        
        is_done = False
        try_count = 0
        while not is_done:
            try_count += 1
            if try_count > max_count:
                print("DEBUG: Max try count reached. Exiting...")
                exit(-1)
            try:
                # Test new run_agent_with_tools
                print(f"DEBUG: Attempt {try_count} ---")
                ai_messages = run_agent_with_tools(
                    llm_model=llm,
                    system_prompt=system_message,
                    human_prompt=human_message,
                    tools_list=tools_list,
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
                    equipment_list_dict = json.loads(repair_json(output_str))
                    if "equipments" not in equipment_list_dict:
                        print("FAILED: Incorrect format of Equipment List", flush=True)
                        print(output_str)
                        continue
                    
                    print("DEBUG: Convert dict is successful.")
                    equipment_stream_final_dict = {
                        "equipments": equipment_list_dict["equipments"],
                        "streams": equipment_and_stream_results_dict["streams"],
                        }
                    _, equipments_md, _ = equipments_and_streams_dict_to_markdown(equipment_stream_final_dict)
                    print("DEBUG: ** Equipent List **")
                    print(equipments_md)
                    
                    return {
                        "equipment_list_results": json.dumps(equipment_list_dict),
                        "equipment_and_stream_results": json.dumps(equipment_stream_final_dict),
                        "messages": ai_messages,
                    }
                except Exception as e:
                    print(f"DEBUG: Attemp {try_count} has failed. Error: {e}")
                    print(ai_messages)
            except:
                continue
    return equipment_sizing_agent


def equipment_sizing_prompt(
    design_basis_markdown: str,
    flowsheet_description_markdown: str,
    equipment_and_stream_results_json: str,
) -> ChatPromptTemplate:
    system_content = f"""
<?xml version="1.0" encoding="UTF-8"?>
<agent>
  <metadata>
    <role>Lead Equipment Sizing Engineer</role>
    <specialization>First-pass sizing calculations for conceptual process designs</specialization>
    <function>Provide quantitative estimates for major equipment transitioning from conceptual to preliminary engineering</function>
    <deliverable>Sized equipment parameters enabling cost estimation, detailed design, and risk assessment</deliverable>
    <project_phase>Conceptual to Preliminary Engineering transition</project_phase>
  </metadata>

  <context>
    <inputs>
      <input>
        <n>EQUIPMENTS_AND_STREAMS_LIST</n>
        <format>JSON</format>
        <description>Complete equipment and stream list with populated properties and preliminary sizing placeholders</description>
        <contains>
          <item>Equipment definitions with inlet/outlet streams and design criteria</item>
          <item>Stream properties (flows, temperatures, pressures, compositions)</item>
          <item>Sizing parameters structure with placeholder values</item>
        </contains>
      </input>
      <input>
        <n>DESIGN BASIS</n>
        <format>Markdown or text</format>
        <description>Comprehensive design basis including capacity targets, operating conditions, constraints</description>
        <contains>
          <item>Design capacity and throughput requirements</item>
          <item>Operating pressure and temperature ranges</item>
          <item>Thermodynamic properties and fluid characteristics</item>
          <item>Utility availability and constraints</item>
          <item>Design codes and standards applicable</item>
        </contains>
      </input>
      <input>
        <n>BASIC PROCESS FLOW DIAGRAM</n>
        <format>Markdown or visual description</format>
        <description>Process flowsheet showing unit operations and connectivity</description>
        <contains>
          <item>Major equipment arrangement and sequence</item>
          <item>Stream connectivity and flow paths</item>
          <item>Utility stream interactions</item>
          <item>Recycle and bypass configurations</item>
        </contains>
      </input>
    </inputs>
    <sizing_scope>
      <item>All major process equipment (pumps, heat exchangers, vessels, columns, reactors, compressors)</item>
      <item>Critical design parameters driving mechanical design and cost estimation</item>
      <item>Performance parameters enabling downstream detailed simulation</item>
    </sizing_scope>
    <output_purpose>Enable cost estimation, procurement, detailed design, and risk assessment in preliminary engineering phase</output_purpose>
    <downstream_users>
      <user>Cost estimators for equipment procurement and installation</user>
      <user>Detailed design engineers for mechanical and process design</user>
      <user>Project managers for schedule and resource planning</user>
      <user>Safety and risk assessment teams</user>
      <user>Vendors and equipment manufacturers</user>
    </downstream_users>
  </context>

  <instructions>
    <instruction id="1">
      <title>Analyze Inputs Comprehensively</title>
      <details>
        - Review the complete EQUIPMENTS_AND_STREAMS_LIST to identify all equipment items and their stream connections
        - Extract detailed stream properties (flows, temperatures, pressures, compositions, densities)
        - Study the DESIGN_BASIS to understand:
          * Overall process objectives and throughput targets
          * Operating pressure and temperature envelopes
          * Thermodynamic property data (Cp, density, viscosity, surface tension)
          * Design margins and safety factors
          * Applicable design codes and standards
        - Review the PROCESS FLOW DIAGRAM to understand:
          * Equipment arrangement and sequence
          * Feed/product routing
          * Utility stream interactions
          * Recycle and bypass paths
        - Compile all available data and identify any gaps or assumptions needed
      </details>
    </instruction>

    <instruction id="2">
      <title>Select Appropriate Sizing Methods</title>
      <details>
        - For HEAT EXCHANGERS:
          * Calculate heat duty Q = m × Cp × ΔT
          * Determine log-mean temperature difference (LMTD) based on configuration
          * Estimate overall heat transfer coefficient U based on service (liquids, vapors, condensation, etc.)
          * Calculate required area A = Q / (U × LMTD)
          * Select standard tube sizes and shell diameter
          * Estimate pressure drops on shell and tube sides
          * Document method used (LMTD, effectiveness-NTU, or other)
        
        - For PUMPS:
          * Extract flow rate and calculate required head (pressure rise)
          * Account for static head, friction losses, and acceleration head
          * Calculate hydraulic power = Q × ΔP / efficiency
          * Select pump type (centrifugal, positive displacement) based on duty
          * Estimate motor power with efficiency assumption
          * Account for NPSH requirements and suction conditions
          * Document efficiency assumptions and sizing margins
        
        - For PRESSURIZED VESSELS (tanks, reactors, separators):
          * Calculate required volume based on:
            - Batch hold-up time or residence time
            - Surge/buffer capacity
            - Safety clearances and vapor space
          * Determine L/D ratio based on vessel type and application
          * Calculate shell diameter and height
          * Estimate wall thickness based on pressure, material, code (ASME Section VIII Div 1, etc.)
          * Account for internals (baffles, trays, agitators)
          * Document design pressure, design temperature, and material selection
        
        - For DISTILLATION/ABSORPTION COLUMNS:
          * Calculate column diameter from vapor velocity (flood point or design capacity)
          * Estimate number of theoretical stages from composition targets
          * Calculate actual trays accounting for tray efficiency
          * Estimate reflux ratio and boil-up rate
          * Calculate pressure drop and liquid residence time
          * Select tray type (sieve, valve) or packing type
          * Document design basis and correlation sources
        
        - For REACTORS (stirred, fixed bed, fluidized):
          * Calculate required volume for residence time or conversion
          * Determine heat duty if reaction is exo/endothermic
          * Size agitator for mixing duty and power input
          * Calculate cooling/heating surface area if needed
          * Account for catalyst volume (if applicable)
          * Document reaction kinetics assumptions and conversion basis
        
        - For COMPRESSORS:
          * Calculate volume flow at inlet conditions
          * Determine compression ratio and outlet pressure
          * Estimate polytropic or isentropic efficiency
          * Calculate power requirement
          * Select number of stages based on compression ratio
          * Account for intercooling if multi-stage
          * Document type (centrifugal, reciprocating, screw) and efficiency assumptions
      </details>
    </instruction>

    <instruction id="3">
      <title>Perform All Sizing Calculations</title>
      <details>
        - Work through each equipment item in logical order (main process first, utilities second)
        - For each equipment, calculate all key sizing parameters identified in the sizing_parameters array
        - Use stream data (flows, temperatures, pressures, compositions) as inputs
        - Apply thermodynamic property correlations or reference data for Cp, density, viscosity, etc.
        - Apply appropriate design codes and standards (ASME, API, TEMA for heat exchangers, etc.)
        - Include design margins and safety factors (typically 10-20% on duty, 25% on power, etc.)
        - Show work in notes: state calculation method, key assumptions, source correlations
        - Verify calculations for reasonableness and consistency
      </details>
    </instruction>

    <instruction id="4">
      <title>Populate Sizing Parameters</title>
      <details>
        - For each equipment item, populate all sizing_parameters entries with calculated numeric values
        - Ensure all values include appropriate units
        - Use standard units consistently:
          * Heat duty: kW or MW
          * Area: m²
          * Power: kW
          * Volume: m³
          * Diameter: mm or m
          * Height/Length: mm or m
          * Pressure drop: kPa or bar
          * Efficiency: % or decimal (0-1)
        - Round values appropriately (typically 3-4 significant figures)
        - For parameters that cannot be reasonably estimated, use null
        - Ensure no placeholder text remains (no "000" format)
      </details>
    </instruction>

    <instruction id="5">
      <title>Document Methods and Assumptions</title>
      <details>
        - In the "notes" field for each equipment item, concisely document:
          * Calculation method used (e.g., "LMTD method," "Kern correlation," "Shah method")
          * All key assumptions (e.g., "U value assumed at 450 W/m²-K," "Efficiency at 75%")
          * Design margins applied (e.g., "+10% on duty," "+20% on power")
          * Standard references or correlations applied (ASME, API, Perry's, etc.)
          * Any deviations from standard practice or unusual design drivers
          * Critical sensitivities or parameters requiring validation in detailed design
        - Keep notes concise but complete enough for hand-off to detailed design engineers
      </details>
    </instruction>

    <instruction id="6">
      <title>Update Metadata with Global Assumptions</title>
      <details>
        - Add a "metadata" section to the JSON root if not present
        - Include "assumptions" array documenting project-wide design assumptions:
          * Design codes and standards applied
          * Efficiency assumptions for all rotating equipment
          * Safety and design margin philosophy
          * Thermodynamic property source(s)
          * Any simplified modeling assumptions (e.g., isothermal operation, no fouling)
          * Critical design constraints or bottlenecks
        - Document any deviations from standard practice
        - List any items flagged as requiring detailed FEED phase validation
      </details>
    </instruction>

    <instruction id="7">
      <title>Preserve Stream Section</title>
      <details>
        - Do NOT modify the "streams" section of the input template
        - Stream properties have already been reconciled and validated
        - Only update sizing_parameters within the "equipments" section
        - Ensure equipment inlet/outlet stream references match stream IDs in streams section
      </details>
    </instruction>

    <instruction id="8">
      <title>Validate Completeness and Consistency</title>
      <details>
        - Verify that every sizing_parameter placeholder has been replaced with a numeric value or null
        - Cross-check equipment sizing with stream properties for consistency
        - Verify energy balances: utility duties should match process requirements
        - Confirm that equipment selection is appropriate for the service (phase, material compatibility, etc.)
        - Check that design codes and pressure ratings are consistent with operating conditions
        - Flag any conflicts or assumptions requiring resolution in detailed design
        - Provide summary validation notes in metadata
      </details>
    </instruction>

    <instruction id="9">
      <title>Output Discipline</title>
      <details>
        - Return a single valid JSON object matching the schema structure
        - Use only double quotes (no single quotes)
        - Ensure all numeric values are properly typed (float for numbers, null for missing data)
        - Do NOT include code fences, backticks, or Markdown formatting
        - Do NOT include explanatory prose, comments, or narrative text outside JSON structure
        - Do NOT add new equipment IDs or stream IDs beyond those in the input template
      </details>
    </instruction>
  </instructions>

  <output_schema>
    <root_object>
      <key name="metadata">
        <type>object</type>
        <description>Project-level sizing metadata and global assumptions</description>
        <fields>
          <field name="sizing_date">
            <type>string</type>
            <description>Date of sizing calculations (YYYY-MM-DD format)</description>
          </field>
          <field name="design_phase">
            <type>string</type>
            <constant>Preliminary Engineering</constant>
          </field>
          <field name="design_codes">
            <type>array of strings</type>
            <description>List of design codes and standards applied</description>
            <examples>
              <example>ASME Section VIII Division 1 (Pressure vessels)</example>
              <example>TEMA (Heat exchangers)</example>
              <example>API 610 (Centrifugal pumps)</example>
              <example>ISO 2858 (Vertical turbine pumps)</example>
            </examples>
          </field>
          <field name="assumptions">
            <type>array of strings</type>
            <description>Critical design assumptions and philosophy</description>
          </field>
          <field name="design_margins">
            <type>object</type>
            <description>Standard design margins applied across all equipment</description>
            <subfields>
              <subfield name="duty_margin">
                <type>float</type>
                <description>Percentage margin on thermal/power duties (e.g., 0.10 for 10%)</description>
              </subfield>
              <subfield name="power_margin">
                <type>float</type>
                <description>Percentage margin on mechanical power (e.g., 0.20 for 20%)</description>
              </subfield>
              <subfield name="pressure_margin">
                <type>float</type>
                <description>Percentage margin on design pressure (e.g., 0.10 for 10%)</description>
              </subfield>
            </subfields>
          </field>
        </fields>
      </key>

      <key name="equipments">
        <type>array</type>
        <item_type>object</item_type>
        <description>All major equipment with calculated sizing parameters</description>
        
        <equipment_object>
          <required_fields>
            <field name="id">
              <type>string</type>
              <instruction>Preserve from input template</instruction>
            </field>
            <field name="name">
              <type>string</type>
              <instruction>Preserve from input template</instruction>
            </field>
            <field name="service">
              <type>string</type>
              <instruction>Preserve from input template</instruction>
            </field>
            <field name="type">
              <type>string</type>
              <instruction>Preserve from input template</instruction>
            </field>
            <field name="category">
              <type>string</type>
              <instruction>Preserve from input template</instruction>
            </field>
            <field name="streams_in">
              <type>array of strings</type>
              <instruction>Preserve from input template</instruction>
            </field>
            <field name="streams_out">
              <type>array of strings</type>
              <instruction>Preserve from input template</instruction>
            </field>
            <field name="design_criteria">
              <type>string</type>
              <instruction>Preserve from input template</instruction>
            </field>

            <field name="sizing_parameters">
              <type>array of objects</type>
              <description>Calculated sizing parameters for this equipment</description>
              <populate_strategy>
                <guideline>Replace all placeholder values with calculated numeric estimates</guideline>
                <guideline>Each parameter object must have: name, quantity (with value and unit)</guideline>
                <guideline>All values must be float type or null if not applicable</guideline>
                <guideline>Include design margins in the calculated values</guideline>
                <guideline>No "000" or placeholder text allowed in final output</guideline>
              </populate_strategy>

              <sizing_parameters_by_equipment_type>
                <equipment_type name="Heat Exchanger">
                  <parameter name="duty">
                    <unit>kW</unit>
                    <description>Heat transfer duty (Q = m × Cp × ΔT)</description>
                  </parameter>
                  <parameter name="lmtd">
                    <unit>°C</unit>
                    <description>Log-mean temperature difference</description>
                  </parameter>
                  <parameter name="area">
                    <unit>m²</unit>
                    <description>Required heat transfer area</description>
                  </parameter>
                  <parameter name="u_value">
                    <unit>W/m²-K</unit>
                    <description>Overall heat transfer coefficient</description>
                  </parameter>
                  <parameter name="pressure_drop_shell">
                    <unit>kPa</unit>
                    <description>Shell side pressure drop</description>
                  </parameter>
                  <parameter name="pressure_drop_tube">
                    <unit>kPa</unit>
                    <description>Tube side pressure drop</description>
                  </parameter>
                  <parameter name="shell_diameter">
                    <unit>mm</unit>
                    <description>Shell diameter based on TEMA standard</description>
                  </parameter>
                </equipment_type>

                <equipment_type name="Pump">
                  <parameter name="flow_rate">
                    <unit>m³/h</unit>
                    <description>Volumetric flow at inlet conditions</description>
                  </parameter>
                  <parameter name="head">
                    <unit>m</unit>
                    <description>Total dynamic head required</description>
                  </parameter>
                  <parameter name="discharge_pressure">
                    <unit>barg</unit>
                    <description>Discharge pressure</description>
                  </parameter>
                  <parameter name="hydraulic_power">
                    <unit>kW</unit>
                    <description>Hydraulic power = Q × ΔP / efficiency</description>
                  </parameter>
                  <parameter name="motor_power">
                    <unit>kW</unit>
                    <description>Electric motor power (including efficiency margin)</description>
                  </parameter>
                  <parameter name="pump_efficiency">
                    <unit>%</unit>
                    <description>Pump isentropic or volumetric efficiency</description>
                  </parameter>
                  <parameter name="npsh_required">
                    <unit>m</unit>
                    <description>Net positive suction head required</description>
                  </parameter>
                  <parameter name="pump_type">
                    <unit>string</unit>
                    <description>Pump category (Centrifugal, Positive Displacement, etc.)</description>
                  </parameter>
                </equipment_type>

                <equipment_type name="Vessel">
                  <parameter name="volume">
                    <unit>m³</unit>
                    <description>Usable volume based on residence time or hold-up</description>
                  </parameter>
                  <parameter name="diameter">
                    <unit>mm</unit>
                    <description>Vessel shell diameter</description>
                  </parameter>
                  <parameter name="height">
                    <unit>mm</unit>
                    <description>Overall vessel height including head clearance</description>
                  </parameter>
                  <parameter name="l_d_ratio">
                    <unit>dimensionless</unit>
                    <description>Length-to-diameter ratio</description>
                  </parameter>
                  <parameter name="wall_thickness">
                    <unit>mm</unit>
                    <description>Shell wall thickness (design pressure basis)</description>
                  </parameter>
                  <parameter name="design_pressure">
                    <unit>barg</unit>
                    <description>Design pressure (internal + margin)</description>
                  </parameter>
                  <parameter name="design_temperature">
                    <unit>°C</unit>
                    <description>Design temperature</description>
                  </parameter>
                  <parameter name="material">
                    <unit>string</unit>
                    <description>Shell material (Carbon Steel, Stainless Steel, etc.)</description>
                  </parameter>
                </equipment_type>

                <equipment_type name="Distillation Column">
                  <parameter name="diameter">
                    <unit>mm</unit>
                    <description>Column internal diameter</description>
                  </parameter>
                  <parameter name="theoretical_stages">
                    <unit>count</unit>
                    <description>Minimum number of theoretical stages (Fenske equation)</description>
                  </parameter>
                  <parameter name="actual_trays">
                    <unit>count</unit>
                    <description>Actual trays accounting for efficiency</description>
                  </parameter>
                  <parameter name="column_height">
                    <unit>m</unit>
                    <description>Total packed or tray height</description>
                  </parameter>
                  <parameter name="tray_efficiency">
                    <unit>%</unit>
                    <description>Murphree or point efficiency</description>
                  </parameter>
                  <parameter name="reflux_ratio">
                    <unit>dimensionless</unit>
                    <description>Operating reflux to minimum reflux</description>
                  </parameter>
                  <parameter name="pressure_drop">
                    <unit>kPa</unit>
                    <description>Column pressure drop</description>
                  </parameter>
                  <parameter name="reboiler_duty">
                    <unit>kW</unit>
                    <description>Reboiler heat duty</description>
                  </parameter>
                  <parameter name="condenser_duty">
                    <unit>kW</unit>
                    <description>Condenser heat duty</description>
                  </parameter>
                </equipment_type>

                <equipment_type name="Reactor">
                  <parameter name="volume">
                    <unit>m³</unit>
                    <description>Reactor volume for required residence time</description>
                  </parameter>
                  <parameter name="residence_time">
                    <unit>min</unit>
                    <description>Average residence time at design flow</description>
                  </parameter>
                  <parameter name="diameter">
                    <unit>mm</unit>
                    <description>Reactor shell diameter</description>
                  </parameter>
                  <parameter name="height">
                    <unit>mm</unit>
                    <description>Reactor height</description>
                  </parameter>
                  <parameter name="heat_duty">
                    <unit>kW</unit>
                    <description>Cooling or heating duty (if exo/endothermic)</description>
                  </parameter>
                  <parameter name="agitator_power">
                    <unit>kW</unit>
                    <description>Agitator motor power for mixing</description>
                  </parameter>
                  <parameter name="conversion">
                    <unit>%</unit>
                    <description>Expected conversion at design conditions</description>
                  </parameter>
                  <parameter name="design_pressure">
                    <unit>barg</unit>
                    <description>Design pressure rating</description>
                  </parameter>
                </equipment_type>

                <equipment_type name="Compressor">
                  <parameter name="inlet_flow">
                    <unit>m³/min</unit>
                    <description>Volumetric flow at inlet conditions</description>
                  </parameter>
                  <parameter name="compression_ratio">
                    <unit>dimensionless</unit>
                    <description>Outlet pressure / inlet pressure (absolute)</description>
                  </parameter>
                  <parameter name="discharge_pressure">
                    <unit>barg</unit>
                    <description>Compressor discharge pressure</description>
                  </parameter>
                  <parameter name="power">
                    <unit>kW</unit>
                    <description>Polytropic or isentropic power requirement</description>
                  </parameter>
                  <parameter name="motor_power">
                    <unit>kW</unit>
                    <description>Electric motor power (including efficiency margin)</description>
                  </parameter>
                  <parameter name="efficiency">
                    <unit>%</unit>
                    <description>Polytropic or isentropic efficiency</description>
                  </parameter>
                  <parameter name="number_of_stages">
                    <unit>count</unit>
                    <description>Number of compression stages</description>
                  </parameter>
                  <parameter name="compressor_type">
                    <unit>string</unit>
                    <description>Compressor type (Centrifugal, Reciprocating, Screw, etc.)</description>
                  </parameter>
                </equipment_type>
              </sizing_parameters_by_equipment_type>
            </field>

            <field name="notes">
              <type>string</type>
              <description>Sizing calculation method, key assumptions, and design drivers</description>
              <populate_guidance>
                <item>State the calculation method used (e.g., "LMTD method per TEMA," "Kern correlation")</item>
                <item>Document all key assumptions with values (e.g., "U-value assumed 450 W/m²-K based on ethanol-water service")</item>
                <item>List design margins applied (e.g., "+10% on duty," "+20% on motor power")</item>
                <item>Reference design codes or standards (e.g., "ASME Section VIII Div 1," "API 610")</item>
                <item>Note any deviations from standard practice or unusual design drivers</item>
                <item>Flag critical sensitivities or assumptions requiring detailed design validation</item>
                <item>Keep notes concise but sufficient for design engineer hand-off</item>
              </populate_guidance>
            </field>
          </required_fields>
        </equipment_object>
      </key>

      <key name="streams">
        <type>array</type>
        <description>Stream list—DO NOT MODIFY from input</description>
        <instruction>Preserve exactly as provided in input template. No changes to be made.</instruction>
      </key>

      <key name="validation_summary">
        <type>object</type>
        <description>Summary of sizing validation and critical notes</description>
        <fields>
          <field name="total_equipment">
            <type>integer</type>
            <description>Total number of equipment items sized</description>
          </field>
          <field name="energy_balance">
            <type>string</type>
            <description>Overall energy balance summary (e.g., "Total cooling duty: 1200 kW; total heating duty: 800 kW")</description>
          </field>
          <field name="cost_drivers">
            <type>array of strings</type>
            <description>Critical cost drivers or bottlenecks identified</description>
          </field>
          <field name="items_requiring_detailed_design">
            <type>array of strings</type>
            <description>Equipment or parameters flagged for detailed FEED phase validation</description>
          </field>
        </fields>
      </key>
    </root_object>

    <json_formatting_rules>
      <rule>Use only double quotes (no single quotes)</rule>
      <rule>All numeric values must be float type (e.g., 120.5, not 120 or "120")</rule>
      <rule>Use null for missing or not-applicable data (not "null" string or "TBD")</rule>
      <rule>No trailing commas in arrays or objects</rule>
      <rule>All arrays and objects must be properly closed</rule>
      <rule>No comments or explanatory text inside JSON</rule>
      <rule>No code fences or Markdown formatting</rule>
      <rule>UTF-8 safe characters only</rule>
    </json_formatting_rules>
  </output_schema>

  <sizing_correlations_and_references>
    <description>Common sizing correlations and reference data for equipment calculation</description>
    
    <heat_exchanger_references>
      <method name="LMTD Method">
        <formula>Q = U × A × LMTD</formula>
        <where>
          <item>Q = heat duty (kW)</item>
          <item>U = overall heat transfer coefficient (W/m²-K)</item>
          <item>A = heat transfer area (m²)</item>
          <item>LMTD = log-mean temperature difference (°C)</item>
        </where>
      </method>

      <u_value_guidelines>
        <service value="Water-to-water">U = 1500-3000 W/m²-K</service>
        <service value="Water-to-oil">U = 300-900 W/m²-K</service>
        <service value="Ethanol-to-water">U = 400-600 W/m²-K</service>
        <service value="Vapor-to-water condensation">U = 1000-2000 W/m²-K</service>
        <service value="Steam heating">U = 2000-5000 W/m²-K</service>
      </u_value_guidelines>

      <pressure_drop_correlation>
        <method>Kern method for shell and tube</method>
        <reference>Chemical Engineering Handbook (Perry)</reference>
      </pressure_drop_correlation>
    </heat_exchanger_references>

    <pump_sizing_references>
      <method name="Pump Head Calculation">
        <formula>H_total = H_static + H_friction + H_velocity + H_acceleration</formula>
        <typical_efficiencies>
          <efficiency type="Centrifugal pump">0.70-0.85</efficiency>
          <efficiency type="Positive displacement pump">0.80-0.95</efficiency>
        </typical_efficiencies>
      </method>

      <npsh_guidance>
        <item>Calculate NPSH available from system</item>
        <item>Compare with pump manufacturer NPSH required</item>
        <item>Maintain 0.5-1.0 m margin above required NPSH</item>
      </npsh_guidance>
    </pump_sizing_references>

    <vessel_sizing_references>
      <residence_time_guidelines>
        <service type="Storage tank">30-60 minutes</service>
        <service type="Buffer tank">5-15 minutes</service>
        <service type="Separation vessel">10-30 minutes</service>
        <service type="Knockout drum">2-5 minutes</service>
      </residence_time_guidelines>

      <design_pressure_guidance>
        <guideline>Design pressure = Operating pressure + 10-20% safety margin</guideline>
        <guideline>Minimum design pressure 0.5 barg for ambient temperature vessels</guideline>
        <guideline>Account for pressure relief valve setting + 10%</guideline>
      </design_pressure_guidance>

      <material_selection>
        <service type="General liquid">Carbon Steel (ASTM A36)</service>
        <service type="Corrosive service">Stainless Steel 304 or 316</service>
        <service type="High temperature">Carbon Steel with creep allowance or alloy steel</service>
      </material_selection>
    </vessel_sizing_references>

    <column_sizing_references>
      <flooding_velocity>
        <guidance>Design at 70-80% of flood point for trayed columns</guidance>
        <guidance>Design at 50-70% of flood point for packed columns</guidance>
      </flooding_velocity>

      <tray_efficiency_guidelines>
        <type>Sieve trays</type>
        <efficiency>65-85%</efficiency>
      </tray_efficiency_guidelines>

      <shortcut_method>
        <method>Fenske equation for minimum theoretical stages</method>
        <method>Underwood equation for minimum reflux ratio</method>
        <method>Gilliland correlation for actual stages</method>
      </shortcut_method>
    </column_sizing_references>

    <compressor_sizing_references>
      <polytropic_efficiency>
        <type>Centrifugal compressor</type>
        <efficiency>75-85%</efficiency>
      </polytropic_efficiency>

      <compression_ratio_guidelines>
        <stage type="Single stage">Up to 3-4</stage_type>
        <stage type="Two stage">Up to 8-10 with intercooling</stage_type>
        <stage type="Three+ stages">Higher ratios with intercooling</stage_type>
      </compression_ratio_guidelines>
    </compressor_sizing_references>
  </sizing_correlations_and_references>

  <example>
    <design_documents>
      <doc>A shell-and-tube heat exchanger (E-101) cools 10,000 kg/h of 95 mol% ethanol from 80°C to 40°C. Plant cooling water is used, entering at 25°C and returning at 35°C. Assume Cp of ethanol = 2.44 kJ/kg-K and water = 4.18 kJ/kg-K, density of ethanol ≈ 765 kg/m³ at 60°C.</doc>
    </design_documents>

    <expected_json_output>{{
  "metadata": {{
    "sizing_date": "2025-10-24",
    "design_phase": "Preliminary Engineering",
    "design_codes": [
      "ASME Section VIII Division 1 (Pressure vessels)",
      "TEMA (Heat exchangers)",
      "API 610 (Centrifugal pumps)"
    ],
    "assumptions": [
      "U-value for ethanol-water cooling service estimated at 450 W/m²-K based on TEMA guidelines",
      "Ethanol specific heat assumed constant at 2.44 kJ/kg-K over 40-80°C range",
      "Water specific heat assumed constant at 4.18 kJ/kg-K",
      "Ethanol density estimated at 765 kg/m³ average between 40-80°C",
      "Heat exchanger pressure drop estimated using Kern method, shell-side 20 kPa, tube-side 30 kPa",
      "Design pressure margin: +10% on operating pressure",
      "Motor efficiency for pumps assumed at 90%"
    ],
    "design_margins": {{
      "duty_margin": 0.10,
      "power_margin": 0.20,
      "pressure_margin": 0.10
    }}
  }},
  "equipments": [
    {{
      "id": "E-101",
      "name": "Ethanol Cooler",
      "service": "Reduce hot ethanol temperature prior to storage",
      "type": "Shell-and-tube exchanger",
      "category": "Heat Exchanger",
      "streams_in": ["1001", "2001"],
      "streams_out": ["1002", "2002"],
      "design_criteria": "&lt;0.27 MW&gt;",
      "sizing_parameters": [
        {{
          "name": "duty",
          "quantity": {{
            "value": 272.0,
            "unit": "kW"
          }}
        }},
        {{
          "name": "lmtd",
          "quantity": {{
            "value": 39.83,
            "unit": "°C"
          }}
        }},
        {{
          "name": "u_value",
          "quantity": {{
            "value": 450.0,
            "unit": "W/m²-K"
          }}
        }},
        {{
          "name": "area",
          "quantity": {{
            "value": 150.8,
            "unit": "m²"
          }}
        }},
        {{
          "name": "pressure_drop_shell",
          "quantity": {{
            "value": 22.0,
            "unit": "kPa"
          }}
        }},
        {{
          "name": "pressure_drop_tube",
          "quantity": {{
            "value": 32.0,
            "unit": "kPa"
          }}
        }},
        {{
          "name": "shell_diameter",
          "quantity": {{
            "value": 1219.0,
            "unit": "mm"
          }}
        }}
      ],
      "notes": "Sizing per LMTD method. Duty = 10000 kg/h × 2.44 kJ/kg-K × (80-40)°C = 272 kW. LMTD calculated using counter-current correction factor F = 0.95 for shell-and-tube 1-2 configuration. Counter-current LMTD = [(80-35)-(40-25)]/ln(45/15) = 39.83°C. Area = 272 kW / (450 W/m²-K × 0.03983 K) = 150.8 m². U-value based on ethanol-water service. Pressure drops from Kern method. Shell diameter selected as 1219 mm (48 in) per TEMA standard. Design includes +10% duty margin. Recommend detailed FEED phase verification of U-value and pressure drops."
    }},
    {{
      "id": "P-101",
      "name": "Product Transfer Pump",
      "service": "Transfer cooled ethanol from exchanger to storage",
      "type": "Centrifugal pump",
      "category": "Pump",
      "streams_in": ["1002"],
      "streams_out": ["1003"],
      "design_criteria": "&lt;10,000 kg/h&gt;",
      "sizing_parameters": [
        {{
          "name": "flow_rate",
          "quantity": {{
            "value": 13.07,
            "unit": "m³/h"
          }}
        }},
        {{
          "name": "head",
          "quantity": {{
            "value": 25.0,
            "unit": "m"
          }}
        }},
        {{
          "name": "discharge_pressure",
          "quantity": {{
            "value": 2.45,
            "unit": "barg"
          }}
        }},
        {{
          "name": "hydraulic_power",
          "quantity": {{
            "value": 8.95,
            "unit": "kW"
          }}
        }},
        {{
          "name": "pump_efficiency",
          "quantity": {{
            "value": 75.0,
            "unit": "%"
          }}
        }},
        {{
          "name": "motor_power",
          "quantity": {{
            "value": 15.0,
            "unit": "kW"
          }}
        }},
        {{
          "name": "npsh_required",
          "quantity": {{
            "value": 1.2,
            "unit": "m"
          }}
        }},
        {{
          "name": "pump_type",
          "quantity": {{
            "value": "Centrifugal pump",
            "unit": "string"
          }}
        }}
      ],
      "notes": "Flow rate = 10000 kg/h / 765 kg/m³ = 13.07 m³/h at 60°C average. Head requirement includes static head to storage tank (estimated 20 m) plus friction losses in 2-inch pipe (estimated 5 m) = 25 m total. Discharge pressure = 1.0 barg inlet + (25 m × 0.981 kPa/m / 100) = 2.45 barg. Hydraulic power = 13.07 m³/h × 245 kPa / 3600 / 0.75 efficiency = 8.95 kW. Motor power with 20% margin = 8.95 × 1.20 / 0.90 motor efficiency = 15.0 kW. NPSH required typical for centrifugal pump at this duty. Design includes +20% motor power margin per API 610. Recommend duty/standby configuration for reliability."
    }}
  ],
  "streams": [
    {{
      "id": "1001",
      "name": "Hot Ethanol Feed",
      "description": "Feed entering exchanger E-101 shell side",
      "from": "Upstream Blender",
      "to": "E-101",
      "phase": "Liquid",
      "properties": {{
        "mass_flow": {{
          "value": 10000.0,
          "unit": "kg/h"
        }},
        "temperature": {{
          "value": 80.0,
          "unit": "°C"
        }},
        "pressure": {{
          "value": 1.7,
          "unit": "barg"
        }}
      }},
      "compositions": {{
        "Ethanol (C2H6O)": {{
          "value": 0.95,
          "unit": "molar fraction"
        }},
        "Water (H2O)": {{
          "value": 0.05,
          "unit": "molar fraction"
        }}
      }},
      "notes": "Tie-in from upstream blender."
    }},
    {{
      "id": "1002",
      "name": "Cooled Ethanol",
      "description": "Product exiting exchanger E-101 shell side",
      "from": "E-101",
      "to": "P-101",
      "phase": "Liquid",
      "properties": {{
        "mass_flow": {{
          "value": 10000.0,
          "unit": "kg/h"
        }},
        "temperature": {{
          "value": 40.0,
          "unit": "°C"
        }},
        "pressure": {{
          "value": 1.0,
          "unit": "barg"
        }}
      }},
      "compositions": {{
        "Ethanol (C2H6O)": {{
          "value": 0.95,
          "unit": "molar fraction"
        }},
        "Water (H2O)": {{
          "value": 0.05,
          "unit": "molar fraction"
        }}
      }},
      "notes": "Product stream to pump."
    }},
    {{
      "id": "1003",
      "name": "Product Transfer",
      "description": "Pumped ethanol to storage tank",
      "from": "P-101",
      "to": "Storage Tank T-201",
      "phase": "Liquid",
      "properties": {{
        "mass_flow": {{
          "value": 10000.0,
          "unit": "kg/h"
        }},
        "temperature": {{
          "value": 40.0,
          "unit": "°C"
        }},
        "pressure": {{
          "value": 2.45,
          "unit": "barg"
        }}
      }},
      "compositions": {{
        "Ethanol (C2H6O)": {{
          "value": 0.95,
          "unit": "molar fraction"
        }},
        "Water (H2O)": {{
          "value": 0.05,
          "unit": "molar fraction"
        }}
      }},
      "notes": "Connection to existing atmospheric storage tank T-201."
    }},
    {{
      "id": "2001",
      "name": "Cooling Water Supply",
      "description": "Utility cooling water to exchanger E-101 tube side",
      "from": "Cooling Water Header",
      "to": "E-101",
      "phase": "Liquid",
      "properties": {{
        "mass_flow": {{
          "value": 24085.0,
          "unit": "kg/h"
        }},
        "temperature": {{
          "value": 25.0,
          "unit": "°C"
        }},
        "pressure": {{
          "value": 2.5,
          "unit": "barg"
        }}
      }},
      "compositions": {{
        "Water (H2O)": {{
          "value": 1.0,
          "unit": "molar fraction"
        }}
      }},
      "notes": "Standard plant cooling water utility."
    }},
    {{
      "id": "2002",
      "name": "Cooling Water Return",
      "description": "Warmed utility cooling water from exchanger E-101 tube side",
      "from": "E-101",
      "to": "Cooling Water Return Header",
      "phase": "Liquid",
      "properties": {{
        "mass_flow": {{
          "value": 24085.0,
          "unit": "kg/h"
        }},
        "temperature": {{
          "value": 35.0,
          "unit": "°C"
        }},
        "pressure": {{
          "value": 1.8,
          "unit": "barg"
        }}
      }},
      "compositions": {{
        "Water (H2O)": {{
          "value": 1.0,
          "unit": "molar fraction"
        }}
      }},
      "notes": "Return stream closes utility loop."
    }}
  ],
  "validation_summary": {{
    "total_equipment": 2,
    "energy_balance": "Process cooling duty: 272 kW. Utility heating duty: 272 kW (matched). Overall heat balance verified.",
    "cost_drivers": [
      "Heat exchanger area (150.8 m²) drives shell-and-tube construction cost and mechanical design complexity",
      "Pump discharge pressure (2.45 barg) requires robust centrifugal pump selection"
    ],
    "items_requiring_detailed_design": [
      "E-101: Detailed thermal performance verification with vendor; confirm U-value and pressure drops",
      "E-101: Mechanical design (wall thickness, head selection) per ASME Section VIII Div 1",
      "P-101: Pump selection from vendor catalog; verify NPSH available vs. required",
      "P-101: Piping design and support structure for 2.45 barg discharge"
    ]
  }}
}}</expected_json_output>
  </example>

</agent>
"""

    human_content = f"""
# DATA FOR ANALYSIS:
---
**Design Basis (Markdown):**
{design_basis_markdown}

**Flowsheet Description (Markdown):**
{flowsheet_description_markdown}

**Equipment Template (JSON):**
{equipment_and_stream_results_json}

---

# **NEGATIVES:**

  * Your response **MUST** be a single, raw JSON object.
  * **Do NOT** add any conversational text, explanations, or markdown code blocks like ```json before or after the JSON output.
  * Your output must start with {{ and end with }}.

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
