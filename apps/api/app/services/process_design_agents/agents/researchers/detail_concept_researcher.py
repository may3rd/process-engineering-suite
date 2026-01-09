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
from apps.api.app.services.process_design_agents.agents.utils.prompt_utils import jinja_raw, strip_markdown_code_fences

load_dotenv()


def create_concept_detailer(llm, selection_provider_getter=None):
    def concept_detailer(state: DesignState) -> DesignState:
        """Concept Detailer: Picks the highest-feasibility concept and elaborates it for downstream design."""
        print("\n# Concept Selection", flush=True)
        
        # Get the input data
        evaluations_json_raw = state.get("research_rating_results")
        requirements_markdown = state.get("process_requirements", "")

        try:
            evaluation_payload = json.loads(repair_json(evaluations_json_raw))
        except Exception as e:
            print(f"Error: {e}")
            print(evaluations_json_raw)
            raise ValueError("Concept detailer expected JSON evaluations from conservative researcher.")

        if isinstance(evaluation_payload, dict):
            evaluations = evaluation_payload.get("concepts")
        elif isinstance(evaluation_payload, list):
            evaluations = evaluation_payload
        else:
            evaluations = None

        if not isinstance(evaluations, list) or not evaluations:
            print(evaluation_payload)
            raise ValueError("Concept detailer could not find any concept evaluations to consider.")

        concept_options = []
        for idx, evaluation in enumerate(evaluations, start=1):
            name = evaluation.get("name", f"Concept {idx}")
            score = _safe_int(evaluation.get("feasibility_score"))
            concept_options.append(
                {
                    "title": name,
                    "score": score,
                    "evaluation": evaluation,
                }
            )

        selected_index: int | None = None
        selection_provider = selection_provider_getter() if selection_provider_getter else None
        if selection_provider:
            try:
                selected_index = selection_provider(concept_options)
            except Exception as exc:  # noqa: BLE001
                print(
                    f"Concept selection input failed ({exc}); defaulting to best score.",
                    flush=True,
                )
                selected_index = None

        if selected_index is not None and 0 <= selected_index < len(concept_options):
            chosen = concept_options[selected_index]
        else:
            chosen = _select_best_evaluation(concept_options)

        best_evaluation = chosen["evaluation"]
        selected_concept_title = best_evaluation.get("name", chosen["title"])
        best_score = chosen["score"]
        selected_concept_evaluations_json = json.dumps(best_evaluation, ensure_ascii=False)

        print(
            f"Chosen concept: {selected_concept_title}\n(Feasibility Score: {best_score if best_score is not None else 'N/A'})",
            flush=True,
        )
        # print("DEBUG: Call LLM to generate detailed concept brief...", flush=True)
        base_prompt = concept_detailer_prompt(best_evaluation, requirements_markdown)
        prompt_messages = base_prompt.messages # + [MessagesPlaceholder(variable_name="messages")]
        prompt = ChatPromptTemplate.from_messages(prompt_messages)
        chain = prompt | llm
        is_done = False
        try_count = 0
        concept_description_markdown = ""
        while not is_done:
            try_count += 1
            if try_count > 3:
                print("+ Max try count reached.", flush=True)
                exit(-1)
            try:
                response = chain.invoke({"messages": list(state.get("messages", []))})
                concept_description_markdown = (
                    response.content if isinstance(response.content, str) else str(response.content)
                ).strip()
                concept_description_markdown = strip_markdown_code_fences(concept_description_markdown)
                if len(concept_description_markdown) > 50:
                    is_done = True
                else:
                    print("DEBUG: The respones message is too short. Try again.")
            except Exception as e:
                print(f"Attemp {try_count}: {e}")
        print(concept_description_markdown, flush=True)
        return {
            "selected_concept_name": selected_concept_title,
            "selected_concept_details": concept_description_markdown,
            "selected_concept_evaluation": selected_concept_evaluations_json,
            "messages": [response],
        }
    return concept_detailer


def _select_best_evaluation(options: list[dict]) -> dict:
    if not options:
        raise ValueError("No concept evaluations supplied.")

    best_option = options[0]
    best_score = _safe_int(best_option.get("score"))

    for option in options[1:]:
        score = _safe_int(option.get("score"))
        if score is None:
            continue
        if best_score is None or score > best_score:
            best_option = option
            best_score = score

    return best_option


def _safe_int(value) -> int | None:
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.strip().isdigit():
        try:
            return int(value.strip())
        except ValueError:
            return None
    return None


def concept_detailer_prompt(
    selected_evaluation: dict,
    requirements_markdown: str,
) -> ChatPromptTemplate:
    
    selected_concept_json = json.dumps(selected_evaluation, ensure_ascii=False, indent=2)

    system_content = """
<?xml version="1.0" encoding="UTF-8"?>
<agent>
  <metadata>
    <role>Lead Conceptual Process Engineer</role>
    <function>Translate winning design concepts into detailed technical briefs</function>
    <purpose>Serve as design basis for downstream engineering disciplines (detailed design, safety, instrumentation)</purpose>
  </metadata>

  <context>
    <inputs>
      <input>
        <n>SELECTED CONCEPT EVALUATION</n>
        <format>JSON</format>
        <contents>Original concept definition, critiques, and feasibility score</contents>
      </input>
      <input>
        <n>PROJECT REQUIREMENTS</n>
        <format>Markdown or text</format>
        <contents>Overarching project objectives, constraints, and key drivers</contents>
      </input>
    </inputs>
    <audience>Project team executing front-end engineering design (FEED)</audience>
    <critical_qualities>Clarity and actionable detail are essential</critical_qualities>
    <output_format>Pure Markdown document—no code blocks or text outside the template</output_format>
  </context>

  <instructions>
    <instruction id="1">
      <title>Synthesize Inputs</title>
      <details>Thoroughly review the SELECTED CONCEPT and PROJECT REQUIREMENTS to create a cohesive design narrative that connects the winning concept to the project's overall objectives.</details>
    </instruction>

    <instruction id="2">
      <title>Develop Process Narrative</title>
      <details>Write 2–3 paragraphs describing the end-to-end process flow, from feed preparation to final product handling. Include key transformations, unit operations, and utility interactions. Make the narrative accessible to the downstream engineering team.</details>
    </instruction>

    <instruction id="3">
      <title>Detail Major Equipment</title>
      <details>Create a well-structured table listing the primary equipment items, their specific function, and critical operational notes (e.g., material constraints, control targets, performance limits). Equipment should be keyed with logical designations (e.g., E-101, P-101A/B, T-201).</details>
    </instruction>

    <instruction id="4">
      <title>Define Operating Envelope</title>
      <details>Specify the key design parameters including:
        - Design capacity and basis (e.g., kg/h, mol/s)
        - Pressure ranges and nominal operating points
        - Temperature ranges and nominal operating points
        - Special utilities required (cooling water, steam, nitrogen, etc.)
        - Any material or chemical compatibility constraints
      </details>
    </instruction>

    <instruction id="5">
      <title>Identify Risks &amp; Safeguards</title>
      <details>List the most significant process risks (e.g., equipment failure modes, utility interruption, upset conditions) and propose concrete, specific safeguards or mitigation strategies for each. Format as bullet points or a table for clarity.</details>
    </instruction>

    <instruction id="6">
      <title>Acknowledge Gaps</title>
      <details>Explicitly list any critical information that is still needed or assumptions you had to make to complete the brief. Use "TBD" (To Be Determined) where data is unavailable. This ensures downstream teams know what remains to be validated.</details>
    </instruction>

    <instruction id="7">
      <title>Format Adherence</title>
      <details>Your final output must be a PURE Markdown document. Do not wrap it in code blocks or add any explanatory text outside the specified template. Start directly with the Markdown content.</details>
    </instruction>
  </instructions>

  <output_schema>
    <document_type>Markdown</document_type>
    <structure>
      <section id="1">
        <n>Concept Summary</n>
        <markdown_heading>## Concept Summary</markdown_heading>
        <content_elements>
          <element>- Name: [from SELECTED CONCEPT]</element>
          <element>- Intent: [brief statement of the concept's purpose from PROJECT REQUIREMENTS]</element>
          <element>- Feasibility Score (from review): [from SELECTED CONCEPT evaluation]</element>
        </content_elements>
      </section>

      <section id="2">
        <n>Process Narrative</n>
        <markdown_heading>## Process Narrative</markdown_heading>
        <requirements>
          <requirement>2–3 paragraphs</requirement>
          <requirement>Describe end-to-end process flow from feed to product</requirement>
          <requirement>Include key transformations and unit operations</requirement>
          <requirement>Specify utility interactions (cooling, heating, gas blanketing, etc.)</requirement>
          <requirement>Make narrative accessible to FEED engineers who may not be familiar with the concept</requirement>
        </requirements>
      </section>

      <section id="3">
        <n>Major Equipment &amp; Roles</n>
        <markdown_heading>## Major Equipment &amp; Roles</markdown_heading>
        <content_type>Table</content_type>
        <table_format>Markdown table with columns: Equipment | Function | Critical Operating Notes</table_format>
        <content_elements>
          <element>Equipment tag/designation (e.g., E-101, P-101A/B, T-201)</element>
          <element>Specific function in the process</element>
          <element>Critical operating notes such as:
            - Material constraints
            - Control targets
            - Performance limits
            - Monitoring requirements
            - Isolation/safety procedures
          </element>
        </content_elements>
      </section>

      <section id="4">
        <n>Operating Envelope</n>
        <markdown_heading>## Operating Envelope</markdown_heading>
        <content_elements>
          <element>- Design capacity: [numeric value] [UOM] [basis e.g., continuous, batch]</element>
          <element>- Key pressure levels: [inlet, outlet, system pressures with units]</element>
          <element>- Key temperature levels: [inlet, outlet, intermediate points with units]</element>
          <element>- Special utilities / additives: [list all required utilities and specifications]</element>
          <element>- Material compatibility: [if applicable, e.g., ethanol service ratings]</element>
        </content_elements>
      </section>

      <section id="5">
        <n>Risks &amp; Safeguards</n>
        <markdown_heading>## Risks &amp; Safeguards</markdown_heading>
        <format>Bullet list or table</format>
        <content_elements>
          <element>- [Risk scenario] — [Specific safeguard/mitigation]</element>
          <element>[Minimum 3 risk/safeguard pairs]</element>
        </content_elements>
        <guidance>
          - Draw from the SELECTED CONCEPT evaluation's risk section
          - Translate risks into concrete failure scenarios
          - Propose specific, actionable mitigation strategies
          - Include equipment, instrumentation, procedures, or process changes
        </guidance>
      </section>

      <section id="6">
        <n>Data Gaps &amp; Assumptions</n>
        <markdown_heading>## Data Gaps &amp; Assumptions</markdown_heading>
        <content_elements>
          <element>- [Assumption statement with justification or source]</element>
          <element>- TBD: [Critical data item needed]</element>
          <element>[Minimum 2–3 items identifying gaps or assumptions]</element>
        </content_elements>
        <guidance>
          - Clearly distinguish between assumptions made for design continuity and true data gaps
          - Use "TBD" prefix for items that must be resolved before detailed design
          - Reference source documents or standards (e.g., "pending review of utility documentation")
          - Examples: thermodynamic properties, utility constraints, tie-in points, vendor data
        </guidance>
      </section>
      <section id="7">
        <n>Component List &amp; Physical Properties</n>
        <markdown_heading>## Component List &amp; Physical Properties</markdown_heading>
        <content_type>Table</content_type>
        <table_format>
| Component | Formula | MW (g/mol) | Normal Boiling Point (°C) |
|-----------|---------|------------|--------------------------|
| [Name]    | [Chem]  | [Value]    | [Value]                  |
        </table_format>
        <content_elements>
          <element>List ALL distinct chemical species involved (feed, product, solvent, utility)</element>
          <element>Provide Molecular Weight (MW) and Normal Boiling Point (NBP)</element>
          <element>Identify if estimated or from standard data</element>
        </content_elements>
        <guidance>
          - This list is CRITICAL for downstream simulation
          - Ensure names are standard (e.g., Ethanol, Water, Nitrogen)
          - Verify MW values (C=12.01, H=1.008, O=16.00, etc.)
        </guidance>
      </section>
    </structure>

    <formatting_rules>
      <rule>Use Markdown syntax exclusively</rule>
      <rule>Use ## for main section headers</rule>
      <rule>Use - for bullet lists</rule>
      <rule>Use Markdown tables for equipment and equipment details</rule>
      <rule>Do NOT use code blocks, backticks, or XML-like formatting</rule>
      <rule>Do NOT include introductory text before the Concept Summary</rule>
      <rule>Do NOT include concluding remarks after Data Gaps &amp; Assumptions</rule>
      <rule>Output ONLY the Markdown content—no wrapping in code fences</rule>
    </formatting_rules>

    <content_quality_guidelines>
      <guideline>Be specific and quantitative; avoid vague language</guideline>
      <guideline>Use industry-standard terminology and equipment designations</guideline>
      <guideline>Ensure all numerical values include appropriate units</guideline>
      <guideline>Make the narrative accessible to FEED teams unfamiliar with the concept origin</guideline>
      <guideline>Propose concrete, implementable mitigation strategies for each risk</guideline>
      <guideline>Flag ambiguities or missing data explicitly so downstream teams can address them</guideline>
    </content_quality_guidelines>
  </output_schema>

  <example>
    <project_requirements>Design a system to cool 10,000 kg/h of 95 wt% ethanol from 80°C to 40°C. The system must be a modular skid to minimize site installation time. Reliability is a key driver, and the system must integrate with the existing plant cooling water utility and nitrogen blanketing system for the storage tanks.</project_requirements>

    <selected_concept_evaluation>{
  "name": "Ethanol Cooler Module",
  "maturity": "innovative",
  "description": "A compact plate-and-frame heat exchanger skid cools ethanol using plant cooling water with modular plates enabling rapid maintenance.",
  "unit_operations": [
    "Feed/product pumps",
    "Plate-and-frame heat exchanger",
    "Isolation &amp; bypass valves"
  ],
  "key_benefits": [
    "Higher overall heat-transfer coefficients reduce required surface area.",
    "Modular architecture supports rapid cleaning and capacity turndown."
  ],
  "summary": "Modular plate-and-frame skid offers compact footprint with manageable fouling risk.",
  "feasibility_score": 8,
  "risks": {
    "technical": "Plate fouling and gasket degradation may erode efficiency over time.",
    "economic": "Custom skid fabrication has higher CAPEX than an in-place exchanger.",
    "safety_operational": "Requires careful isolation procedures when opening plates for cleaning."
  },
  "recommendations": [
    "Include bypass headers and spare plate packs for rapid swap-outs.",
    "Specify corrosion-resistant gasket materials rated for ethanol service.",
    "Develop cleaning-in-place (CIP) protocol with instrumentation to monitor differential pressure buildup."
  ]
}</selected_concept_evaluation>

    <expected_markdown_output>
## Concept Summary
- Name: Ethanol Cooler Module
- Intent: Reduce hot ethanol temperature ahead of storage using a compact exchanger skid
- Feasibility Score (from review): 8

## Process Narrative
Hot ethanol at 95 wt percent exits the upstream blending unit at 80°C and approximately 1.5 barg. The stream is routed via dedicated piping to the new cooler module skid. On the skid, it flows through a plate-and-frame heat exchanger where plant cooling water on the tube side absorbs the sensible heat, bringing the ethanol's temperature down to the target of 40°C before it is sent to storage.

Cooling water enters the exchanger at a design temperature of 25°C from the main utility header and is expected to leave at roughly 35°C. The cooled ethanol product then flows off-skid to the existing atmospheric storage tank T-201. The warmed cooling water is returned to the plant's utility loop.

## Major Equipment &amp; Roles
| Equipment | Function | Critical Operating Notes |
|---|---|---|
| E-101 Plate-and-Frame Exchanger | Remove sensible heat from the ethanol stream using cooling water. | Must maintain a minimum 5°C approach temperature. Monitor plates for fouling. Gaskets rated for ethanol service. |
| P-101A/B Ethanol Pumps | Transfer ethanol from the upstream unit through the cooler to storage. | Centrifugal pumps in a duty/standby configuration for reliability. Control flow at setpoint. |
| T-201 Storage Tank (Existing) | Provide buffer storage for cooled ethanol product. | Must be connected to the nitrogen blanketing system to prevent oxygen ingress. |

## Operating Envelope
- Design capacity: 10,000 kg/h ethanol (continuous basis)
- Key pressure levels: Process inlet at 1.5 barg, outlet to tank at ~1.3 barg.
- Key temperature levels: Ethanol inlet at 80°C, outlet at 40°C. Cooling water inlet at 25°C, outlet at ~35°C.
- Special utilities / additives: Treated plant cooling water with standard corrosion inhibitor package.

## Risks &amp; Safeguards
- Cooling water interruption leads to high-temp ethanol in tank — Install dual supply pumps with automatic switchover on low pressure. Add high-temp alarm on exchanger outlet.
- Tube leak causing cross-contamination — Implement differential pressure monitoring between shell and tube sides. Install quick-acting isolation valves on inlet/outlet lines.
- Over-pressurization of exchanger — Install thermal relief valve on the shell (ethanol) side.
- Plate fouling reduces heat-transfer performance — Develop cleaning-in-place (CIP) protocol with differential-pressure instrumentation. Stock spare plate packs for rapid swap-out.

## Data Gaps &amp; Assumptions
- Assumed ethanol specific heat is 2.5 kJ/kg-K; this must be verified based on the actual stream composition.
- Cooling water supply pressure and fouling factor limits are pending review of the utility documentation.
- Piping and instrumentation diagram (P&amp;ID) for the existing T-201 tie-in point is TBD.
- TBD: Material grades and certifications for gaskets and elastomers in ethanol service.</expected_markdown_output>
  </example>

</agent>
"""

    human_content = f"""
# DATA FOR ANALYSIS:
---
**SELECTED CONCEPT EVALUATION (JSON):**
{selected_concept_json}

**PROJECT REQUIREMENTS:**
{requirements_markdown}

# FINAL MARKDOWN OUTPUT:
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
