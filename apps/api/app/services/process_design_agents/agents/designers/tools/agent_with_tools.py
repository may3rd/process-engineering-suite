import json
import re
from typing import Any, List

from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage, BaseMessage, ToolMessage, HumanMessage
from langchain.agents.structured_output import ToolStrategy, ProviderStrategy
from pydantic import BaseModel
# Using create_agent in langchain 1.0
from langchain.agents import create_agent

def run_agent_with_tools(
    llm_model: ChatOpenAI,
    system_prompt: str,
    human_prompt: str,
    tools_list: List[Any],
    output_schema: BaseModel = None,
) -> str:
    """
    Runs the stream calculation agent, handling tool calls and returning the final JSON output.

    Args:
        llm_model: The Language Model to use for the agent.
        system_content: The system prompt for the agent.
        human_content: The human prompt for the agent.
        tools_list: A list of tools available to the agent.

    Returns:
        A JSON string representing the final stream data list.

    Raises:
        Exception: If the agent fails to produce a valid JSON output within the maximum iterations.
    """
    
    # Create tools list to be called by agent
    # The tool map will be used to look up and invoke the correct tool by name.
    tool_map = {tool.name: tool for tool in tools_list}
    
    agent = None
    if output_schema:
        agent = create_agent(
            model=llm_model,
            system_prompt=system_prompt,
            tools=tools_list,
            # explicitly using tool strategy
            response_format=ToolStrategy(output_schema)
        )
    else:
        agent = create_agent(
            model=llm_model,
            system_prompt=system_prompt,
            tools=tools_list,
        )

    messages: List[BaseMessage] = [HumanMessage(content=human_prompt)]

    MAX_ITERATIONS = 15  # Set a reasonable limit to prevent infinite loops
    for i in range(MAX_ITERATIONS):
        print(f"--- Agent Iteration {i+1} ---", flush=True)

        response = agent.invoke({"messages": messages})

        # The last message in the result is the agent's latest response
        agent_response = response["messages"][-1]
        messages.append(agent_response) # Add agent's response to conversation history

        if isinstance(agent_response, AIMessage) and agent_response.tool_calls:
            # Agent wants to use structured tools
            print(f"Agent requested structured tool calls: {agent_response.tool_calls}", flush=True)
            for tool_call in agent_response.tool_calls:
                tool_name = tool_call["name"]
                tool_args = tool_call["args"]

                if tool_name in tool_map:
                    print(f"Executing tool: {tool_name} with args: {tool_args}", flush=True)
                    try:
                        # Execute the tool
                        tool_output = tool_map[tool_name].invoke(tool_args)
                        print(f"Tool output: {tool_output}", flush=True)
                        # Append tool output as a ToolMessage
                        messages.append(ToolMessage(
                            tool_call_id=tool_call["id"],
                            content=json.dumps(tool_output) # Ensure content is a string
                        ))
                    except Exception as e:
                        error_message = f"Error executing tool {tool_name}: {e}"
                        print(error_message, flush=True)
                        messages.append(ToolMessage(
                            tool_call_id=tool_call["id"],
                            content=json.dumps({"error": error_message})
                        ))
                else:
                    error_message = f"Tool {tool_name} not found."
                    print(error_message, flush=True)
                    messages.append(ToolMessage(
                        tool_call_id=tool_call["id"],
                        content=json.dumps({"error": error_message})
                    ))
        elif isinstance(agent_response, AIMessage) and agent_response.content:
            # Check for text-based tool calls in content
            tool_call_match = re.search(r'<xai:function_call name="(.*?)">(.*?)</xai:function_call>', agent_response.content, re.DOTALL)
            if tool_call_match:
                tool_name = tool_call_match.group(1)
                tool_args_str = tool_call_match.group(2)

                # Parse arguments from XML-like string
                tool_args = {}
                param_matches = re.findall(r'<parameter name="(.*?)">(.*?)</parameter>', tool_args_str)
                for param_name, param_value in param_matches:
                    try:
                        # Attempt to convert to float if possible, otherwise keep as string
                        tool_args[param_name] = float(param_value)
                    except ValueError:
                        tool_args[param_name] = param_value

                if tool_name in tool_map:
                    print(f"Agent requested text-based tool call: {tool_name} with args: {tool_args}", flush=True)
                    try:
                        tool_output = tool_map[tool_name].invoke(tool_args)
                        print(f"Tool output: {tool_output}", flush=True)
                        messages.append(ToolMessage(
                            tool_call_id=f"text_tool_call_{i}_{tool_name}", # Generate a unique ID
                            content=json.dumps(tool_output)
                        ))
                    except Exception as e:
                        error_message = f"Error executing text-based tool {tool_name}: {e}"
                        print(error_message, flush=True)
                        messages.append(ToolMessage(
                            tool_call_id=f"text_tool_call_{i}_{tool_name}",
                            content=json.dumps({"error": error_message})
                        ))
                else:
                    error_message = f"Text-based tool {tool_name} not found."
                    print(error_message, flush=True)
                    messages.append(ToolMessage(
                        tool_call_id=f"text_tool_call_{i}_{tool_name}",
                        content=json.dumps({"error": error_message})
                    ))
            else:
                # Agent provided a final answer (not a tool call)
                print(f"Agent provided final answer.", flush=True)
                final_answer_content = agent_response.content
                try:
                    # Attempt to repair and parse the JSON
                    # repaired_json_str = repair_json(final_answer_content)
                    # final_json = json.loads(repaired_json_str)
                    # print("\n--- Final Stream Data List JSON ---", flush=True)
                    # print(json.dumps(final_json, indent=2), flush=True)
                    # print("\n--- End of Final Stream Data List JSON ---", flush=True)
                    messages.append(AIMessage(content=final_answer_content))
                    print("DEBUG: run_agent_with_tools: Return messages to caller.")
                    return messages # Return the content
                except json.JSONDecodeError as e:
                    print(f"Error decoding final answer as JSON: {e}", flush=True)
                    print(f"Raw final answer content: {final_answer_content}", flush=True)
                    raise Exception(f"Agent failed to produce valid JSON: {e}")
        else:
            print(f"DEBUG: Agent response was not a tool call or a final answer. Type: {type(agent_response)}", flush=True)
            print(f"DEBUG: Agent response: {agent_response}", flush=True)
            raise Exception("Agent failed to produce a recognizable response.")

    raise Exception("Agent reached maximum iterations without providing a final JSON output.")
  