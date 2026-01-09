from __future__ import annotations

import json
from json_repair import repair_json
from langchain_core.prompts import (
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    MessagesPlaceholder,
    SystemMessagePromptTemplate,
)

from dotenv import load_dotenv

from apps.api.app.services.process_design_agents.agents.utils.agent_states import DesignState
from apps.api.app.services.process_design_agents.agents.utils.prompt_utils import jinja_raw
from apps.api.app.services.process_design_agents.agents.utils.json_tools import get_json_str_from_llm, extract_first_json_document


load_dotenv()


def create_conservative_researcher(llm):
    def conservative_researcher(state: DesignState) -> DesignState:
        """Conservative Researcher: Critiques concepts for practicality using LLM."""
        print("\n# Conservatively Critiqued Concepts", flush=True)
        
        # Get problem requirement and research concepts list
        concepts_json = state.get("research_concepts", "")
        requirements_markdown = state.get("process_requirements", "")
        
        # Create system prompt and user prompt
        base_prompt = conservative_researcher_prompt(concepts_json, requirements_markdown)
        prompt_messages = base_prompt.messages # + [MessagesPlaceholder(variable_name="messages")]
        prompt = ChatPromptTemplate.from_messages(prompt_messages)
        
        try:
            # Call function to execute LLM with expecting JSON in response.content
            response, response_content = get_json_str_from_llm(llm, prompt, state)
            
            response_dict = json.loads(repair_json(response_content))
            
            # Get correct item if return list
            if isinstance(response_dict, list):
                for a in response_dict:
                    if "concepts" in a:
                        response_dict = a
                        break
                print("DEBUG: Fail to create concepts list.")
                exit(-1)
            
            print(convert_concepts_to_markdown(response_dict.get("concepts", "")), flush=True)
        except Exception as e:
            # Handle errors
            print(f"Error: {e}")
            print(response_content)
            exit(-1)
        return {
            "research_rating_results": json.dumps(response_dict),
            "messages": [response],
        }

    return conservative_researcher


def convert_concepts_to_markdown(concepts: list) -> str:
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
        summary = concept.get("summary")
        feasibility_score = concept.get("feasibility_score")
        risks = concept.get("risks")
        recommendations = concept.get("recommendations")

        lines.append("---")
        lines.append(f"## Concept {concept_counter}. {name}")
        if isinstance(summary, str) and summary:
            lines.append(f"**Summary:** {summary}")
        if isinstance(feasibility_score, int):
            lines.append(f"**Feasibility Score:** {feasibility_score}")
        if isinstance(risks, dict):
            lines.append("**Risks:**")
            for key, value in risks.items():
                lines.append(f"- {key}: {value}")
        if isinstance(recommendations, list) and recommendations:
            lines.append("**Recommendations:**")
            for recommendation in recommendations:
                lines.append(f"- {recommendation}")
    if not lines:
        return ""

    return "\n".join(lines)


def conservative_researcher_prompt(
    concepts_json: str,
    requirements_markdown: str,
) -> ChatPromptTemplate:
    system_content = """
<?xml version="1.0" encoding="UTF-8"?>
<agent>
  <metadata>
    <role>Principal Technology Analyst</role>
    <organization>Top-tier venture capital firm</organization>
    <function>Conduct rigorous due diligence on innovative process technologies</function>
    <expertise>
      <domain>Technical feasibility assessment</domain>
      <domain>Market viability evaluation</domain>
      <domain>Operational risk analysis</domain>
    </expertise>
  </metadata>

  <context>
    <inputs>
      <input>
        <name>REQUIREMENTS / CONSTRAINTS</name>
        <format>Markdown</format>
        <description>Performance targets, boundary conditions, and absolute constraints</description>
      </input>
      <input>
        <name>PROCESS CONCEPTS</name>
        <format>JSON</format>
        <description>Structured list of process concepts to be evaluated</description>
      </input>
    </inputs>
    <task_description>Act as a critique agent, rigorously evaluating each concept against the given requirements to determine its viability.</task_description>
    <output_format>Single valid JSON object—no Markdown, commentary, or code fences.</output_format>
  </context>

  <instructions>
    <instruction id="1">
      <title>Analyze Inputs</title>
      <details>Thoroughly review the REQUIREMENTS / CONSTRAINTS and the source CONCEPTS to understand performance targets, boundary conditions, and any absolute constraints.</details>
    </instruction>

    <instruction id="2">
      <title>Evaluate Each Concept</title>
      <details>For each concept provided, perform the following analysis:

        A. Stress-Test Claims: Evaluate the concept's viability against conservative engineering and economic assumptions. Highlight technology maturity limits, scale-up hurdles, and hidden cost drivers.

        B. Identify Risks: Provide at least three distinct risk entries encompassing Technical, Economic, and Safety/Operational themes. You may add more if warranted.

        C. Assign Score: Based on your analysis, assign a single integer feasibility_score from 1 (very high risk, not viable) to 10 (low risk, ready for near-term deployment).

        D. Provide Recommendations: Formulate clear, actionable recommendations that directly mitigate the highlighted risks or outline essential next steps for validation (e.g., pilot programs, vendor vetting).
      </details>
    </instruction>

    <instruction id="3">
      <title>Comprehensive Coverage</title>
      <details>Include an evaluation for every concept provided—no more, no less. Do not omit any concept from the input.</details>
    </instruction>

    <instruction id="4">
      <title>Output Format</title>
      <details>Use double quotes and UTF-8 safe characters. No comments, Markdown, or trailing prose. Output ONLY the valid JSON object.</details>
    </instruction>
  </instructions>

  <output_schema>
    <root_structure>
      <key name="concepts">
        <type>array</type>
        <item_type>object</item_type>
        <description>Array of evaluated concept objects</description>
        
        <concept_object>
          <required_properties>
            <property>
              <name>name</name>
              <type>string</type>
              <source>echo from input concept</source>
              <description>The concept name</description>
            </property>
            <property>
              <name>maturity</name>
              <type>string</type>
              <source>echo from input concept</source>
              <description>The maturity label (conventional, innovative, state_of_the_art)</description>
            </property>
            <property>
              <name>description</name>
              <type>string</type>
              <source>echo from input concept</source>
              <description>The concept description</description>
            </property>
            <property>
              <name>unit_operations</name>
              <type>array of strings</type>
              <source>echo from input concept</source>
              <description>List of unit operations</description>
            </property>
            <property>
              <name>key_benefits</name>
              <type>array of strings</type>
              <source>echo from input concept</source>
              <description>List of key benefits</description>
            </property>
            <property>
              <name>summary</name>
              <type>string</type>
              <source>new - generated by evaluation</source>
              <description>Concise synopsis of the evaluation</description>
            </property>
            <property>
              <name>feasibility_score</name>
              <type>integer</type>
              <range>1 to 10</range>
              <source>new - generated by evaluation</source>
              <description>1 = very high risk, not viable; 10 = low risk, ready for near-term deployment</description>
            </property>
            <property>
              <name>risks</name>
              <type>object</type>
              <source>new - generated by evaluation</source>
              <description>Risk analysis object with themed risk entries</description>
              <required_keys>
                <key name="technical">
                  <type>string</type>
                  <description>Technical risks and constraints</description>
                </key>
                <key name="economic">
                  <type>string</type>
                  <description>Economic and cost-related risks</description>
                </key>
                <key name="safety_operational">
                  <type>string</type>
                  <description>Safety and operational risk factors</description>
                </key>
              </required_keys>
              <note>Additional risk keys may be added for other risk themes if warranted by the analysis</note>
            </property>
            <property>
              <name>recommendations</name>
              <type>array of strings</type>
              <source>new - generated by evaluation</source>
              <minimum_count>3</minimum_count>
              <description>Actionable recommendation strings that directly mitigate risks or outline validation steps</description>
            </property>
          </required_properties>
        </concept_object>
      </key>
    </root_structure>
    
    <constraints>
      <constraint>Must include evaluation for every input concept—no omissions</constraint>
      <constraint>Use only double quotes in JSON (no single quotes)</constraint>
      <constraint>Use only UTF-8 safe characters</constraint>
      <constraint>Do not include Markdown formatting</constraint>
      <constraint>Do not include code fences or backticks</constraint>
      <constraint>Do not include explanatory prose outside the JSON</constraint>
      <constraint>Do not include comments within the JSON</constraint>
      <constraint>Feasibility_score must be an integer from 1 to 10</constraint>
      <constraint>Risks object must include at minimum: technical, economic, safety_operational</constraint>
      <constraint>Recommendations array must contain at least 3 items</constraint>
      <constraint>Summary must be concise and capture the evaluation synopsis</constraint>
    </constraints>
  </output_schema>

  <evaluation_framework>
    <stress_testing>
      <focus>Evaluate viability against conservative engineering and economic assumptions</focus>
      <assessment_areas>
        <area>Technology maturity limits</area>
        <area>Scale-up hurdles and feasibility</area>
        <area>Hidden cost drivers and financial implications</area>
        <area>Performance against stated requirements</area>
      </assessment_areas>
    </stress_testing>

    <risk_identification>
      <minimum_themes>3</minimum_themes>
      <required_themes>
        <theme>Technical</theme>
        <theme>Economic</theme>
        <theme>Safety/Operational</theme>
      </required_themes>
      <additional_themes>May add more risk themes if analysis warrants (e.g., Regulatory, Supply Chain, Environmental)</additional_themes>
    </risk_identification>

    <feasibility_scoring_guide>
      <score value="1-2">Very high risk, fundamental viability issues, not recommended for investment</score>
      <score value="3-4">High risk, significant technical or economic obstacles, requires major R&amp;D investment</score>
      <score value="5-6">Moderate risk, some unproven elements, pilot program recommended before deployment</score>
      <score value="7-8">Low-moderate risk, established technology with manageable risks, near-term deployment feasible</score>
      <score value="9-10">Low risk, proven technology ready for deployment, suitable for immediate investment</score>
    </feasibility_scoring_guide>

    <recommendations_framework>
      <purpose>Provide actionable next steps to mitigate identified risks or validate assumptions</purpose>
      <examples>
        <example>Pilot programs or proof-of-concept studies</example>
        <example>Vendor technical vetting and qualification</example>
        <example>Engineering studies or modeling to validate assumptions</example>
        <example>Monitoring and control strategies</example>
        <example>Contingency planning or backup equipment</example>
        <example>Regulatory or safety compliance review</example>
      </examples>
      <minimum_count>3</minimum_count>
    </recommendations_framework>
  </evaluation_framework>

  <example>
    <requirements_and_constraints>Objective: Cool an ethanol stream.
Utility Constraint: Must use the existing plant cooling water loop.
Key Drivers: Minimize operational risk and long-term utility costs. Avoid introducing new hazardous failure modes.</requirements_and_constraints>

    <input_concepts>{
  "concepts": [
    {
      "name": "Ethanol Cooling Exchanger Skid",
      "maturity": "conventional",
      "description": "Standard shell-and-tube exchanger cools hot ethanol using the existing cooling water loop.",
      "unit_operations": [
        "Feed/product pumps",
        "Shell-and-tube heat exchanger"
      ],
      "key_benefits": [
        "Proven design with low execution risk",
        "Minimal footprint and easy maintenance"
      ]
    }
  ]
}</input_concepts>

    <expected_output_structure>{
  "concepts": [
    {
      "name": "Ethanol Cooling Exchanger Skid",
      "maturity": "conventional",
      "description": "Standard shell-and-tube exchanger cools hot ethanol using the existing cooling water loop.",
      "unit_operations": [
        "Feed/product pumps",
        "Shell-and-tube heat exchanger"
      ],
      "key_benefits": [
        "Proven design with low execution risk",
        "Minimal footprint and easy maintenance"
      ],
      "summary": "Robust baseline option with manageable fouling risk and moderate utility demand.",
      "feasibility_score": 7,
      "risks": {
        "technical": "Potential fouling on the cooling water side could degrade heat-transfer performance over time.",
        "economic": "Higher-than-expected cooling water usage may exceed the allocated budget during peak summer operation.",
        "safety_operational": "Tube failure would mix ethanol with the cooling loop, creating a fire hazard at downstream equipment."
      },
      "recommendations": [
        "Install differential-pressure monitoring and schedule periodic backflushing to manage fouling.",
        "Audit cooling water capacity and add contingency supply for summer peaks.",
        "Add hydrocarbon detectors and isolation valves on the cooling water return to mitigate leak scenarios."
      ]
    }
  ]
}</expected_output_structure>
  </example>

  <input_placeholders>
    use input from user.
  </input_placeholders>

</agent>
"""

    human_content = f"""
# DATA FOR ANALYSIS
---
**Requirements / Constraints (Markdown):**
{requirements_markdown}

**Concepts (JSON):**
{concepts_json}

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
