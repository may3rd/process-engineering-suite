from __future__ import annotations

import json
from json_repair import repair_json
from langchain_core.messages import AIMessage
from langchain_core.prompts import (
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    MessagesPlaceholder,
    SystemMessagePromptTemplate,
)

from dotenv import load_dotenv

from apps.api.app.services.process_design_agents.agents.utils.agent_states import DesignState
from apps.api.app.services.process_design_agents.agents.utils.prompt_utils import jinja_raw
from apps.api.app.services.process_design_agents.agents.utils.json_tools import get_json_str_from_llm

load_dotenv()

def create_innovative_researcher(llm):
    def innovative_researcher(state: DesignState) -> DesignState:
        """Innovative Researcher: Proposes novel process concepts using LLM."""
        print("\n# Innovative Research Concepts", flush=True)

        # Get the requirement summary from state
        requirements_summary = state.get("process_requirements", "")
        if not isinstance(requirements_summary, str):
            requirements_summary = str(requirements_summary)
            
        # Create system prompt and user prompt
        base_prompt = innovative_researcher_prompt(requirements_summary)
        prompt_messages = base_prompt.messages # + [MessagesPlaceholder(variable_name="messages")]
        prompt = ChatPromptTemplate.from_messages(prompt_messages)
        
        try:
            # Call function to execute LLM with expecting JSON in response.content
            response, response_content = get_json_str_from_llm(llm, prompt, state)
            
            # print(f"DEBUG: {response_content}", flush=True)
            
            # Convert str to dict
            response_dict = json.loads(repair_json(response_content))
            
            # Get correct item if return list
            if isinstance(response_dict, list):
                for a in response_dict:
                    print(a)
                    if "concepts" in a:
                        response_dict = a
                        break
                print("DEBUG: Fail to create concepts list.")
                exit(-1)

            # Display the generated concepts
            print(convert_concepts_list_to_markdown(response_dict.get("concepts", [])), flush=True)
        except Exception as e:
            # Handle errors
            print(f"Error: {e}")
            print(response_dict)
            exit(-1)

        # Update the current states.
        return {
            "research_concepts": json.dumps(response_dict),
            "messages": [response]
        }

    return innovative_researcher


def convert_concepts_list_to_markdown(concepts: list) -> str:
    """Convert list of concept output into a readable Markdown summary."""
    if not isinstance(concepts, list):
        return ""

    lines: list[str] = []
    concept_counter = 0
    for concept in concepts:
        if not isinstance(concept, dict):
            continue

        concept_counter += 1
        name = concept.get("name", "Untitled Concept")
        maturity = concept.get("maturity", "unknown")
        description = concept.get("description", "unknown")
        unit_operations = concept.get("unit_operations", [])
        key_benefits = concept.get("key_benefits", [])

        lines.append("---")
        lines.append(f"## Concept {concept_counter}. {name}")
        if isinstance(maturity, str) and maturity:
            normalized_maturity = maturity.replace("_", " ").title()
            lines.append(f"**Maturity:** {normalized_maturity}")
        if isinstance(description, str) and description:
            lines.append(f"**Description:** {description}")

        if isinstance(unit_operations, list) and unit_operations:
            lines.append("**Unit Operations:**")
            for unit in unit_operations:
                lines.append(f"- {unit}")

        if isinstance(key_benefits, list) and key_benefits:
            lines.append("**Key Benefits:**")
            for benefit in key_benefits:
                lines.append(f"- {benefit}")

    if not lines:
        return ""

    return "\n".join(lines)


def innovative_researcher_prompt(requirements_markdown: str) -> ChatPromptTemplate:
    system_content = """
<?xml version="1.0" encoding="UTF-8"?>
<agent>
  <metadata>
    <role>Senior R&amp;D Process Engineer</role>
    <specialization>Conceptual design and process innovation</specialization>
    <expertise>Brainstorming novel, sustainable, and efficient chemical processes</expertise>
  </metadata>

  <context>
    <input_description>You will be provided with a set of REQUIREMENTS for a new or modified chemical process.</input_description>
    <task_description>Generate multiple distinct process concepts that fulfill these requirements.</task_description>
    <downstream_use>The concepts you generate will be evaluated by a critique agent to determine the most feasible option for further design.</downstream_use>
    <scope_requirement>The concepts must span a range of technological maturity, including conventional industry standards, innovative improvements, and state-of-the-art approaches.</scope_requirement>
  </context>

  <instructions>
    <instruction id="1">
      <title>Analyze Requirements</title>
      <details>Analyze the provided REQUIREMENTS to fully understand the core objective, key components, and constraints.</details>
    </instruction>

    <instruction id="2">
      <title>Generate Process Concepts</title>
      <details>Generate between 3 and 6 distinct process concepts that meet the requirements.</details>
    </instruction>

    <instruction id="3">
      <title>Concept Composition</title>
      <details>For each concept provide:
        - A descriptive name
        - A concise paragraph explaining the idea
        - A maturity classification
        - A list of essential unit operations
        - A list of key benefits
      </details>
    </instruction>

    <instruction id="4">
      <title>Maturity Range</title>
      <details>Ensure the range of concepts includes at least one conventional/standard process, one innovative/complex process, and one state-of-the-art process.</details>
    </instruction>

    <instruction id="5">
      <title>Output Format</title>
      <details>Respond with a single valid JSON object using double quotes and UTF-8 safe characters. Do not include Markdown, comments, code fences, or explanatory prose.</details>
    </instruction>

    <instruction id="6">
      <title>JSON Structure</title>
      <details>The JSON must contain a top-level key "concepts" whose value is a list of objects. Each concept object MUST include the following keys:
        - "name" (string): Descriptive name of the concept
        - "maturity" (enum): One of "conventional", "innovative", or "state_of_the_art"
        - "description" (string): Concise paragraph explaining the idea
        - "unit_operations" (array of strings): List of essential unit operations
        - "key_benefits" (array of strings): List of key benefits
      </details>
    </instruction>

    <instruction id="7">
      <title>Maturity Classification Requirement</title>
      <details>Ensure at least one concept is marked "maturity": "conventional", one "innovative", and one "state_of_the_art".</details>
    </instruction>

    <instruction id="8">
      <title>Feasibility Score Prohibition</title>
      <details>You MUST NOT create a "feasibility_score" for any concepts. Feasibility scoring will be performed later by a separate evaluation agent.</details>
    </instruction>

    <instruction id="9">
      <title>Output Delivery</title>
      <details>Output ONLY a valid JSON object matching the schema described above. Do not wrap the JSON in a code block. Do not add any comment text before, during, or after the JSON.</details>
    </instruction>
  </instructions>

  <output_schema>
    <root_structure>
      <key name="concepts">
        <type>array</type>
        <item_type>object</item_type>
        <required_properties>
          <property>
            <name>name</name>
            <type>string</type>
            <description>Descriptive name of the process concept</description>
          </property>
          <property>
            <name>maturity</name>
            <type>enum</type>
            <allowed_values>conventional, innovative, state_of_the_art</allowed_values>
            <description>Maturity classification of the concept</description>
          </property>
          <property>
            <name>description</name>
            <type>string</type>
            <description>Concise paragraph explaining the process concept</description>
          </property>
          <property>
            <name>unit_operations</name>
            <type>array</type>
            <item_type>string</item_type>
            <description>List of essential unit operations involved in this concept</description>
          </property>
          <property>
            <name>key_benefits</name>
            <type>array</type>
            <item_type>string</item_type>
            <description>List of key benefits of this concept</description>
          </property>
        </required_properties>
      </key>
    </root_structure>
    <constraints>
      <constraint>Use only double quotes in JSON (no single quotes)</constraint>
      <constraint>Use only UTF-8 safe characters</constraint>
      <constraint>Do not include Markdown formatting</constraint>
      <constraint>Do not include code fences or backticks</constraint>
      <constraint>Do not include explanatory prose outside the JSON</constraint>
      <constraint>Do not include comments within the JSON</constraint>
      <constraint>Do not include feasibility_score key in any concept object</constraint>
      <constraint>Do not include other thing later than the JSON</constraint>
      <constraint>Minimum 3 concepts, maximum 10 concepts</constraint>
      <constraint>Must include at least one concept of each maturity level: conventional, innovative, state_of_the_art</constraint>
    </constraints>
  </output_schema>

  <example>
    <requirements_input>We need a process to cool a hot ethanol stream from 80°C to 40°C. The primary cooling utility available is the plant's standard cooling water loop.</requirements_input>
    
    <expected_json_output>{
  "concepts": [
    {
      "name": "Shell-and-Tube Ethanol Cooler",
      "maturity": "conventional",
      "description": "A standard shell-and-tube heat exchanger cools the hot ethanol stream from 80°C to 40°C using the existing cooling water loop, offering the most common industry approach.",
      "unit_operations": [
        "Feed/Product Pumps",
        "Shell-and-Tube Heat Exchanger"
      ],
      "key_benefits": [
        "Proven, reliable technology with low operational and capital cost.",
        "Simple to design, operate, and maintain with readily available parts."
      ]
    },
    {
      "name": "Plate-and-Frame Modular Cooler",
      "maturity": "innovative",
      "description": "A compact plate-and-frame exchanger on a modular skid delivers higher thermal efficiency and allows staged plates for optimized heat transfer with rapid maintenance turnaround.",
      "unit_operations": [
        "Modular Plate-and-Frame Exchanger",
        "Bypass and Isolation Valving"
      ],
      "key_benefits": [
        "Higher heat-transfer coefficients reduce required surface area and footprint.",
        "Modular plates can be added or cleaned offline, minimizing downtime."
      ]
    },
    {
      "name": "Heat Pump Assisted Cooling",
      "maturity": "state_of_the_art",
      "description": "A vapor-compression heat pump recovers low-grade heat from the ethanol stream, enabling sub-ambient cooling and decoupling the process from cooling water limitations.",
      "unit_operations": [
        "Heat Pump Evaporator/Condenser",
        "Chilled-Water Loop Heat Exchanger",
        "Cooling Tower Interface"
      ],
      "key_benefits": [
        "Achieves product temperatures below the cooling water temperature.",
        "Reduces load on the main cooling tower during peak conditions."
      ]
    }
  ]
}</expected_json_output>
  </example>

  <input_placeholder>
    <requirements>{{requirements}}</requirements>
  </input_placeholder>

</agent>
"""

    human_content = f"""
# DATA FOR ANALYSIS:
---
**REQUIREMENTS:**
{requirements_markdown}

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
