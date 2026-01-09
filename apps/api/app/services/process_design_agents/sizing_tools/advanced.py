from __future__ import annotations

import json
from typing import Annotated, Dict
import math

# --- Helper functions

def load_markdown_file_to_string(filepath):
    """
    Loads the content of a Markdown file into a string.

    Args:
        filepath (str): The path to the Markdown file.

    Returns:
        str: The content of the Markdown file as a string.
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            markdown_content = f.read()
        return markdown_content
    except FileNotFoundError:
        return f"Error: The file '{filepath}' was not found."
    except Exception as e:
        return f"An error occurred: {e}"
    
def calculate_lmtd(T_h_in, T_h_out, T_c_in, T_c_out, flow_type):
    """
    Calculates the Log Mean Temperature Difference (LMTD) for a heat exchanger.

    Args:
        T_h_in (float): Inlet temperature of the hot fluid.
        T_h_out (float): Outlet temperature of the hot fluid.
        T_c_in (float): Inlet temperature of the cold fluid.
        T_c_out (float): Outlet temperature of the cold fluid.
        flow_type (str): Type of flow, "parallel" or "counter".

    Returns:
        float: The calculated LMTD.
    """
    if flow_type == "parallel":
        delta_T1 = T_h_in - T_c_in
        delta_T2 = T_h_out - T_c_out
    elif flow_type == "counter":
        delta_T1 = T_h_in - T_c_out
        delta_T2 = T_h_out - T_c_in
    else:
        raise ValueError("flow_type must be either 'parallel' or 'counter'")

    # Handle the case where temperature differences are equal to avoid division by zero in the log
    if abs(delta_T1 - delta_T2) < 1e-9: # Use a small tolerance for floating point comparison
        return delta_T1
    else:
        return (delta_T1 - delta_T2) / math.log(delta_T1 / delta_T2)

#
def advanced_basic_heat_exchanger_sizing(
    basic_heat_exchanger: Annotated[Dict, {}],
    hot_stream_in: Annotated[Dict, {}],
    hot_stream_out: Annotated[Dict, {}],
    cold_stream_in: Annotated[Dict, {}],
    cold_stream_out: Annotated[Dict, {}]
) -> str:
    """
    Sizing the basic heat exchanger.
    Agrs:
        basic_heat_exchanger_sizing (Dict): the information of heat exchanger extracted from equipment list
        hot_stream_in (Dict): hot stream in data
        hot_stream_out (Dict): hot stream out data
        cold_stream_in (Dict): cold stream in data
        cold_stream_out (Dict): cold stream out data
    Returns:
        str: An update equipment sizing in JSON format.
    """
    # Todo: input valiation
    
    # For DEBUG: print all input arguments
    # print(f"DEBUG: basic_heat_exchanger: {basic_heat_exchanger}", flush=True)
    # print(f"DEBUG: hot_stream_in: {hot_stream_in}", flush=True)
    # print(f"DEBUG: hot_stream_out: {hot_stream_out}", flush=True)
    # print(f"DEBUG: cold_stream_in: {cold_stream_in}", flush=True)
    # print(f"DEBUG: cold_stream_out: {cold_stream_out}", flush=True)
    
    # Calculate LMTD
    T_hot_in = hot_stream_in.get("properties", {}).get("temperature", {}).get("value", 0.0)
    T_hot_out = hot_stream_out.get("properties", {}).get("temperature", {}).get("value", 0.0)
    T_cold_in = cold_stream_in.get("properties", {}).get("temperature", {}).get("value", 0.0)
    T_cold_out = cold_stream_out.get("properties", {}).get("temperature", {}).get("value", 0.0)
    
    lmtd_C = calculate_lmtd(T_hot_in, T_hot_out, T_cold_in, T_cold_out, "counter")
    
    duty_kW = 9999.99 # kW
    U_design = basic_heat_exchanger.get("sizing_parameters", {}).get("U-value", {}).get("value", 850.1)
    
    required_area = duty_kW / (lmtd_C * U_design)
    
    return_json = {
        "area": {"value": required_area, "unit": "m2"},
        "lmtd": {"value": lmtd_C, "unit": "°C"},
        "U_value": {"value": U_design, "unit": "W/mK"},
        "duty_kW": {"value": duty_kW, "unit": "kW"}
    }
    
    return_str = json.dumps(return_json)
    
    print(f"DEBUG: prelim_basic_heat_exchanger_sizing: {return_str}", flush=True)
    
    return return_str

def advanced_shell_and_tube_heat_exchanger_sizing(
    basic_heat_exchanger_sizing: Annotated[Dict, {}],
    hot_stream: Annotated[Dict, {}],
    cold_stream: Annotated[Dict, {}]
) -> str:
    duty_kW = basic_heat_exchanger_sizing.get("duty_kW", 0)
    
    return_json = {
        "duty_kW": duty_kW,
    }
    
    return_str = json.dumps(return_json)
    return return_str

def advanced_pressurized_vessel_sizing(
    vessel_data: Annotated[Dict, {}],
    stream_in: Annotated[Dict, {}]
) -> str:
    """
    Sizing the basic heat exchanger.
    Agrs:
        vessel_data (Dict): the information of vessel extracted from equipment list
        stream_in (Dict): process stream in data
    Returns:
        str: An update equipment sizing in JSON format.
    """
    return_json = {
        "volume": 9999.99,
    }
    
    return_str = json.dumps(return_json)
    return return_str

def advanced_vertical_pressurized_vessel_sizing(volume: str) -> str:
    return_json = {
        "volume": volume,
    }
    
    return_str = json.dumps(return_json)
    return return_str

def advanced_horizontal_pressurized_vessel_sizing(volume: str) -> str:
    return_json = {
        "volume": volume,
    }
    
    return_str = json.dumps(return_json)
    return return_str

def advanced_tank_sizing(volume: str) -> str:
    return_json = {
        "volume": volume,
    }
    
    return_str = json.dumps(return_json)
    return return_str

def advanced_pump_sizing(
    pump_data: Annotated[Dict, {}],
    stream_in: Annotated[Dict, {}],
    stream_out: Annotated[Dict, {}]
) -> str:
    """
    Sizing the basic heat exchanger.
    Agrs:
        pump_data (Dict): the information of pump extracted from equipment list
        stream_in (Dict): process stream in data
        stream_out (Dict): process stream out data
    Returns:
        str: An update equipment sizing in JSON format.
    """
    
    # Todo: input validation
    p_in_value = stream_in.get("properties", {}).get("pressure", {}).get("value", 0.0)
    p_in_unit = stream_in.get("properties", {}).get("pressure", {}).get("unit", "bar")
    p_out_value = stream_out.get("properties", {}).get("pressure", {}).get("value", 0.0)
    p_out_unit = stream_out.get("properties", {}).get("pressure", {}).get("unit", "bar")
    rho_in_value = stream_in.get("properties", {}).get("density", {}).get("value", 1000.0)
    rho_in_unit = stream_in.get("properties", {}).get("density", {}).get("unit", "kg/m3")
    
    # Calculate pump head, assump pressure in bar
    G = 9.80665 # m/s2
    pump_head = (p_out_value - p_in_value) * 100_000 / (rho_in_value * G)
    
    return_json = {
        "head": {"value": pump_head, "unit": "m"},
    }
    
    return_str = json.dumps(return_json)
    
    print(f"DEBUG: prelim_pump_sizing: {return_str}", flush=True)
    
    return return_str

def advanced_centrifugal_pump_sizing(flow_kg_hr: str) -> str:
    return_json = {
        "flow_kg_hr": flow_kg_hr,
    }
    
    return_str = json.dumps(return_json)
    return return_str

def advanced_compressor_sizing(compressor_data: Annotated[Dict, {}]) -> str:
    return_json = {
        "compressor_data": compressor_data,
    }
    
    return_str = json.dumps(return_json)
    return return_str


if __name__ == "__main__":
    markdown_file_path = "apps.api.app.services.process_design_agents/sizing_tools/static/pumps_centrifugal.md"
    markdown_content = load_markdown_file_to_string(markdown_file_path)
    print(markdown_content)
    