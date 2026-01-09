from __future__ import annotations

from typing import Callable, Dict, List, Tuple
import time
from functools import wraps
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph
from langgraph.prebuilt import ToolNode

from apps.api.app.services.process_design_agents.agents.utils.agent_states import DesignState
from apps.api.app.services.process_design_agents.agents import *

class GraphSetup:
    """Handle the setup and configuration of the agent graph."""
    
    def __init__(
        self,
        llm_provider: str = "",
        quick_thinking_llm: ChatOpenAI = None,
        deep_thinking_llm: ChatOpenAI = None,
        quick_structured_llm: ChatOpenAI = None,
        deep_structured_llm: ChatOpenAI = None,
        tool_nodes: Dict[str, ToolNode] = None,
        checkpointer = None,
        delay_time: float = 0.5,
        max_agent_call:int = 10,
    ):
        """Initialize with required components."""
        self.llm_provider = llm_provider
        self.quick_thinking_llm = quick_thinking_llm
        self.deep_thinking_llm = deep_thinking_llm
        self.quick_structured_llm = quick_structured_llm
        self.deep_structured_llm = deep_structured_llm
        self.tool_nodes = tool_nodes
        self.checkpointer = checkpointer
        self.concept_selection_provider = None
        self.delay_time = delay_time
        self.max_agent_call = max_agent_call
        self.agent_execution_order: List[Tuple[str, Callable[[DesignState], DesignState]]] = []

    def _wrap_with_delay(self, agent_fn):
        """Ensure each agent pauses briefly before yielding control."""
        @wraps(agent_fn)
        def wrapper(state: DesignState) -> DesignState:
            result = agent_fn(state)
            time.sleep(self.delay_time)
            return result
        return wrapper
        
    def setup_graph(
        self
    ):
        """Set up and complie the agent graph."""
        graph = StateGraph(DesignState)
        self.agent_execution_order = []
        
        process_requirements_analyst = create_process_requiruments_analyst(self.quick_thinking_llm)
        innovative_researcher = create_innovative_researcher(self.quick_thinking_llm)
        conservative_researcher = create_conservative_researcher(self.quick_thinking_llm)
        concept_detailer = create_concept_detailer(
            self.deep_thinking_llm,
            lambda: self.concept_selection_provider,
        )
        component_list_researcher = create_component_list_researcher(self.quick_thinking_llm)
        design_basis_analyst = create_design_basis_analyst(self.quick_thinking_llm)
        flowsheet_design_agent = create_flowsheet_design_agent(self.quick_thinking_llm)
        equipment_stream_catalog_agent = create_equipment_stream_catalog_agent(self.quick_structured_llm)
        stream_property_estimation_agent = create_stream_property_estimation_agent(
            llm=self.deep_thinking_llm,
            max_count=self.max_agent_call,
        )
        equipment_sizing_agent = create_equipment_sizing_agent(
            llm=self.deep_thinking_llm,
            max_count=self.max_agent_call,
        )
        safety_risk_analyst = create_safety_risk_analyst(self.deep_thinking_llm)
        project_manager = create_project_manager(self.quick_thinking_llm)
        
        # Set up all node function by wrapping with delay timer
        # process_requirements_analyst = self._wrap_with_delay(create_process_requiruments_analyst(self.quick_thinking_llm))
        # innovative_researcher = self._wrap_with_delay(create_innovative_researcher(self.quick_thinking_llm))
        # conservative_researcher = self._wrap_with_delay(create_conservative_researcher(self.quick_thinking_llm))
        # concept_detailer = self._wrap_with_delay(create_concept_detailer(self.quick_thinking_llm))
        # component_list_researcher = self._wrap_with_delay(create_component_list_researcher(self.quick_thinking_llm))
        # design_basis_analyst = self._wrap_with_delay(create_design_basis_analyst(self.quick_thinking_llm))
        # flowsheet_design_agent = self._wrap_with_delay(create_flowsheet_design_agent(self.quick_thinking_llm))
        # equipment_stream_catalog_agent = self._wrap_with_delay(create_equipment_stream_catalog_agent(self.quick_structured_llm))
        # stream_property_estimation_agent = self._wrap_with_delay(create_stream_property_estimation_agent(self.deep_structured_llm))
        # equipment_sizing_agent = self._wrap_with_delay(create_equipment_sizing_agent(self.deep_structured_llm))
        # safety_risk_analyst = self._wrap_with_delay(create_safety_risk_analyst(self.quick_thinking_llm))
        # project_manager = self._wrap_with_delay(create_project_manager(self.quick_thinking_llm))
        
        # Add implemented nodes (expand as agents are developed)
        graph.add_node("process_requirements_analyst", process_requirements_analyst)
        self.agent_execution_order.append(("process_requirements_analyst", process_requirements_analyst))
        graph.add_node("innovative_researcher", innovative_researcher)
        self.agent_execution_order.append(("innovative_researcher", innovative_researcher))
        graph.add_node("conservative_researcher", conservative_researcher)
        self.agent_execution_order.append(("conservative_researcher", conservative_researcher))
        graph.add_node("concept_detailer", concept_detailer)
        self.agent_execution_order.append(("concept_detailer", concept_detailer))
        graph.add_node("component_list_researcher", component_list_researcher)
        self.agent_execution_order.append(("component_list_researcher", component_list_researcher))
        graph.add_node("design_basis_analyst", design_basis_analyst)
        self.agent_execution_order.append(("design_basis_analyst", design_basis_analyst))
        graph.add_node("flowsheet_design_agent", flowsheet_design_agent)
        self.agent_execution_order.append(("flowsheet_design_agent", flowsheet_design_agent))
        graph.add_node("equipment_stream_catalog_agent", equipment_stream_catalog_agent)
        self.agent_execution_order.append(("equipment_stream_catalog_agent", equipment_stream_catalog_agent))
        graph.add_node("stream_property_estimation_agent", stream_property_estimation_agent)
        self.agent_execution_order.append(("stream_property_estimation_agent", stream_property_estimation_agent))
        graph.add_node("equipment_sizing_agent", equipment_sizing_agent)
        self.agent_execution_order.append(("equipment_sizing_agent", equipment_sizing_agent))
        graph.add_node("safety_risk_analyst", safety_risk_analyst)
        self.agent_execution_order.append(("safety_risk_analyst", safety_risk_analyst))
        graph.add_node("project_manager", project_manager)
        self.agent_execution_order.append(("project_manager", project_manager))
        
        # Set all edges, entry and exit point.
        graph.set_entry_point("process_requirements_analyst")
        graph.add_edge("process_requirements_analyst", "innovative_researcher")
        graph.add_edge("innovative_researcher", "conservative_researcher")
        graph.add_edge("conservative_researcher", "concept_detailer")
        graph.add_edge("concept_detailer", "component_list_researcher")
        graph.add_edge("component_list_researcher", "design_basis_analyst")
        graph.add_edge("design_basis_analyst", "flowsheet_design_agent")
        graph.add_edge("flowsheet_design_agent", "equipment_stream_catalog_agent")
        graph.add_edge("equipment_stream_catalog_agent", "stream_property_estimation_agent")
        graph.add_edge("stream_property_estimation_agent", "equipment_sizing_agent")
        graph.add_edge("equipment_sizing_agent", "safety_risk_analyst")
        graph.add_edge("safety_risk_analyst", "project_manager")
        graph.add_edge("project_manager", END)
        
        if self.checkpointer is not None:
            return graph.compile(checkpointer=self.checkpointer)
        return graph.compile()

    def get_agent_execution_order(self) -> List[Tuple[str, Callable[[DesignState], DesignState]]]:
        """Return the ordered list of agent callables."""
        return list(self.agent_execution_order)
