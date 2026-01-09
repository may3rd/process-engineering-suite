from __future__ import annotations

from typing import Annotated, List, TypedDict, Optional, Sequence

try:  # Python <3.11 fallback
    from typing import NotRequired  # type: ignore
except ImportError:  # pragma: no cover
    from typing_extensions import NotRequired  # type: ignore
from langgraph.graph import add_messages
from langchain_core.messages import BaseMessage

class DesignState(TypedDict):
    llm_provider: Annotated[str, ""]
    messages: Annotated[List[BaseMessage], add_messages]
    problem_statement: Annotated[str, "problem_statement"]
    process_requirements: Annotated[str, ""]
    research_concepts: Annotated[str, ""]
    research_rating_results: Annotated[str, ""]
    selected_concept_details: Annotated[str, ""]
    selected_concept_name: Annotated[str, ""]
    component_list: Annotated[str, ""]
    flowsheet_description: Annotated[str, ""]
    equipment_and_stream_template: Annotated[str, ""]
    equipment_and_stream_results: Annotated[str, ""]
    equipment_list_template: Annotated[str, ""]
    equipment_list_results: Annotated[str, ""]
    stream_list_template: Annotated[str, ""]
    stream_list_results: Annotated[str, ""]
    project_approval: Annotated[str, ""]
    design_basis: NotRequired[str]
    safety_risk_analyst_report: NotRequired[str]
    project_manager_report: NotRequired[str]


def create_design_state(
    *,
    llm_provider: str = "",
    messages: Optional[Sequence[BaseMessage]] = None,
    problem_statement: str = "",
    process_requirements: str = "",
    research_concepts: str = "",
    research_rating_results: str = "",
    selected_concept_details: str = "",
    selected_concept_name: str = "",
    component_list: str = "",
    flowsheet_description: str = "",
    equipment_and_stream_template: str = "",
    equipment_and_stream_results: str = "",
    equipment_list_template: str = "",
    equipment_list_results: str = "",
    stream_list_template: str = "",
    stream_list_results: str = "",
    project_approval: str = "",
    design_basis: Optional[str] = None,
    safety_risk_analyst_report: Optional[str] = None,
    project_manager_report: Optional[str] = None,
) -> DesignState:
    """Factory to create a DesignState with sensible defaults."""

    state: DesignState = {
        "llm_provider": llm_provider,
        "messages": list(messages) if messages is not None else [],
        "problem_statement": problem_statement,
        "process_requirements": process_requirements,
        "research_concepts": research_concepts,
        "research_rating_results": research_rating_results,
        "selected_concept_details": selected_concept_details,
        "selected_concept_name": selected_concept_name,
        "component_list": component_list,
        "flowsheet_description": flowsheet_description,
        "equipment_and_stream_template": equipment_and_stream_template,
        "equipment_and_stream_results": equipment_and_stream_results,
        "equipment_list_template": equipment_list_template,
        "equipment_list_results": equipment_list_results,
        "stream_list_template": stream_list_template,
        "stream_list_results": stream_list_results,
        "project_approval": project_approval,
        "design_basis": design_basis,
        "safety_risk_analyst_report": safety_risk_analyst_report,
        "project_manager_report": project_manager_report,
    }

    return state
