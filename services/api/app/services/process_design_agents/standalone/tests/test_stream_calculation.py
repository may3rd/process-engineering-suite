from __future__ import annotations

import json
import re
from json_repair import repair_json
import os
from typing import Annotated, Dict, Any, List, Optional, Union, Tuple

from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain_core.prompts import (
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    MessagesPlaceholder,
    SystemMessagePromptTemplate,
)

from langchain_core.messages import AIMessage, BaseMessage, ToolMessage, HumanMessage

# Using create_agent in langchain 1.0
from langchain.agents import create_agent

from processdesignagents.agents.designers.tools import (
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
    stream_calculation_prompt_with_tools
    )

from processdesignagents.agents.utils.agent_states import DesignState, create_design_state
from processdesignagents.agents.utils.prompt_utils import jinja_raw
from processdesignagents.agents.utils.equipment_stream_markdown import equipments_and_streams_dict_to_markdown

from processdesignagents.default_config import DEFAULT_CONFIG

config = DEFAULT_CONFIG.copy()
config["llm_provider"] = "openrouter"
config["quick_think_llm"] = "openai/gpt-5-nano"
config["deep_think_llm"] = "openai/gpt-5-nano"

# config["quick_think_llm"] = "google/gemini-2.5-flash-lite-preview-09-2025"

config["quick_think_llm"] = "x-ai/grok-4-fast"


# Before creating agent, validate inputs
def validate_stream_inputs(design_basis, flowsheet_description, stream_template):
    """Validate input data before processing"""
    if not design_basis or len(design_basis.strip()) < 20:
        raise ValueError("design_basis is empty or too short")
    if not flowsheet_description or len(flowsheet_description.strip()) < 20:
        raise ValueError("flowsheet_description is empty or too short")
    try:
        template_obj = json.loads(stream_template)
        if "streams" not in template_obj:
            raise ValueError("stream_template missing 'streams' key")
    except json.JSONDecodeError as e:
        raise ValueError(f"stream_template is invalid JSON: {e}")
    print("✓ All inputs validated successfully", flush=True)


def main():
    base_url = "https://openrouter.ai/api/v1"
    api_key = os.getenv("OPENROUTER_API_KEY")
    deep_thinking_llm = ChatOpenAI(model=config["deep_think_llm"], base_url=base_url, api_key=api_key)
    quick_thinking_llm = ChatOpenAI(model=config["quick_think_llm"], base_url=base_url, api_key=api_key)

    quick_thinking_llm.temperature = 0.5
    deep_thinking_llm.temperature = 0.5
    
    # Load example data
    with open("eval_results/ProcessDesignAgents_logs/full_states_log.json", "r") as f:
        temp_data = json.load(f)
    
    # temp_data: Dict[str, Any]= json.load("eval_results/ProcessDesignAgents_logs/full_states_log.json")
    requirement_md = temp_data.get("process_requirements", "")
    design_basis_md = temp_data.get("design_basis", "")
    flowsheet_description_md = temp_data.get("flowsheet_description", "")
    equipment_stream_template = temp_data.get("equipment_and_stream_template", "{}")
    equipment_stream_list_str = temp_data.get("equipment_and_stream_results", "{}")
    
    es_template = json.loads(equipment_stream_template)
    stream_template = {"streams": es_template["streams"] if "streams" in es_template else []}
    
    validate_stream_inputs(design_basis_md, flowsheet_description_md, json.dumps(stream_template))
    
    # ---
    # Actual workflow start from here
    # ---

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
    ]
    
    # Create agent prompt
    _, system_content, human_content = stream_calculation_prompt_with_tools(
        design_basis=design_basis_md,
        flowsheet_description=flowsheet_description_md,
        stream_list_template=json.dumps(stream_template),
    )
    
    ai_messages = run_agent_with_tools(
        llm_model=quick_thinking_llm,
        system_prompt=system_content,
        human_prompt=human_content,
        tools_list=tools_list,
        )
    
    try:
        output_str = ai_messages[-1].content
        final_json = json.loads(repair_json(output_str))
        es_foo = {
            "equipments": es_template["equipments"],
            "streams": final_json["streams"],
            }
        _, _, streams_md = equipments_and_streams_dict_to_markdown(es_foo)
        print(streams_md)
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON: {e}", flush=True)
    
    return output_str

if __name__ == "__main__":
    main()
