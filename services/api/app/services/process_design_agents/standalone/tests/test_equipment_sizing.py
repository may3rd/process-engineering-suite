from __future__ import annotations

import json
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

from processdesignagents.agents.utils.agent_sizing_tools import (
    size_heat_exchanger_basic,
    size_pump_basic
)

from processdesignagents.agents.utils.agent_states import DesignState, create_design_state
from processdesignagents.agents.utils.prompt_utils import jinja_raw
from processdesignagents.agents.utils.json_tools import (
    extract_first_json_document,
)
from processdesignagents.agents.utils.equipment_stream_markdown import equipments_and_streams_dict_to_markdown

from processdesignagents.default_config import DEFAULT_CONFIG

config = DEFAULT_CONFIG.copy()
config["llm_provider"] = "openrouter"
config["quick_think_llm"] = "openai/gpt-5-nano"
config["deep_think_llm"] = "openai/gpt-5-nano"

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
        requirement_md = temp_data.get("process_requirements", "")
        design_basis_md = temp_data.get("design_basis", "")
        flowsheet_description_md = temp_data.get("flowsheet_description", "")
        equipment_stream_list_str = temp_data.get("equipment_and_stream_results", "")
        
        # Adapt agent_state
        state = create_design_state(
            process_requirements=requirement_md,
            design_basis=design_basis_md,
            flowsheet_description=flowsheet_description_md,
            equipment_and_stream_results=equipment_stream_list_str,
        )
        
        # Todo: implement below logit to agents/designers/equipment_sizing_agent.py
        equipment_category_set = set()  # define as set
        equipment_stream_list_dict = json.loads(equipment_stream_list_str)
        
        if "equipments" in equipment_stream_list_dict:
            # Get the equipment list from master dict
            equipment_list = equipment_stream_list_dict["equipments"]
            
            # Loop throught equipment list
            for eq in equipment_list:
                equipment_category_set.add(eq.get("category", ""))
                
            equipment_category_names = list(equipment_category_set)
            
            print(equipment_category_names)
            
            equipment_category = [
                {
                    "name": name,
                    "ids": [eq.get("id", "") for eq in equipment_list if eq.get("category", "") == name]
                }
                for name in equipment_category_names
            ]
            
            for cat in equipment_category:
                print(cat)
        else:
            raise ValueError("Equipments not found")
        
        # Tools
        tools_list = [
            size_heat_exchanger_basic,
            size_pump_basic,
        ]
        
        master_equipment_list_json = json.loads(equipment_stream_list_str)
        
        for category_name in ["Heat Exchanger", "Pump"]:
            master_equipment_list_json = size_equipment_by_category(
                category_name=category_name,
                equipment_stream_list_dict=master_equipment_list_json,
                state=state,
                deep_thinking_llm=deep_thinking_llm,
                quick_thinking_llm=quick_thinking_llm,
                equipment_category=equipment_category,
                tools_list=tools_list,
            )
        
        # print(master_equipment_list_json)
        combined_md, equipment_md, streams_md = equipments_and_streams_dict_to_markdown(master_equipment_list_json)
        print(equipment_md)
        

def size_equipment_by_category(
    category_name: str,
    equipment_stream_list_dict: Dict[str, Any],
    state: Dict[str, Any],
    deep_thinking_llm: ChatOpenAI,
    quick_thinking_llm: ChatOpenAI,
    equipment_category: List[Dict[str, Any]],
    tools_list: List[Any],
) -> Dict[str, Any]:
    # Select Heat Exchanger Category for process
    if not "equipments" in equipment_stream_list_dict:
        raise ValueError("Equipments not found")
    else:
        equipment_list = equipment_stream_list_dict["equipments"]

    if not "streams" in equipment_stream_list_dict:
        raise ValueError("Streams not found")
    else:
        stream_list = equipment_stream_list_dict["streams"]

    equipment_category = next((cat for cat in equipment_category if cat.get("name", "") == category_name), None)
    
    if not equipment_category:
        print(f"{category_name} Category not found")
    else:
        equipment_ids = equipment_category.get("ids", [])
        print(f"DEBUG: {category_name} IDs: {equipment_ids}")

        tool_map = {tool.name: tool for tool in tools_list}

        base_llm_with_tools = quick_thinking_llm.bind_tools(tools_list)
        structured_enabled = True
        try:
            llm_with_tools = base_llm_with_tools.with_structured_output(
                method="json_mode",
                include_raw=True,
            )
        except (AttributeError, TypeError, ValueError, NotImplementedError):
            llm_with_tools = base_llm_with_tools
            structured_enabled = False

        def unpack_structured_result(
            output: Any,
        ) -> Tuple[BaseMessage, Optional[Any], Optional[BaseException]]:
            if isinstance(output, dict):
                raw_msg = output.get("raw")
                parsed_payload = output.get("parsed")
                parsing_error = output.get("parsing_error")
                if raw_msg is None:
                    if parsed_payload is not None:
                        if isinstance(parsed_payload, (dict, list)):
                            try:
                                raw_content = json.dumps(parsed_payload)
                            except (TypeError, ValueError):
                                raw_content = str(parsed_payload)
                        else:
                            raw_content = str(parsed_payload)
                    else:
                        raw_content = ""
                    raw_msg = AIMessage(content=raw_content)
                return raw_msg, parsed_payload, parsing_error
            if isinstance(output, BaseMessage):
                return output, None, None
            raise TypeError(
                f"Unexpected output type from llm_with_tools: {type(output)}"
            )

        def is_structured_mode_provider_error(error: Exception) -> bool:
            if not isinstance(error, ValueError):
                return False
            if not error.args:
                return False
            payload = error.args[0]
            if isinstance(payload, dict):
                code = payload.get("code")
                metadata = payload.get("metadata")
                provider = metadata.get("provider_name") if isinstance(metadata, dict) else None
                return code == 502 or provider == "Google AI Studio"
            if isinstance(payload, str):
                return "Provider returned error" in payload and "502" in payload
            return False

        def safe_invoke(messages: List[BaseMessage]) -> Any:
            nonlocal llm_with_tools, structured_enabled
            try:
                return llm_with_tools.invoke(messages)
            except Exception as exc:
                if structured_enabled and is_structured_mode_provider_error(exc):
                    llm_with_tools = base_llm_with_tools
                    structured_enabled = False
                    return llm_with_tools.invoke(messages)
                raise
        
        for eq_id in equipment_ids:
            # Get the equipment element from equipment list
            eq_json = next(
                (eq for eq in equipment_list if eq.get("id", "") == eq_id),
                None
            )
            if not eq_json:
                raise ValueError(f"Equipment with ID {eq_id} not found")
            
            print(f"DEBUG: Processing {eq_id}: {eq_json.get('name', '')}")
            
            base_prompt = equipment_sizing_prompt_with_tools(
                stream_data_json=json.dumps(stream_list),
                equipment_data_json=json.dumps(eq_json)
            )
            
            prompt = ChatPromptTemplate.from_messages(base_prompt.messages)
            conversation = list(state.get("messages", []))
            conversation.extend(prompt.format_messages())

            result = safe_invoke(conversation)
            result_message, parsed_payload, parsing_error = unpack_structured_result(result)
            conversation.append(result_message)

            safety_counter = 0
            max_iterations = 5

            while getattr(result_message, "tool_calls", []) and safety_counter < max_iterations:
                for call in result_message.tool_calls:
                    tool_handler = tool_map.get(call["name"])
                    if tool_handler is None:
                        error_msg = (
                            f"Tool '{call['name']}' not available. "
                            "Returning message for LLM handling."
                        )
                        conversation.append(
                            ToolMessage(content=error_msg, tool_call_id=call["id"])
                        )
                        continue

                    tool_result = tool_handler.invoke(call["args"])
                    if not isinstance(tool_result, str):
                        try:
                            tool_result = json.dumps(tool_result)
                        except (TypeError, ValueError):
                            tool_result = str(tool_result)

                    conversation.append(
                        ToolMessage(content=tool_result, tool_call_id=call["id"])
                    )

                result = safe_invoke(conversation)
                result_message, parsed_payload, parsing_error = unpack_structured_result(result)
                conversation.append(result_message)
                safety_counter += 1

            # print(f"DEBUG: {result_message[:80]})
            
            if structured_enabled and parsed_payload is not None and parsing_error is None:
                if isinstance(parsed_payload, (dict, list)):
                    try:
                        report = json.dumps(parsed_payload)
                    except (TypeError, ValueError):
                        report = str(parsed_payload)
                else:
                    report = str(parsed_payload)
            else:
                report = result_message.content if getattr(result_message, "content", None) else ""
                if report:
                    raw_json, _ = extract_first_json_document(report)
                    if raw_json:
                        report = raw_json.strip()
                    closing_brace = report.rfind("}")
                    closing_bracket = report.rfind("]")
                    closing_index = max(closing_brace, closing_bracket)
                    if closing_index != -1:
                        report = report[: closing_index + 1]
                else:
                    report = '{"message":"error"}'

            state["messages"] = conversation

            # print(f"DEBUG: id = {eq_id}, report = {report}")
            
            # Update the equipment for processed equipment in the master equipment list table
            updated_payload = json.loads(report)
            if isinstance(updated_payload, list):
                updated_payload = next(
                    (item for item in updated_payload if item.get("id") == eq_id),
                    None,
                )

            if not isinstance(updated_payload, dict):
                raise ValueError(
                    f"Expected dict for equipment '{eq_id}', received {type(updated_payload)}"
                )

            for eq in equipment_stream_list_dict.get("equipments", []):
                # print(f"DEBUG: {eq.get('id', '')} == {eq_id}")
                if eq.get("id", "") == eq_id:
                    equipment_stream_list_dict["equipments"].remove(eq)
                    equipment_stream_list_dict["equipments"].append(updated_payload)
                    break
            # print(f"---")
    # print(equipment_stream_list_dict)
    return equipment_stream_list_dict

def equipment_sizing_prompt_with_tools(
    stream_data_json: str,
    equipment_data_json: str,
) -> ChatPromptTemplate:
    """Create prompt with pre-computed tool results"""
    
    system_content = f"""
You are a **Lead Equipment Sizing Engineer** responsible for finalizing equipment specifications using automated sizing tools.

**Context:**

  * You have access to sizing calculations tools (heat exchangers, pumps, vessels, compressors).
  * Your task is to use these tools to fill in the missing values in the final equipment specification JSON, adding engineering judgment and filling gaps where tools could not be applied.
  * I want the equipment list with the upadte sizing_parameter of the equipment provided from user.
  
**Tool Available:** `size_heat_exchanger_basic`, `size_pump_basic`, `size_vessel_basic`, `size_compressor_basic`.

**Instructions:**

  1. **Use Sizing Tool:** to calculate the equipment specification values.
  
  2. **Populate Sizing Parameters:** Use tool results to fill the `sizing_parameters` array. For example:
     - Heat Exchanger: ["Area: <area_m2> m²", "LMTD: <lmtd_C> °C", "U: <U_design_W_m2K> W/m²·K"]
     - Pump: ["Flow: <flow_m3_hr> m³/h", "Head: <total_head_m> m", "Power: <motor_rating_kW> kW"]
     - Vessel: ["Diameter: <diameter_mm> mm", "Length: <length_mm> mm", "Thickness: <shell_thickness_mm> mm"]
     - Compressor: ["Stages: <number_of_stages>", "Power: <driver_rating_kW> kW", "Discharge Temp: <discharge_temperature_C> °C"]
  
  3. **Update Duty/Load Field:** Replace placeholder values with calculated duties (e.g., "21.7 MW" for heat exchanger, "45 kW" for pump motor).
  
  4. **Document in Notes:** Reference the tool used and key assumptions. Example: "Sized using heat_exchanger_sizing tool with LMTD method. U-value estimated at 850 W/m²·K for hydrocarbon/water service."
  
  5. **Handle Missing Tool Results:** For equipment without tool results (columns, special equipment), use engineering judgment and the stream data to provide reasonable estimates or mark as "TBD".
  
  6. **Update Assumptions:** Add any new global assumptions to `metadata.assumptions`, such as "All pump efficiencies assumed at 75% unless specified."

  7. **Maintain JSON Structure:** Output ONLY a valid JSON object matching the equipment template schema. Do NOT use code fences.
  
  8. **Update the Equipment List:** Use the results from the tool to update the equipment list.

```

**Critical Rules:**

  - All numeric values must have units
  - Round to appropriate precision (areas to 0.1 m², power to nearest kW)
  - Reference tool usage in notes for traceability
  - If tool result contains "error", note the issue and provide manual estimate or "TBD"
  - **Output ONLY the final equipment list JSON object (no code fences, no additional text).**
"""

    human_content = f"""
# DATA FOR ANALYSIS:
---
**Stream Data (JSON):**
{stream_data_json}

**Equipment Template (JSON):**
{equipment_data_json}

---

**Output ONLY the final equipment list with updated sizing parameters (JSON): object (no code fences, no additional text).**

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


if __name__ == "__main__":
    main()
