from __future__ import annotations

import json
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
from langchain_core.messages import AIMessage, BaseMessage, ToolMessage

# Using create_agent in langchain 1.0
from langchain.agents import create_agent
from langchain.agents.middleware import SummarizationMiddleware, HumanInTheLoopMiddleware

from processdesignagents.agents.utils.agent_states import DesignState, create_design_state
from processdesignagents.agents.utils.prompt_utils import jinja_raw
from processdesignagents.agents.utils.equipment_stream_markdown import equipments_and_streams_dict_to_markdown
from processdesignagents.agents.designers.equipment_sizing_agent import create_equipment_category_list
from processdesignagents.agents.designers.tools import equipment_sizing_prompt_with_tools, run_agent_with_tools
# Import equipment sizing tools
from processdesignagents.agents.utils.agent_sizing_tools import (
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

from processdesignagents.default_config import DEFAULT_CONFIG


config = DEFAULT_CONFIG.copy()
config["llm_provider"] = "openrouter"
config["quick_think_llm"] = "openai/gpt-5-nano"
config["deep_think_llm"] = "openai/gpt-5-nano"

# config["quick_think_llm"] = "google/gemini-2.5-flash-lite-preview-09-2025"

config["quick_think_llm"] = "x-ai/grok-4-fast"

def main():
    if config["llm_provider"].lower() == "openrouter":
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
        # requirement_md = temp_data.get("process_requirements", "")
        design_basis_md = temp_data.get("design_basis", "")
        flowsheet_description_md = temp_data.get("flowsheet_description", "")
        equipment_stream_template = temp_data.get("equipment_and_stream_template", "{}")
        equipment_stream_results_str = temp_data.get("equipment_and_stream_results", "{}")
        
        es_template = json.loads(equipment_stream_template)
        es_list = json.loads(equipment_stream_results_str)
        
        # Simulate the equipment and stram list at this stage
        es_foo = {
            "equipments": es_template["equipments"],
            "streams": es_list["streams"],
            }
        
        equipment_stream_results_str = json.dumps(es_foo)
        
        _, equipment_md, _ = equipments_and_streams_dict_to_markdown(es_foo)
        # print(equipment_md)
        
        # Create equipment category list from equipment_and_stream_list_template
        equipment_category_list = create_equipment_category_list(equipment_stream_results_str)
        
        # Print the equipment category list in the temeplate
        if "category_names" in equipment_category_list:
            print(equipment_category_list["category_names"])
            for ids in equipment_category_list["category_ids"]:
                print(f"{ids['name']} -> {', '.join(ids['id'])}")
        else:
            print("No category names found in the list.")
        
        # ---
        # Actual workflow start from here
        # ---
        
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
        
        # Create agent prompt
        _, system_content, human_content = equipment_sizing_prompt_with_tools(
            design_basis=design_basis_md,
            flowsheet_description=flowsheet_description_md,
            equipment_and_stream_results=equipment_stream_results_str,
        )
        
        # Test new run_agent_with_tools
        ai_messages = run_agent_with_tools(
            llm_model=quick_thinking_llm,
            system_prompt=system_content,
            human_prompt=human_content,
            tools_list=tools_list,
            )
        
        cleaned_content = repair_json(ai_messages[-1].content)
        print(cleaned_content)
        exit(0)
        
        # Create agent with tools list
        agent = create_agent(
            model=quick_thinking_llm,
            system_prompt=system_content,
            tools=tools_list,
        )
        
        # Run agent
        results = agent.invoke({"messages" : [{"role": "user", "content": human_content}]})
        
        # Extract AI message
        ai_message = results['messages'][-1]
        
        # Extract the AI result, expected to be JSON str
        cleaned_content = repair_json(ai_message.content)
        
        # print(f"cleaned_content: {cleaned_content}")
        
        equipment_list = json.loads(cleaned_content)
        
        # Loads JSON str and convert to markdown table for display
        combined_md, equipment_md, streams_md = equipments_and_streams_dict_to_markdown(equipment_list)
        
        print(equipment_md)
        
if __name__ == "__main__":
    main()
