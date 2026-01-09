from __future__ import annotations

import json
import math
from typing import Dict, List, Any, Optional
import CoolProp.CoolProp as CP # Import CoolProp
from langchain_core.tools import tool # Import LangChain tool decorator

from .unit_converter.unit_converter.converter import convert, converts

# ============================================================================
# Helper Functions with CoolProp Integration
# ============================================================================

# Map common/alias names to CoolProp canonical fluid names (case-insensitive keys)
COOLPROP_NAME_MAP = {
    # Water
    "water": "Water",
    "h2o": "Water",
    "steam": "Water",
    "r718": "Water",  # per CoolProp alias

    # Air
    "air": "Air",
    "r729": "Air",

    # Nitrogen
    "nitrogen": "Nitrogen",
    "n2": "Nitrogen",
    "r728": "Nitrogen",

    # Oxygen
    "oxygen": "Oxygen",
    "o2": "Oxygen",
    "r732": "Oxygen",

    # Argon
    "argon": "Argon",
    "ar": "Argon",
    "r740": "Argon",

    # Carbon dioxide
    "carbon_dioxide": "CarbonDioxide",
    "carbon dioxide": "CarbonDioxide",
    "co2": "CarbonDioxide",
    "r744": "CarbonDioxide",

    # Carbon monoxide
    "carbon_monoxide": "CarbonMonoxide",
    "carbon monoxide": "CarbonMonoxide",
    "co": "CarbonMonoxide",

    # Hydrogen (normal)
    "hydrogen": "Hydrogen",
    "h2": "Hydrogen",
    "r702": "Hydrogen",

    # Helium (common in labs/cryogenics)
    "helium": "Helium",
    "he": "Helium",

    # Methane / Natural gas stand-in
    "methane": "Methane",
    "ch4": "Methane",
    "natural_gas": "Methane",    # engineering approximation

    # Ethane / Ethylene / Propane / Propylene
    "ethane": "Ethane",
    "c2h6": "Ethane",
    "ethylene": "Ethylene",
    "c2h4": "Ethylene",
    "propane": "Propane",
    "c3h8": "Propane",
    "propylene": "Propylene",
    "propene": "Propylene",
    "c3h6": "Propylene",

    # Alcohols
    "ethanol": "Ethanol",
    "c2h5oh": "Ethanol",
    "alcohol": "Ethanol",  # common shorthand -> pick ethanol
    "methanol": "Methanol",
    "ch3oh": "Methanol",

    # Aromatics / others frequently used
    "toluene": "Toluene",
    "benzene": "Benzene",

    # Ammonia (refrig. R717)
    "ammonia": "Ammonia",
    "nh3": "Ammonia",
    "r717": "Ammonia",

    # Hydrogen sulfide & chloride (common process gases)
    "hydrogen_sulfide": "HydrogenSulfide",
    "hydrogen sulfide": "HydrogenSulfide",
    "h2s": "HydrogenSulfide",
    "hydrogen_chloride": "HydrogenChloride",
    "hydrogen chloride": "HydrogenChloride",
    "hcl": "HydrogenChloride",

    # Nitrous oxide
    "nitrous_oxide": "NitrousOxide",
    "nitrous oxide": "NitrousOxide",
    "n2o": "NitrousOxide",

    # Engineering approximations for complex liquids (no pure-fluid model in CoolProp)
    "crude_oil": "n-Dodecane",   # rough stand-in for heavy hydrocarbon liquid
    "naphtha": "n-Heptane",      # rough stand-in for light naphtha cut

    # Glycols (CoolProp incompressibles require the INCOMP:: prefix)
    # Pure ethylene glycol as incompressible:
    "ethylene_glycol": "INCOMP::MEG",
    "meg": "INCOMP::MEG",
    "monoethylene_glycol": "INCOMP::MEG",

    # If you want common refrigerants too (examples):
    "r134a": "R134a",
    "r32": "R32",
    "r410a": "R410A",
    "r404a": "R404A",
    "r507a": "R507A",
}

NON_COOLPROP_NAMES = {
    # Name: [ID, MW, NBP]
    "mea": ["MEA", 61.08, 170],
    "monoethanolamine": ["MEA", 61.08, 170],
    "dea": ["DEA", 105.14, 268.8],
    "diethanolamine": ["DEA", 105.14, 268.8],
    "mdea": ["MDEA", 119.163, 247],
    "methyldiethanolamine": ["MDEA", 119.163, 247],
    "Hexamethylcyclotrisiloxane": ["D3", 222.462, 134]
}

def _debug_tool_call(tool_name: str) -> None:
    print(f"DEBUG: Stream Calculation Tool '{tool_name}' invoked", flush=True)


def _get_coolprop_name(user_name: str) -> str:
    """Gets the CoolProp internal name for a given user-friendly name."""
    return COOLPROP_NAME_MAP.get(user_name.lower(), user_name)  # Return original if not mapped


def _get_mw_kg_kmol(component_name: str) -> float:
    """Looks up molecular weight using CoolProp and returns in kg/kmol."""
    cp_name = _get_coolprop_name(component_name)
    try:
        # CoolProp 'M' returns molar mass in kg/mol
        mw_kg_mol = CP.PropsSI('M', cp_name)
        return mw_kg_mol * 1000.0  # Convert kg/mol to kg/kmol
    except ValueError:
        print(
            f"Warning: Could not find molecular weight for '{component_name}' (CoolProp name: '{cp_name}'). Find in other list.", flush=True)
        if NON_COOLPROP_NAMES.get(cp_name.lower(), None):
            return NON_COOLPROP_NAMES[cp_name][1]
        else:
            print(
                f"Warning: {cp_name} is not in the NON_COOLPROP_NAMES dictionary.", flush=True)
            return 0.0  # Indicate error or unknown

def _calculate_avg_mw_molar(compositions_molar: Dict[str, Dict[str, Any]]) -> float:
    """Calculates average molecular weight from molar fractions using CoolProp MWs."""
    avg_mw = 0.0
    total_frac = 0.0
    for comp, data in compositions_molar.items():
        # Exclude mass fraction keys if present
        if not comp.startswith("m_") and data.get("unit") == "molar fraction":
            mw = _get_mw_kg_kmol(comp)
            if mw == 0.0: return 0.0 # Error upstream
            frac = data.get("value", 0.0)
            avg_mw += frac * mw
            total_frac += frac
    # Normalize in case fractions don't sum exactly to 1
    # Check for zero total fraction to avoid division by zero
    if total_frac == 0:
        print("Warning: Total molar fraction is zero in _calculate_avg_mw_molar.", flush=True)
        return 0.0
    return avg_mw / total_frac

def _calculate_avg_mw_mass(compositions_mass: Dict[str, Dict[str, Any]]) -> float:
    """Calculates average molecular weight from mass fractions using CoolProp MWs."""
    inv_avg_mw = 0.0
    total_frac = 0.0
    for comp, data in compositions_mass.items():
         # Look for mass fraction keys (e.g., "m_Ethanol")
        if comp.startswith("m_") and data.get("unit") == "mass fraction":
            base_comp_name = comp[2:] # Remove "m_"
            mw = _get_mw_kg_kmol(base_comp_name)
            if mw == 0.0: return 0.0 # Error upstream
            frac = data.get("value", 0.0)
            inv_avg_mw += frac / mw # wi / Mwi
            total_frac += frac

    if inv_avg_mw == 0:
        print("Warning: Sum(wi/Mwi) is zero in _calculate_avg_mw_mass.", flush=True)
        return 0.0

    avg_mw = 1.0 / inv_avg_mw
    # Normalization check - if total_frac is significantly different from 1, warn
    # if not math.isclose(total_frac, 1.0, abs_tol=1e-4):
    #      print(f"Warning: Input mass fractions sum to {total_frac} in _calculate_avg_mw_mass.")
    return avg_mw


def _convert_molar_to_mass_frac(compositions_molar: Dict[str, Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """Converts molar fractions to mass fractions using CoolProp MWs."""
    mass_fractions = {}
    avg_mw = _calculate_avg_mw_molar(compositions_molar)
    if avg_mw == 0:
        print("Error: Average MW is zero in _convert_molar_to_mass_frac.", flush=True)
        return {} # Cannot convert without avg MW

    for comp, data in compositions_molar.items():
         # Exclude mass fraction keys if present
        if not comp.startswith("m_") and data.get("unit") == "molar fraction":
            molar_frac = data.get("value", 0.0)
            mw = _get_mw_kg_kmol(comp)
            if mw == 0.0:
                 print(f"Error: MW is zero for {comp} in _convert_molar_to_mass_frac.", flush=True)
                 return {} # Error getting MW
            mass_frac = (molar_frac * mw) / avg_mw
            mass_key = f"m_{comp}"
            mass_fractions[mass_key] = {"value": mass_frac, "unit": "mass fraction"}

    # --- Verification ---
    total_mass_frac = sum(d.get('value', 0.0) for d in mass_fractions.values())
    if not math.isclose(total_mass_frac, 1.0, abs_tol=1e-4):
        print(f"Warning: Calculated mass fractions sum to {total_mass_frac} in _convert_molar_to_mass_frac.", flush=True)
        # Re-normalize if significantly off and needed
        if total_mass_frac > 0:
            for key in mass_fractions:
                mass_fractions[key]["value"] /= total_mass_frac

    return mass_fractions

def _convert_mass_to_molar_frac(compositions_mass: Dict[str, Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """Converts mass fractions to molar fractions using CoolProp MWs."""
    molar_fractions = {}
    avg_mw = _calculate_avg_mw_mass(compositions_mass) # Need average MW based on mass fractions
    if avg_mw == 0:
        print("Error: Average MW is zero in _convert_mass_to_molar_frac.", flush=True)
        return {}

    for comp, data in compositions_mass.items():
        if comp.startswith("m_") and data.get("unit") == "mass fraction":
            mass_frac = data.get("value", 0.0)
            base_comp_name = comp[2:]
            mw = _get_mw_kg_kmol(base_comp_name)
            if mw == 0.0:
                 print(f"Error: MW is zero for {base_comp_name} in _convert_mass_to_molar_frac.", flush=True)
                 return {} # Error getting MW
            # molar_frac = mass_frac / mw / sum(wi / Mwi) = mass_frac / mw * avg_mw
            molar_frac = (mass_frac / mw) * avg_mw
            molar_fractions[base_comp_name] = {"value": molar_frac, "unit": "molar fraction"}

    # --- Verification ---
    total_molar_frac = sum(d.get('value', 0.0) for d in molar_fractions.values())
    if not math.isclose(total_molar_frac, 1.0, abs_tol=1e-4):
        print(f"Warning: Calculated molar fractions sum to {total_molar_frac} in _convert_mass_to_molar_frac.", flush=True)
         # Re-normalize if significantly off and needed
        if total_molar_frac > 0:
            for key in molar_fractions:
                molar_fractions[key]["value"] /= total_molar_frac

    return molar_fractions

def _get_phase_string(phase_index: int) -> str:
    """Maps CoolProp phase index to a descriptive string."""
    # From CoolProp documentation (may vary slightly by version)
    phase_map = {
        0: "Liquid",
        1: "Supercritical",
        2: "Supercritical_Gas", # Treat as Vapor
        3: "Supercritical_Liquid", # Treat as Liquid
        4: "Critical_Point",
        5: "Gas", # Treat as Vapor
        6: "Vapor", # Treat as Vapor
        7: "TwoPhase", # Saturation / Mixture
        8: "Unknown",
        9: "Not Imposed"
    }
    phase_string = phase_map.get(phase_index, "Unknown")
    # Simplify common cases for process simulation context
    if phase_string in ["Gas", "Supercritical_Gas", "Vapor"]:
        return "Vapor"
    if phase_string in ["Liquid", "Supercritical_Liquid"]:
        return "Liquid"
    if phase_string == "TwoPhase":
        return "TwoPhase" # Explicitly state if it's a mix
    if phase_string == "Critical_Point":
        return "Critical" # Explicit state
    return phase_string # Return others like Supercritical, Unknown directly

# ============================================================================
# Stream Calculation Tools (Using CoolProp Helpers & LangChain Decorator)
# ============================================================================

@tool
def unit_converts(
    original_value_with_unit: str,
    target_unit: str
) -> str:
    """
    Converts a value from one unit to another.
    Args:
        original_value_with_unit:
        target_unit:
    Returns:
        JSON string: {"value": float, "unit": str} or {"error": str}.
    """
    _debug_tool_call("unit_converts")
    try:
        # Input validation
        if not original_value_with_unit or not target_unit:
            return json.dumps({"error": "Input values cannot be empty."})

        target_value = converts(original_value_with_unit, target_unit)
        
        if target_value is None:
            return json.dumps({"error": "Conversion failed."})

        return json.dumps({"value": float(target_value), "unit": target_unit})
    except:
        # Return original if failed
        return json.dumps({"error": "Conversion failed."})

@tool
def calculate_molar_flow_from_mass(
    mass_flow_kg_h: float,
    compositions: Dict[str, Dict[str, Any]],
    composition_type: str = "molar" # "molar" or "mass"
) -> str:
    """
    Calculates molar flow from mass flow using composition (with CoolProp MWs).
    Args:
        mass_flow_kg_h: Mass flow rate in kg/h.
        compositions: Dictionary of compositions (either molar or mass fractions).
                      Keys are component names (e.g., "Ethanol") for molar,
                      or prefixed with "m_" (e.g., "m_Ethanol") for mass.
                      Each value is {"value": float, "unit": "molar fraction" | "mass fraction"}.
        composition_type: Specifies whether the input 'compositions' dict uses "molar" or "mass" fractions.
    Returns:
        JSON string: {"molar_flow_kmol_h": float, "average_mw_kg_kmol": float} or {"error": str}.
    """
    _debug_tool_call("calculate_molar_flow_from_mass")
    try:
        # Input validation
        if mass_flow_kg_h < 0:
            return json.dumps({"error": "Mass flow rate cannot be negative."})
        if not compositions:
            return json.dumps({"error": "Compositions dictionary cannot be empty."})

        if composition_type.lower() == "molar":
            avg_mw = _calculate_avg_mw_molar(compositions)
        elif composition_type.lower() == "mass":
            avg_mw = _calculate_avg_mw_mass(compositions)
        else:
            return json.dumps({"error": "Invalid composition_type. Use 'molar' or 'mass'."})

        if avg_mw <= 0:
            return json.dumps({"error": "Could not calculate average molecular weight. Check compositions and if components are known to CoolProp."})

        molar_flow_kmol_h = mass_flow_kg_h / avg_mw
        results = {
            "molar_flow_kmol_h": round(molar_flow_kmol_h, 4),
            "average_mw_kg_kmol": round(avg_mw, 4)
        }
        return json.dumps(results)
    except Exception as e:
        return json.dumps({"error": f"Error calculating molar flow: {e}"})

@tool
def calculate_mass_flow_from_molar(
    molar_flow_kmol_h: float,
    compositions: Dict[str, Dict[str, Any]],
    composition_type: str = "molar" # "molar" or "mass"
) -> str:
    """
    Calculates mass flow from molar flow using composition (with CoolProp MWs).
    Args:
        molar_flow_kmol_h: Molar flow rate in kmol/h.
        compositions: Dictionary of compositions (either molar or mass fractions).
        composition_type: Specifies whether the input 'compositions' dict uses "molar" or "mass" fractions.
    Returns:
        JSON string: {"mass_flow_kg_h": float, "average_mw_kg_kmol": float} or {"error": str}.
    """
    _debug_tool_call("calculate_mass_flow_from_molar")
    try:
         # Input validation
        if molar_flow_kmol_h < 0:
            return json.dumps({"error": "Molar flow rate cannot be negative."})
        if not compositions:
            return json.dumps({"error": "Compositions dictionary cannot be empty."})

        if composition_type.lower() == "molar":
            avg_mw = _calculate_avg_mw_molar(compositions)
        elif composition_type.lower() == "mass":
            avg_mw = _calculate_avg_mw_mass(compositions)
        else:
            return json.dumps({"error": "Invalid composition_type. Use 'molar' or 'mass'."})

        if avg_mw <= 0:
            return json.dumps({"error": "Could not calculate average molecular weight. Check compositions and CoolProp."})

        mass_flow_kg_h = molar_flow_kmol_h * avg_mw
        results = {
            "mass_flow_kg_h": round(mass_flow_kg_h, 4),
            "average_mw_kg_kmol": round(avg_mw, 4)
        }
        return json.dumps(results)
    except Exception as e:
        return json.dumps({"error": f"Error calculating mass flow: {e}"})

@tool
def convert_compositions(
    compositions: Dict[str, Dict[str, Any]],
    input_type: str, # "molar" or "mass"
    output_type: str # "molar" or "mass"
) -> str:
    """
    Converts between molar and mass fraction dictionaries (using CoolProp MWs).
    Args:
        compositions: Dictionary of compositions (input_type fractions).
        input_type: Type of the input fractions ("molar" or "mass").
        output_type: Desired type of the output fractions ("molar" or "mass").
    Returns:
        JSON string: Dictionary containing BOTH original and converted fractions or {"error": str}.
    """
    _debug_tool_call("convert_compositions")
    try:
        if not compositions:
            return json.dumps({"error": "Input compositions dictionary is empty."})

        input_type = input_type.lower()
        output_type = output_type.lower()

        if input_type == output_type:
            # Even if no conversion needed, ensure structure is right
            # Maybe validate fractions sum to 1?
            return json.dumps(compositions)

        converted_comps = {}
        if input_type == "molar" and output_type == "mass":
            # Filter out any pre-existing mass fractions before converting
            molar_only = {k: v for k, v in compositions.items() if not k.startswith("m_") and v.get("unit") == "molar fraction"}
            if not molar_only: return json.dumps({"error": f"Input compositions dictionary does not contain molar fractions required for conversion to {output_type}."})
            converted_comps = _convert_molar_to_mass_frac(molar_only)
        elif input_type == "mass" and output_type == "molar":
            # Filter out any pre-existing molar fractions before converting
            mass_only = {k: v for k, v in compositions.items() if k.startswith("m_") and v.get("unit") == "mass fraction"}
            if not mass_only: return json.dumps({"error": f"Input compositions dictionary does not contain mass fractions required for conversion to {output_type}."})
            converted_comps = _convert_mass_to_molar_frac(mass_only)
        else:
            return json.dumps({"error": "Invalid input_type or output_type. Use 'molar' or 'mass'."})

        if not converted_comps:
             # Errors inside helpers should print warnings/errors
             return json.dumps({"error": "Conversion failed. Check input compositions and ensure components are known to CoolProp."})

        # Combine original and converted fractions, overwriting only if necessary
        results = compositions.copy()
        results.update(converted_comps) # Update adds new keys and overwrites existing ones

        # Final check if both types are now present
        has_molar = any(not k.startswith("m_") and v.get("unit") == "molar fraction" for k, v in results.items())
        has_mass = any(k.startswith("m_") and v.get("unit") == "mass fraction" for k, v in results.items())

        if not (has_molar and has_mass):
            # This is less of a warning and more indicates incomplete input or partial failure
            print(f"INFO: Conversion result might be incomplete (missing molar or mass part). Result: {results}", flush=True)


        return json.dumps(results)

    except Exception as e:
        return json.dumps({"error": f"Error converting compositions: {e}"})


@tool
def calculate_volume_flow(
    mass_flow_kg_h: float,
    density_kg_m3: float
) -> str:
    """
    Calculates volume flow rate from mass flow rate and density.
    Args:
        mass_flow_kg_h: Mass flow rate in kg/h.
        density_kg_m3: Density in kg/m³.
    Returns:
        JSON string: {"volume_flow_m3_h": float} or {"error": str}.
    """
    _debug_tool_call("calculate_volume_flow")
    if mass_flow_kg_h < 0:
        return json.dumps({"error": "Mass flow rate cannot be negative."})
    if density_kg_m3 <= 0:
        return json.dumps({"error": "Density must be positive."})
    try:
        volume_flow_m3_h = mass_flow_kg_h / density_kg_m3
        return json.dumps({"volume_flow_m3_h": round(volume_flow_m3_h, 4)})
    except ZeroDivisionError:
         return json.dumps({"error": "Density cannot be zero."})
    except Exception as e:
        return json.dumps({"error": f"Error calculating volume flow: {e}"})

@tool
def perform_mass_balance_split(
    inlet_mass_flow_kg_h: float,
    split_fractions: List[float],
    outlet_stream_ids: List[str]
) -> str:
    """
    Calculates outlet mass flows for a stream splitter.
    Args:
        inlet_mass_flow_kg_h: Mass flow rate of the inlet stream.
        split_fractions: List of fractions (0.0-1.0) for each outlet stream. Must sum to 1.0.
        outlet_stream_ids: List of IDs corresponding to the split fractions.
    Returns:
        JSON string: {"outlet_flows": {"stream_id_1": mass_flow_1, ...}} or {"error": str}.
    """
    _debug_tool_call("perform_mass_balance_split")
    if inlet_mass_flow_kg_h < 0:
         return json.dumps({"error": "Inlet mass flow cannot be negative."})
    if len(split_fractions) != len(outlet_stream_ids):
        return json.dumps({"error": "Number of fractions must match number of outlet IDs."})
    if not outlet_stream_ids:
         return json.dumps({"error": "Outlet stream IDs list cannot be empty."})

    # Check and normalize split fractions
    current_sum = sum(split_fractions)
    if not math.isclose(current_sum, 1.0, abs_tol=1e-6):
        if abs(current_sum - 1.0) > 0.001: # Use a slightly larger tolerance for error
            return json.dumps({"error": f"Split fractions sum to {current_sum:.4f}, but must sum to 1.0."})
        elif current_sum > 0 : # Normalize if slightly off and possible
            print(f"Warning: Normalizing split fractions sum from {current_sum:.4f} to 1.0.", flush=True)
            split_fractions = [f / current_sum for f in split_fractions]
        else:
             return json.dumps({"error": "Split fractions sum to zero, cannot normalize."})


    if any(f < 0 or f > 1 for f in split_fractions): # Check again after potential normalization
        return json.dumps({"error": "Split fractions must be between 0.0 and 1.0."})

    try:
        outlet_flows = {}
        for i, stream_id in enumerate(outlet_stream_ids):
            # Ensure no negative flows due to rounding if normalized
            calculated_flow = max(0.0, inlet_mass_flow_kg_h * split_fractions[i])
            outlet_flows[stream_id] = round(calculated_flow, 4)
        return json.dumps({"outlet_flows": outlet_flows})
    except Exception as e:
        return json.dumps({"error": f"Error during split calculation: {e}"})

@tool
def perform_mass_balance_mix(
    inlet_mass_flows_kg_h: Dict[str, float] # {"stream_id_1": flow1, ...}
) -> str:
    """
    Calculates the outlet mass flow for a stream mixer.
    Args:
        inlet_mass_flows_kg_h: Dictionary mapping inlet stream IDs to their mass flows (kg/h).
    Returns:
        JSON string: {"outlet_mass_flow_kg_h": float} or {"error": str}.
    """
    _debug_tool_call("perform_mass_balance_mix")
    if not inlet_mass_flows_kg_h:
        return json.dumps({"error": "Inlet mass flows dictionary cannot be empty."})
    if any(flow < 0 for flow in inlet_mass_flows_kg_h.values()):
        return json.dumps({"error": "Inlet mass flows cannot be negative."})
    try:
        outlet_mass_flow_kg_h = sum(inlet_mass_flows_kg_h.values())
        return json.dumps({"outlet_mass_flow_kg_h": round(outlet_mass_flow_kg_h, 4)})
    except Exception as e:
        return json.dumps({"error": f"Error during mix calculation: {e}"})

@tool
def perform_energy_balance_mix(
    inlet_flows_temps: Dict[str, Dict[str, float]], # {"id1": {"mass_flow": f1, "temp": t1}, ...}
    outlet_mass_flow_kg_h: float,
    specific_heat_kj_kg_k: float # Assume constant Cp for mixture
) -> str:
    """
    Calculates the outlet temperature for an adiabatic mixer.
    Args:
        inlet_flows_temps: Dict mapping inlet stream IDs to {"mass_flow": kg/h, "temp": °C}.
        outlet_mass_flow_kg_h: Total outlet mass flow (kg/h, previously calculated).
        specific_heat_kj_kg_k: Average specific heat of the mixture (kJ/kg-K). Assume constant.
    Returns:
        JSON string: {"outlet_temperature_c": float} or {"error": str}.
    """
    _debug_tool_call("perform_energy_balance_mix")
    if not inlet_flows_temps:
         return json.dumps({"error": "Inlet flows/temps dictionary cannot be empty."})
    try:
        # Check for zero or negative values before division
        if outlet_mass_flow_kg_h <= 0:
            # Handle case where inlets might be zero flow
            if all(d.get("mass_flow", 0.0) == 0.0 for d in inlet_flows_temps.values()):
                 # If all inlets are zero, outlet is zero. Find a representative inlet temp or default.
                 # Taking the first temperature might be misleading if streams exist but have 0 flow.
                 # Find the temp of a stream that actually has flow, or default to 0/None if all are zero.
                 non_zero_temps = [d.get("temp") for d in inlet_flows_temps.values() if d.get("mass_flow", 0.0) > 0]
                 first_temp = non_zero_temps[0] if non_zero_temps and non_zero_temps[0] is not None else 0.0
                 print(f"Warning: Outlet mass flow is zero in energy balance mix. Setting outlet temp based on inlets: {first_temp}", flush=True)
                 return json.dumps({"outlet_temperature_c": round(first_temp, 2)})
            else:
                 # This case (positive inlets, zero outlet) implies an error in the mass balance call.
                 return json.dumps({"error": "Outlet mass flow is zero or negative, but inlet flows are positive. Inconsistent mass balance."})

        if specific_heat_kj_kg_k <= 0:
            return json.dumps({"error": "Specific heat must be positive."})

        # Sum(m_i * T_i) / Sum(m_i)
        numerator = 0.0
        denominator = 0.0 # Recalculate denominator for safety and accuracy
        for stream_id, data in inlet_flows_temps.items():
            mass_flow = data.get("mass_flow", 0.0)
            if mass_flow < 0: raise ValueError(f"Inlet mass flow cannot be negative for stream {stream_id}.")
            temp_c = data.get("temp")
            if temp_c is None: raise ValueError(f"Missing temperature for inlet stream {stream_id}")

            numerator += mass_flow * temp_c
            denominator += mass_flow

        # Verify denominator matches outlet_mass_flow_kg_h closely
        if not math.isclose(denominator, outlet_mass_flow_kg_h, rel_tol=1e-5):
             print(f"Warning: Sum of inlet flows ({denominator:.4f}) does not match provided outlet flow ({outlet_mass_flow_kg_h:.4f}) in energy balance. Using sum of inlets.", flush=True)
             if denominator <= 0: # Avoid division by zero if recalculation resulted in zero
                  return json.dumps({"error":"Recalculated total inlet mass flow is zero for energy balance."})
             # Use the calculated denominator for consistency
             outlet_mass_flow_kg_h = denominator

        outlet_temperature_c = numerator / outlet_mass_flow_kg_h
        return json.dumps({"outlet_temperature_c": round(outlet_temperature_c, 2)})

    except ZeroDivisionError: # Should be caught by outlet_mass_flow_kg_h check
        return json.dumps({"error": "Division by zero during energy balance mix."})
    except ValueError as ve:
         return json.dumps({"error": str(ve)})
    except Exception as e:
        return json.dumps({"error": f"Error during energy balance mix: {e}"})

@tool
def calculate_heat_exchanger_outlet_temp(
    duty_kw: float,
    mass_flow_kg_h: float,
    specific_heat_kj_kg_k: float,
    inlet_temp_c: float,
    # is_heating: bool # DEPRECATED
) -> str:
    """
    Calculates the outlet temperature of a stream passing through a heat exchanger.
    Args:
        duty_kw: Heat duty transferred TO(+) or FROM(-) the stream in kW.
                 Convention: Positive duty heats the stream, Negative duty cools it.
        mass_flow_kg_h: Mass flow rate of the stream (kg/h).
        specific_heat_kj_kg_k: Specific heat capacity of the stream (kJ/kg-K).
        inlet_temp_c: Inlet temperature of the stream in °C.
    Returns:
        JSON string: {"outlet_temperature_c": float} or {"error": str}.
    """
    _debug_tool_call("calculate_heat_exchanger_outlet_temp")
    try:
        if mass_flow_kg_h <= 0:
            # Handle zero flow case: Temp out = Temp in
            if mass_flow_kg_h == 0:
                 # If duty is non-zero with zero flow, it's inconsistent.
                 if not math.isclose(duty_kw, 0.0, abs_tol=1e-6):
                     print(f"Warning: Non-zero duty ({duty_kw} kW) specified for zero mass flow. Outlet temp set to inlet temp.", flush=True)
                 return json.dumps({"outlet_temperature_c": round(inlet_temp_c, 2)})
            else: return json.dumps({"error": "Mass flow must be non-negative."})

        if specific_heat_kj_kg_k <= 0:
             return json.dumps({"error": "Specific heat must be positive."})

        # Q = m * Cp * deltaT => deltaT = Q / (m * Cp)
        # Q (kW) = Q (kJ/s)
        # m (kg/h) -> m (kg/s) = m / 3600
        # Cp (kJ/kg-K)
        # deltaT = Q(kJ/s) / ( (m/3600)(kg/s) * Cp(kJ/kg-K) ) = (Q * 3600) / (m * Cp)
        delta_T = (duty_kw * 3600.0) / (mass_flow_kg_h * specific_heat_kj_kg_k)

        outlet_temperature_c = inlet_temp_c + delta_T # duty_kw sign handles heating/cooling

        return json.dumps({"outlet_temperature_c": round(outlet_temperature_c, 2)})

    except ZeroDivisionError: # Should be caught by checks
         return json.dumps({"error": "Division by zero. Check mass flow or specific heat."})
    except Exception as e:
        return json.dumps({"error": f"Error calculating HEX outlet temp: {e}"})

@tool
def calculate_heat_exchanger_duty(
    mass_flow_kg_h: float,
    specific_heat_kj_kg_k: float,
    inlet_temp_c: float,
    outlet_temp_c: float
) -> str:
    """
    Calculates the heat duty required to change a stream's temperature.
    Args:
        mass_flow_kg_h: Mass flow rate of the stream (kg/h).
        specific_heat_kj_kg_k: Specific heat capacity of the stream (kJ/kg-K).
        inlet_temp_c: Inlet temperature of the stream in °C.
        outlet_temp_c: Outlet temperature of the stream in °C.
    Returns:
        JSON string: {"duty_kw": float} (Positive for heating, negative for cooling) or {"error": str}.
    """
    _debug_tool_call("calculate_heat_exchanger_duty")
    if mass_flow_kg_h < 0:
         return json.dumps({"error": "Mass flow cannot be negative."})
    if specific_heat_kj_kg_k <= 0:
         return json.dumps({"error": "Specific heat must be positive."})
    try:
        # Q = m * Cp * deltaT
        # Q (kJ/h) = m(kg/h) * Cp(kJ/kg-K) * deltaT(K or C)
        # Q (kW) = Q (kJ/h) / 3600 (s/h)
        delta_T = outlet_temp_c - inlet_temp_c
        duty_kj_h = mass_flow_kg_h * specific_heat_kj_kg_k * delta_T
        duty_kw = duty_kj_h / 3600.0 # kJ/h -> kJ/s -> kW
        return json.dumps({"duty_kw": round(duty_kw, 4)})
    except Exception as e:
        return json.dumps({"error": f"Error calculating HEX duty: {e}"})

@tool
def get_physical_properties(
    components: List[str],
    mole_fractions: List[float],
    temperature_c: float,
    pressure_pa: float, # Absolute pressure in Pascals
    properties_needed: List[str] # e.g., ["density", "cp", "viscosity", "phase", "molecular_weight"]
) -> str:
    """
    Looks up physical properties for a mixture using CoolProp.

    Args:
        components: List of component names (use common names like "water", "ethanol"). CoolProp aliases are handled internally.
        mole_fractions: List of corresponding mole fractions. Must sum to 1.0.
        temperature_c: Temperature in °C.
        pressure_pa: Absolute pressure in Pascals (Pa).
        properties_needed: List of property names to retrieve. Valid names:
                           "density", "cp" (specific heat kJ/kg-K), "viscosity" (cP),
                           "phase", "molecular_weight" (kg/kmol).

    Returns:
        JSON string: {"properties": {"density": {"value": X, "unit": "kg/m3"}, ...}, "notes": "..."} or {"error": str}.
    """
    _debug_tool_call("get_physical_properties")
    # --- Input Validation ---
    if not components or not mole_fractions or len(components) != len(mole_fractions):
        return json.dumps({"error": "Components and mole_fractions lists must be non-empty and have the same length."})
    
    # Normalize mole fractions if they don't sum exactly to 1.0
    total_frac = sum(mole_fractions)
    if not math.isclose(total_frac, 1.0, abs_tol=1e-4):
        if abs(total_frac - 1.0) > 0.01: # Error if significantly off
             return json.dumps({"error": f"Mole fractions sum to {total_frac:.4f}, must sum to 1.0."})
        elif total_frac > 0 : # Normalize if slightly off and possible
            print(f"Warning: Normalizing mole fractions from sum {total_frac:.4f} to 1.0.", flush=True)
            mole_fractions = [f / total_frac for f in mole_fractions]
        else: # Sum is zero or negative
             return json.dumps({"error": "Mole fractions sum to zero or negative, cannot normalize."})


    # --- Prepare CoolProp Inputs ---
    state_available = False # Flag to track AbstractState initialization
    AS = None             # Initialize AS to None
    props_si_mix_string = "" # Initialize props_si_mix_string
    abs_state_comps = ""   # Initialize abs_state_comps
    fracs_for_avg_mw = {}  # Initialize fracs_for_avg_mw

    try:
        # Convert component names
        cp_components = [_get_coolprop_name(c) for c in components]

        # Check if components are known *before* building mixture string
        unknown_comps = []
        for i, c in enumerate(components):
             # Use the original name for the MW check message
             mw_test = _get_mw_kg_kmol(c)
             if mw_test == 0.0:
                  unknown_comps.append(f"{c} (mapped to: {cp_components[i]})")
        if unknown_comps:
             return json.dumps({"error": f"Could not find molecular weight (check CoolProp compatibility) for components: {', '.join(unknown_comps)}."})

        # Create mixture string for PropsSI (requires HEOS generally for mixtures)
        # and component list for AbstractState
        if len(cp_components) == 1:
            abs_state_comps = cp_components[0]
            # Handle pure fluid PropsSI string (check if needs HEOS::)
            props_si_mix_string = cp_components[0]
            if not props_si_mix_string.startswith("HEOS::") and '&' not in props_si_mix_string:
                try: CP.PropsSI('Tcrit', props_si_mix_string) # Simple check
                except ValueError: props_si_mix_string = "HEOS::" + props_si_mix_string
            # Dict for avg mw calc
            fracs_for_avg_mw = {components[0]: {"value": 1.0, "unit": "molar fraction"}}

        else:
            abs_state_comps = '&'.join(cp_components)
            props_si_mix_string = "HEOS::" + abs_state_comps
            fracs_for_avg_mw = {c: {"value": f, "unit": "molar fraction"} for c, f in zip(components, mole_fractions)}


        # Convert state variables T, P
        T_k = temperature_c + 273.15
        if pressure_pa <= 0:
             return json.dumps({"error": f"Absolute pressure ({pressure_pa:.3f} Pa) must be positive."})
        
        P_pa = pressure_pa
        # pressure_pa is already in Pascals, so use it directly

        # Initialize AbstractState for properties where it's more reliable (Density, Cp, Visc, Phase)
        try:
            AS = CP.AbstractState("HEOS", abs_state_comps)
            if len(cp_components) > 1:
                AS.set_mole_fractions(mole_fractions)
            AS.update(CP.PT_INPUTS, P_pa, T_k)
            state_available = True # Use pressure_pa directly here
        except Exception as e_abs:
            print(f"Warning: Could not initialize CoolProp AbstractState: {e_abs}. Falling back to PropsSI for all.", flush=True)
            state_available = False


    except Exception as e:
        return json.dumps({"error": f"Error preparing CoolProp inputs: {e}"})

    # --- Call CoolProp for Properties ---
    results = {}
    notes = ["Properties calculated using CoolProp."]
    calculation_errors = []

    for prop_name in properties_needed:
        value = None
        unit = ""
        prop_key_cp = "" # CoolProp key

        try:
            if prop_name == "density":
                prop_key_cp = "Dmass" # Mass density
                unit = "kg/m³"
                if state_available:
                    value = AS.rhomass()
                else: # Fallback to PropsSI
                    value = CP.PropsSI(prop_key_cp, 'T', T_k, 'P', P_pa, props_si_mix_string)
                if value is not None: value = round(value, 3)

            elif prop_name == "cp":
                prop_key_cp = "Cpmass" # Mass specific heat
                unit = "kJ/kg-K"
                if state_available:
                     value_j = AS.cpmass()
                else: # Fallback to PropsSI
                    value_j = CP.PropsSI(prop_key_cp, 'T', T_k, 'P', P_pa, props_si_mix_string)
                if value_j is not None: value = round(value_j / 1000.0, 4) # J/kg-K to kJ/kg-K

            elif prop_name == "viscosity":
                prop_key_cp = "V" # Viscosity
                unit = "cP"
                if state_available:
                    value_pas = AS.viscosity()
                else: # Fallback to PropsSI
                    value_pas = CP.PropsSI(prop_key_cp, 'T', T_k, 'P', P_pa, props_si_mix_string)
                if value_pas is not None: value = round(value_pas * 1000.0, 4) # Pa*s to cP (mPa*s)

            elif prop_name == "phase":
                prop_key_cp = "Phase"
                unit = ""
                # *** USE AbstractState.phase() if available ***
                if state_available:
                    phase_index = AS.phase()
                else: # Fallback to PropsSI (which was causing the error for mixtures)
                    # This fallback might still fail for some mixtures/backends if AbstractState failed
                    print(f"Warning: Falling back to PropsSI for Phase calculation for {props_si_mix_string}. This might be unreliable for mixtures.", flush=True)
                    phase_index = CP.PropsSI(prop_key_cp, 'T', T_k, 'P', P_pa, props_si_mix_string)

                value = _get_phase_string(int(phase_index)) if phase_index is not None else "Error"

            elif prop_name == "molecular_weight":
                # Calculate from input fractions, not CoolProp directly for mixtures
                avg_mw = _calculate_avg_mw_molar(fracs_for_avg_mw)
                if avg_mw > 0:
                    value = round(avg_mw, 3)
                    unit = "kg/kmol"
                    results[prop_name] = {"value": value, "unit": unit}
                else:
                    # Should have been caught earlier by unknown_comps check
                    calculation_errors.append(f"Failed to calculate {prop_name} (check component MWs).")
                continue # Skip the generic value check below for this special case

            # Store successful results
            if value is not None and value != "Error":
                 # Check for NaN or Inf which CoolProp might return near critical point etc.
                if isinstance(value, (float, int)) and not math.isfinite(value):
                     calculation_errors.append(f"CoolProp returned invalid number (NaN/Inf) for '{prop_name}' at T={temperature_c}C, P={pressure_pa}Pa.")
                else:
                     results[prop_name] = {"value": value, "unit": unit}
            # Only add error if it wasn't handled internally (like MW) and value is None or "Error"
            elif prop_name != "molecular_weight" and value in [None, "Error"]:
                 calculation_errors.append(f"Failed to get {prop_name} (CoolProp Key: {prop_key_cp})")

        except Exception as e:
            # Catch errors during individual property calls
            error_detail = f"{type(e).__name__} - {e}"
            calculation_errors.append(f"CoolProp error getting '{prop_name}': {error_detail}") # Use pressure_pa for logging
            mix_str_for_error = props_si_mix_string if props_si_mix_string else "mixture" # Ensure props_si_mix_string is defined before using in f-string
            print(f"DEBUG: CoolProp failed for {prop_name} at T={temperature_c}C, P={pressure_pa}Pa, Mix='{mix_str_for_error}', Frac={mole_fractions}. Error: {error_detail}", flush=True)


    # --- Final Output ---
    if calculation_errors:
        notes.append("Errors encountered: " + "; ".join(calculation_errors))
        if not results: # If NO properties were calculated successfully
             return json.dumps({"error": "Failed to calculate any requested properties. " + "; ".join(calculation_errors)})

    # Return successfully calculated properties along with any errors noted
    return json.dumps({"properties": results, "notes": " | ".join(notes)})

@tool
def build_stream_object(
    stream_id: str,
    name: str,
    description: str,
    from_unit: str,
    to_unit: str,
    phase: str, # Should ideally be verified by get_physical_properties
    mass_flow_kg_h: Optional[float] = None,
    molar_flow_kmol_h: Optional[float] = None,
    temperature_c: Optional[float] = None,
    pressure_barg: Optional[float] = None,
    volume_flow_m3_h: Optional[float] = None,
    density_kg_m3: Optional[float] = None,
    # Compositions should contain BOTH molar and mass after using convert_compositions
    compositions: Optional[Dict[str, Dict[str, Any]]] = None,
    notes: str = ""
) -> str:
    """
    Constructs a single stream object dictionary in the correct format for the stream table.
    Validates required fields and numerical inputs, checks composition sums.
    Args: All arguments correspond to the keys in the final stream object template.
    Returns: JSON string of the single stream object, ready to be added to the main list, or JSON string with an 'error' key.
    """
    _debug_tool_call("build_stream_object")
    errors = []
    # Basic validation of required string fields
    required_strings = {"stream_id": stream_id, "name": name, "from_unit": from_unit, "to_unit": to_unit, "phase": phase}
    for key, value in required_strings.items():
        if not value or not isinstance(value, str) or not value.strip():
             errors.append(f"Missing or invalid string for required field '{key}'.")

    # Phase validation (basic check)
    valid_phases = ["Liquid", "Vapor", "Gas", "TwoPhase", "Solid", "Critical", "Supercritical"] # Extend as needed
    if phase and phase not in valid_phases:
        errors.append(f"Invalid phase '{phase}'. Expected one of {valid_phases}.")


    stream = {
        "id": str(stream_id).strip() if stream_id else None, # Ensure ID is string and trimmed
        "name": name.strip() if name else None,
        "description": description.strip() if description else "",
        "from": from_unit.strip() if from_unit else None,
        "to": to_unit.strip() if to_unit else None,
        "phase": phase,
        "properties": {},
        "compositions": compositions if compositions else {}, # Use provided dict or empty
        "notes": notes.strip() if notes else ""
    }

    # Add properties if provided and valid numeric
    props_map = {
        "mass_flow": (mass_flow_kg_h, "kg/h"),
        "molar_flow": (molar_flow_kmol_h, "kmol/h"),
        "temperature": (temperature_c, "°C"),
        "pressure": (pressure_barg, "barg"),
        "volume_flow": (volume_flow_m3_h, "m³/h"),
        "density": (density_kg_m3, "kg/m³"),
    }
    for key, (value, unit) in props_map.items():
        if value is not None:
            try:
                # Ensure value is a valid number (int or float) and not NaN/Inf
                num_value = float(value)
                if not math.isfinite(num_value):
                     errors.append(f"Invalid non-finite value (NaN/Inf) for property '{key}': {value}")
                     continue # Skip adding this property

                # Add specific range checks if needed (e.g., flows non-negative, density positive)
                if key in ["mass_flow", "molar_flow", "volume_flow"] and num_value < 0:
                     errors.append(f"Property '{key}' cannot be negative: {num_value:.4g}")
                     continue
                if key == "density" and num_value <= 0:
                     errors.append(f"Property '{key}' must be positive: {num_value:.4g}")
                     continue
                # Could add check for absolute zero for temperature if needed

                stream["properties"][key] = {"value": num_value, "unit": unit}
            except (ValueError, TypeError):
                 errors.append(f"Invalid non-numeric value for property '{key}': {value}")

    # Validate compositions sum roughly to 1 if present
    if stream["compositions"]:
        molar_comps = {k: d.get("value", 0.0) for k, d in stream["compositions"].items() if not k.startswith("m_") and d.get("unit") == "molar fraction"}
        mass_comps = {k: d.get("value", 0.0) for k, d in stream["compositions"].items() if k.startswith("m_") and d.get("unit") == "mass fraction"}

        if molar_comps: # Only check if molar fractions exist
            molar_sum = sum(molar_comps.values())
            if not math.isclose(molar_sum, 1.0, abs_tol=1e-3):
                errors.append(f"Molar fractions sum to {molar_sum:.4f}, should be ~1.0.")
        if mass_comps: # Only check if mass fractions exist
            mass_sum = sum(mass_comps.values())
            if not math.isclose(mass_sum, 1.0, abs_tol=1e-3):
                errors.append(f"Mass fractions sum to {mass_sum:.4f}, should be ~1.0.")

    # Return error if any validation failed
    if errors:
         # Include the partially built stream for debugging
         return json.dumps({"error": "Validation failed: " + " | ".join(errors), "stream_data_partial": stream})

    # Add warning note for TwoPhase ambiguity if relevant properties are present
    if stream["phase"] == "TwoPhase" and any(p in stream["properties"] for p in ["density", "cp", "viscosity"]):
         warning_note = "Warning: Properties like density/cp/viscosity are ambiguous for TwoPhase; value may represent liquid, vapor, or require clarification (e.g., vapor fraction)."
         stream["notes"] = f"{stream['notes']} | {warning_note}".strip(" | ")


    # Return the validated and formatted stream object
    try:
        # Final check: Ensure the dict can be serialized to JSON
        json_output = json.dumps(stream)
        return json_output
    except TypeError as e:
        return json.dumps({"error": f"Failed to serialize stream object to JSON: {e}", "stream_data_problem": stream})
