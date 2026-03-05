# Agent Workflow & Contributor Notes

ProcessDesignAgents coordinates a fixed LangGraph pipeline of specialised agents. Each stage reads from and writes to a shared `DesignState` (see `processdesignagents/agents/utils/agent_states.py`) and logs its output for downstream consumers. The detailed prompt text lives alongside each agent implementation, while this document captures how the workflow fits together and what contributors should keep in mind when extending it. For prompt-level nuances refer to `docs/AGENTS.md`.

## Current Graph (LangGraph)

The graph wiring is defined in `processdesignagents/graph/setup.py` and compiled by `ProcessDesignGraph`. Nodes execute strictly in the order below.

| Step | Agent | Module | Reads | Writes | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Process Requirements Analyst | `processdesignagents/agents/analysts/process_requirements_analyst.py` | `problem_statement`, `messages` | `process_requirements`, `messages` | Extracts a structured Markdown brief; exits early if the response is too short. |
| 2 | Innovative Researcher | `processdesignagents/agents/researchers/innovative_researcher.py` | `process_requirements`, `messages` | `research_concepts`, `messages` | Generates 3–6 concepts as JSON (`concepts[...]`) with maturity tags. |
| 3 | Conservative Researcher | `processdesignagents/agents/researchers/conservative_researcher.py` | `research_concepts`, `process_requirements`, `messages` | `research_rating_results`, `messages` | Replays each concept with feasibility scores, risks, and recommendations. |
| 4 | Concept Detailer | `processdesignagents/agents/researchers/detail_concept_researcher.py` | `research_rating_results`, `process_requirements`, `messages` | `selected_concept_name`, `selected_concept_details`, `selected_concept_evaluation`, `messages` | Auto-selects the highest-scoring concept unless a manual provider is injected via `ProcessDesignGraph.propagate(manual_concept_selection=True)`. |
| 5 | Component List Researcher | `processdesignagents/agents/researchers/component_list_researcher.py` | `process_requirements`, `selected_concept_details`, `selected_concept_name`, `design_basis`, `messages` | `component_list`, `messages` | Produces a Markdown component table (formula + MW) using the built-in CSV as reference. |
| 6 | Design Basis Analyst | `processdesignagents/agents/analysts/design_basis_analyst.py` | `problem_statement`, `process_requirements`, `selected_concept_details`, `selected_concept_name`, `component_list`, `messages` | `design_basis`, `messages` | Builds the preliminary basis-of-design document. |
| 7 | Flowsheet Design Agent | `processdesignagents/agents/designer/flowsheet_design_agent.py` | `process_requirements`, `design_basis`, `selected_concept_details`, `selected_concept_name`, `messages` | `flowsheet_description`, `messages` | Returns a Markdown flowsheet narrative with equipment/stream tables. |
| 8 | Equipment & Stream Catalog Agent | `processdesignagents/agents/designer/equipment_stream_catalog_agent.py` | `flowsheet_description`, `design_basis`, `process_requirements`, `selected_concept_details`, `messages` | `equipment_list_template`, `stream_list_template`, `messages` | Emits the canonical equipment and stream templates; CLI renders the merged view via `equipments_and_streams_dict_to_markdown`. |
| 9 | Stream Property Estimation Agent | `processdesignagents/agents/designer/stream_property_estimation_agent.py` | `flowsheet_description`, `design_basis`, `equipment_list_template`, `stream_list_template`, `messages` | `stream_list_results`, `messages` | Re-generates the stream JSON with reconciled properties, leaving the equipment template intact. |
| 10 | Equipment Sizing Agent | `processdesignagents/agents/designer/equipment_sizing_agent.py` | `design_basis`, `flowsheet_description`, `equipment_list_results`, `equipment_list_template`, `stream_list_results`, `messages` | `equipment_list_results`, `messages` | Calls sizing helpers to fill equipment duties, dimensions, and notes. |
| 11 | Safety & Risk Analyst | `processdesignagents/agents/analysts/safety_risk_analyst.py` | `process_requirements`, `design_basis`, `flowsheet_description`, `equipment_list_results`, `stream_list_results`, `messages` | `safety_risk_analyst_report`, `messages` | Produces a markdown HAZOP-style assessment (hazards + mitigations). |
| 12 | Project Manager | `processdesignagents/agents/project_manager/project_manager.py` | `process_requirements`, `design_basis`, `flowsheet_description`, `equipment_list_results`, `stream_list_results`, `safety_risk_analyst_report`, `messages` | `project_approval`, `project_manager_report`, `messages` | Issues the gate decision and implementation plan in Markdown. |

## Shared State Keys

| Field | Description | Primary setter(s) | Downstream consumers |
| --- | --- | --- | --- |
| `problem_statement` | Raw design brief seeded as the first human message. | Propagator | Requirements analyst (reference only). |
| `process_requirements` | Structured Markdown requirements package. | Requirements analyst | All later agents. |
| `research_concepts` | JSON list of candidate concepts. | Innovative researcher | Conservative researcher. |
| `research_rating_results` | JSON evaluations with scores/risks. | Conservative researcher | Concept detailer. |
| `selected_concept_name` | Winning concept identifier. | Concept detailer | Component list, design basis, PFD, downstream stages. |
| `selected_concept_details` | Markdown concept brief. | Concept detailer | Component list, design basis, PFD, list builder. |
| `selected_concept_evaluation` | JSON payload for the chosen concept (stored for reference). | Concept detailer | Currently informational; exposed to CLI snapshots. |
| `component_list` | Markdown table of key components. | Component list researcher | Design basis analyst. |
| `design_basis` | Markdown basis-of-design. | Design basis analyst | PFD, list builder, estimator, sizing, safety, PM. |
| `flowsheet_description` | Markdown flowsheet summary. | Flowsheet design agent | Equipment & stream catalog agent, estimator, sizing, safety, PM. |
| `equipment_list_template` | JSON template defining equipment fields and placeholders. | Equipment & Stream Catalog Agent | Stream estimator, sizing agent. |
| `equipment_list_results` | JSON equipment list enriched with sizing results. | Equipment Sizing Agent | Safety analyst, project manager, report exporters. |
| `stream_list_template` | JSON template enumerating streams and placeholder properties. | Equipment & Stream Catalog Agent | Stream property estimator. |
| `stream_list_results` | JSON stream list populated with reconciled properties. | Stream Property Estimation Agent | Equipment sizing agent, safety analyst, project manager. |
| `safety_risk_analyst_report` | Markdown hazard summary. | Safety & risk analyst | Project manager, exports. |
| `project_manager_report` | Final approval memo. | Project manager | Report exporters. |
| `project_approval` | Extracted status (`Approved`, `Conditional`, `Rejected`, etc.). | Project manager | CLI, downstream orchestration. |
| `messages` | Running transcript of LLM calls. | All agents | CLI streaming, debugging. |

The combined equipment/stream Markdown is rendered on demand by merging `equipment_list_*` and `stream_list_*` via `build_equipment_stream_payload`, so no dedicated `equipment_and_stream_*` fields remain in the state.

## Tool Nodes & External Helpers

- `ProcessDesignGraph._create_tool_nodes()` registers the equipment sizing tool node and currently exposes `size_heat_exchanger_basic` and `size_pump_basic` from `processdesignagents/agents/utils/agent_sizing_tools.py`. Additional sizing helpers can be added by extending this mapping.
- `equipments_and_streams_dict_to_markdown` converts combined JSON artefacts into Markdown for CLI display and report exports (use `build_equipment_stream_payload` to assemble the combined input when needed).
- `size_heat_exchanger_basic` and `size_pump_basic` rely on cached property data in `processdesignagents/sizing_tools/`.

## Operational Notes

- Instantiate the workflow via `ProcessDesignGraph.propagate(...)`. Use `manual_concept_selection=True` to prompt the operator before the concept detailer runs.
- The graph resumes from the most recent unfinished run by default; pass `resume_from_last_run=False` to force a clean start for the current problem statement.
- Set `save_markdown` and/or `save_word_doc` when calling `propagate` to emit aggregated reports. DOCX export uses Pandoc with a reference template in `reports/template.docx`.
- Every run logs the final state to `eval_results/ProcessDesignAgents_logs/full_states_log.json` for offline inspection.
- The Rich CLI (`python -m cli.main -p "design ..."`) streams agent outputs, tool calls, and report sections as they are generated.

## Contributor Checklist

- Target Python 3.10+ and add type hints to new public functions. Follow Black-style formatting (4 spaces, double quotes where practical) and group imports with the usual stdlib/third-party/local sections.
- Keep agent and tool names descriptive (`ProcessRequirementsAnalyst`, `size_heat_exchanger_basic`, etc.) and use snake_case for filenames.
- Extend `DesignState` and the graph setup together whenever you introduce a new artefact or agent. Ensure CLI panels and exporters handle new fields.
- Add or update tests under `tests/` and run `pytest` before committing when behaviour changes.
- Document meaningful prompt or orchestration updates in `docs/AGENTS.md` (agent responsibilities) or `docs/ARCHITECTURE.md` (data flow).
- Store provider secrets (e.g., `OPENROUTER_API_KEY`) in your environment or a local `.env` ignored by git.

For granular agent prompts, schemas, and usage notes see `docs/AGENTS.md`.
