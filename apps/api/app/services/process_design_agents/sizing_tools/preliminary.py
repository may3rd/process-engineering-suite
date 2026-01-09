"""
Equipment Sizing Tool Functions - Python Template Library
Provides baseline function signatures for all 14 equipment sizing tools
"""

from __future__ import annotations

import json
import math
from typing import Dict, List, Any

# ============================================================================
# HEAT TRANSFER EQUIPMENT
# ============================================================================

def prelim_basic_heat_exchanger_sizing(
    duty_kw: float,
    t_hot_in: float,
    t_hot_out: float,
    t_cold_in: float,
    t_cold_out: float,
    u_estimate: float,
    configuration: str = "1-2",
) -> str:
    """
    Performs preliminary sizing for a shell-and-tube heat exchanger based on energy balance.
    
    Args:
        duty_kw: Heat duty in kilowatts.
        t_hot_in: Hot side inlet temperature in °C.
        t_hot_out: Hot side outlet temperature in °C.
        t_cold_in: Cold side inlet temperature in °C.
        t_cold_out: Cold side outlet temperature in °C.
        u_estimate: Estimated overall heat transfer coefficient in W/m²-K.
        configuration: Heat exchanger configuration (e.g., "1-2", "2-4"). Default "1-2".
    
    Returns:
        str: A JSON formatted string with sizing results, including:
             - area_m2: Required heat transfer area in m².
             - lmtd_c: Log-mean temperature difference in °C.
             - u_design_w_m2k: Design overall heat transfer coefficient in W/m²-K.
             - configuration: Selected configuration with correction factor.
             - pressure_drop_shell_kpa: Estimated shell-side pressure drop in kPa.
             - pressure_drop_tube_kpa: Estimated tube-side pressure drop in kPa.
    """
    
    # --- 1. Validation ---
    if duty_kw <= 0 or u_estimate <= 0:
        results = {"error": "Duty and U-value must be positive numbers."}
        print(f"DEBUG: prelim_basic_heat_exchanger_sizing: {json.dumps(results)}", flush=True)
        return json.dumps(results)
    if t_hot_in <= t_hot_out:
        results = {"error": "Hot inlet temperature must be greater than hot outlet temperature."}
        print(f"DEBUG: prelim_basic_heat_exchanger_sizing: {json.dumps(results)}", flush=True)
        return json.dumps(results)
    if t_cold_out <= t_cold_in:
        results = {"error": "Cold outlet temperature must be greater than cold inlet temperature."}
        print(f"DEBUG: prelim_basic_heat_exchanger_sizing: {json.dumps(results)}", flush=True)
        return json.dumps(results)

    # --- 2. Calculate LMTD (Log Mean Temperature Difference) ---
    delta_t1 = t_hot_in - t_cold_out
    delta_t2 = t_hot_out - t_cold_in

    if delta_t1 <= 0 or delta_t2 <= 0:
        results = {
            "error": "Invalid temperature profile. Check for temperature cross-over or invalid inputs.",
            "delta_t1": delta_t1,
            "delta_t2": delta_t2
        }
        print(f"DEBUG: prelim_basic_heat_exchanger_sizing: {json.dumps(results)}", flush=True)
        return json.dumps(results)

    if abs(delta_t1 - delta_t2) < 1e-6:
        lmtd_c = delta_t1
    else:
        lmtd_c = (delta_t1 - delta_t2) / math.log(delta_t1 / delta_t2)
        
    if lmtd_c <= 0:
         results = {"error": "LMTD is zero or negative, cannot calculate area. Check temperatures."}
         print(f"DEBUG: prelim_basic_heat_exchanger_sizing: {json.dumps(results)}", flush=True)
         return json.dumps(results)

    # --- 3. Calculate LMTD Correction Factor (Ft) ---
    ft_correction = 1.0
    ft_note = "Ft=1.0 (pure counter-current) assumed."

    if configuration == "1-2":
        # Calculate Ft for 1 shell pass, 2+ tube passes
        P = (t_cold_out - t_cold_in) / (t_hot_in - t_cold_in)
        R = (t_hot_in - t_hot_out) / (t_cold_out - t_cold_in)
        
        if not 0 < P < 1:
            results = {"error": f"Invalid temperature effectiveness (P={round(P, 2)}). Check temperatures."}
            print(f"DEBUG: prelim_basic_heat_exchanger_sizing: {json.dumps(results)}", flush=True)
            return json.dumps(results)

        if R == 1:
            R = 1.00001
        
        S = (R**2 + 1)**0.5
        num_term = (1 - P) / (1 - P * R)
        den_term_inner = ( (2/P) - 1 - R + S ) / ( (2/P) - 1 - R - S )
        
        if num_term <= 0 or den_term_inner <= 0:
             results = {"error": "Invalid temp profile for Ft calc (log argument). Temp approach is too close."}
             print(f"DEBUG: prelim_basic_heat_exchanger_sizing: {json.dumps(results)}", flush=True)
             return json.dumps(results)
             
        num = S * math.log(num_term)
        den = (R - 1) * math.log(den_term_inner)
        
        if den == 0:
            ft_correction = 1.0
            ft_note = "Ft calculation resulted in division by zero, using Ft=1.0."
        else:
            ft_correction = num / den
            if ft_correction < 0.75:
                 ft_note = f"Warning: Ft={round(ft_correction, 3)} is < 0.75. Multiple shells may be needed."
            else:
                 ft_note = "Ft calculated for 1-2 S&T."
    
    elif configuration.lower() in ["counter-current", "1-1"]:
        ft_correction = 1.0
        ft_note = "Ft=1.0 (pure counter-current) assumed."
    else:
        ft_note = f"Configuration '{configuration}' Ft calculation not implemented. Using Ft=1.0."

    corrected_lmtd_c = lmtd_c * ft_correction

    # --- 4. Calculate Area ---
    heat_duty_w = duty_kw * 1000
    
    if corrected_lmtd_c <= 0:
         results = {"error": "Corrected LMTD is zero or negative, cannot calculate area."}
         print(f"DEBUG: prelim_basic_heat_exchanger_sizing: {json.dumps(results)}", flush=True)
         return json.dumps(results)
         
    area_m2 = heat_duty_w / (u_estimate * corrected_lmtd_c)

    # --- 5. Pressure Drop (Placeholder) ---
    pressure_drop_shell_kpa = -1.0
    pressure_drop_tube_kpa = -1.0
    pressure_drop_note = "Not calculated. Requires fluid properties and detailed geometry."

    # --- 6. Format Output ---
    results = {
        "area_m2": round(area_m2, 2),
        "lmtd_c": round(lmtd_c, 2),
        "ft_correction_factor": round(ft_correction, 3),
        "corrected_lmtd_c": round(corrected_lmtd_c, 2),
        "u_design_w_m2k": u_estimate,
        "configuration": f"{configuration} (Ft={round(ft_correction, 3)})",
        "pressure_drop_shell_kpa": pressure_drop_shell_kpa,
        "pressure_drop_tube_kpa": pressure_drop_tube_kpa,
        "pressure_drop_note": pressure_drop_note
    }
    
    print(f"DEBUG: prelim_basic_heat_exchanger_sizing: {json.dumps(results)}", flush=True)
    return json.dumps(results, indent=4)


def prelim_air_cooler_sizing(
    duty_kw: float,
    process_fluid_in: float,
    process_fluid_out: float,
    ambient_temperature_c: float,
    design_approach: float,
    fluid_type: str = "hydrocarbon",
) -> str:
    """
    Performs preliminary sizing for an air-cooled heat exchanger (finned tube cooler).
    
    Args:
        duty_kw: Heat duty in kilowatts.
        process_fluid_in: Process fluid inlet temperature in °C.
        process_fluid_out: Process fluid outlet temperature in °C.
        ambient_temperature_c: Ambient air temperature in °C.
        design_approach: Minimum approach temperature (process_fluid_out - t_air_out) in °C.
        fluid_type: Process fluid type (e.g., "hydrocarbon", "water", "glycol"). Default "hydrocarbon".
    
    Returns:
        str: A JSON formatted string with sizing results, including:
             - face_area_m2: Face area of cooler in m².
             - tube_length_m: Tube length in meters.
             - number_of_tubes: Number of finned tubes.
             - fin_density: Fin density in fins per inch (FPI).
             - fan_power_kw: Electric fan motor power in kW.
             - cooling_capacity_kw: Verified cooling capacity in kW.
    """

    # --- 1. Constants and Heuristics ---
    U_VALUES = {
        "hydrocarbon": 450,
        "hydrocarbon_gas": 60,
        "water": 700,
        "glycol": 600,
        "default": 450
    }
    AIR_FACE_VELOCITY_M_S = 3.0 
    AIR_DENSITY_KG_M3 = 1.127
    AIR_CP_J_KG_K = 1007
    FAN_EFFICIENCY = 0.60
    AIR_PRESSURE_DROP_PA = 150
    TUBE_LENGTH_M = 12.192 # 40 ft
    FIN_AREA_PER_M_PER_TUBE = 5.0
    FIN_DENSITY_FPI = 11

    u_estimate = U_VALUES.get(fluid_type.lower(), U_VALUES["default"])

    # --- 2. Calculate Temperatures and LMTD ---
    t_hot_in = process_fluid_in
    t_hot_out = process_fluid_out
    t_cold_in = ambient_temperature_c
    t_cold_out = process_fluid_out - design_approach
    
    if t_hot_in <= t_hot_out:
        results = {"error": "Process inlet temperature must be greater than outlet."}
        print(f"DEBUG: prelim_air_cooler_sizing: {json.dumps(results)}", flush=True)
        return json.dumps(results)
    if t_cold_out <= t_cold_in:
        results = {"error": f"Air outlet temp ({t_cold_out}°C) is not higher than inlet ({t_cold_in}°C). Check approach."}
        print(f"DEBUG: prelim_air_cooler_sizing: {json.dumps(results)}", flush=True)
        return json.dumps(results)
    if t_hot_out < t_cold_out:
        results = {"error": f"Process outlet ({t_hot_out}°C) is colder than air outlet ({t_cold_out}°C). Impossible approach."}
        print(f"DEBUG: prelim_air_cooler_sizing: {json.dumps(results)}", flush=True)
        return json.dumps(results)

    delta_t1 = t_hot_in - t_cold_out
    delta_t2 = t_hot_out - t_cold_in

    if abs(delta_t1 - delta_t2) < 1e-6:
        lmtd_c = delta_t1
    else:
        lmtd_c = (delta_t1 - delta_t2) / math.log(delta_t1 / delta_t2)

    if lmtd_c <= 0:
        results = {"error": "LMTD is zero or negative. Check temperatures."}
        print(f"DEBUG: prelim_air_cooler_sizing: {json.dumps(results)}", flush=True)
        return json.dumps(results)
        
    corrected_lmtd_c = lmtd_c # Assume Ft=1.0 for simplicity

    # --- 3. Calculate Required Area ---
    heat_duty_w = duty_kw * 1000
    external_area_m2 = heat_duty_w / (u_estimate * corrected_lmtd_c)

    # --- 4. Estimate Fan Power ---
    air_temp_rise = t_cold_out - t_cold_in
    if air_temp_rise <= 0:
         results = {"error": "Air temperature does not rise. Check inputs."}
         print(f"DEBUG: prelim_air_cooler_sizing: {json.dumps(results)}", flush=True)
         return json.dumps(results)
         
    air_mass_flow_kg_s = heat_duty_w / (AIR_CP_J_KG_K * air_temp_rise)
    air_vol_flow_m3_s = air_mass_flow_kg_s / AIR_DENSITY_KG_M3
    face_area_m2 = air_vol_flow_m3_s / AIR_FACE_VELOCITY_M_S
    fan_power_w = (air_vol_flow_m3_s * AIR_PRESSURE_DROP_PA) / FAN_EFFICIENCY
    fan_power_kw = fan_power_w / 1000

    # --- 5. Estimate Geometry ---
    total_tube_length_m = external_area_m2 / FIN_AREA_PER_M_PER_TUBE
    number_of_tubes = math.ceil(total_tube_length_m / TUBE_LENGTH_M)
    
    # --- 6. Format Output ---
    results = {
        "external_area_m2": round(external_area_m2, 2),
        "lmtd_c": round(lmtd_c, 2),
        "air_outlet_temp_c": round(t_cold_out, 2),
        "u_design_w_m2k": u_estimate,
        "face_area_m2": round(face_area_m2, 2),
        "tube_length_m": TUBE_LENGTH_M,
        "number_of_tubes": number_of_tubes,
        "fin_density_fpi": FIN_DENSITY_FPI,
        "fan_power_kw": round(fan_power_kw, 2),
        "cooling_capacity_kw": duty_kw
    }
    
    print(f"DEBUG: prelim_air_cooler_sizing: {json.dumps(results)}", flush=True)
    return json.dumps(results, indent=4)


# ============================================================================
# FLUID HANDLING EQUIPMENT
# ============================================================================

def prelim_pump_sizing(
    mass_flow_kg_h: float,
    inlet_pressure_barg: float,
    outlet_pressure_barg: float,
    fluid_density_kg_m3: float,
    pump_efficiency: float = 0.75,
    motor_efficiency: float = 0.90,
) -> str:
    """
    Performs preliminary sizing for a pump (centrifugal or positive displacement).
    
    Args:
        mass_flow_kg_h: Mass flow rate in kg/h.
        inlet_pressure_barg: Suction pressure in barg.
        outlet_pressure_barg: Discharge pressure in barg.
        fluid_density_kg_m3: Fluid density at operating temperature in kg/m³.
        pump_efficiency: Pump isentropic or volumetric efficiency (0.0-1.0). Default 0.75.
        motor_efficiency: Motor efficiency (0.0-1.0). Default 0.90.
    
    Returns:
        str: A JSON formatted string with sizing results, including:
             - volumetric_flow_m3_h: Volumetric flow at inlet in m³/h.
             - total_head_m: Total dynamic head in meters.
             - discharge_pressure_barg: Discharge pressure in barg.
             - hydraulic_power_kw: Hydraulic power in kW.
             - shaft_power_kw: Power required at the pump shaft (BHP) in kW.
             - motor_power_kw: Electric motor rated power in kW.
             - npsh_required_m: Net positive suction head required in meters.
             - pump_type: Pump classification (e.g., "Centrifugal", "Gear", "Screw").
    """
    
    # --- 1. Constants and Validation ---
    G_CONST = 9.81  # m/s^2
    
    if outlet_pressure_barg <= inlet_pressure_barg:
         results = {"error": "Outlet pressure must be greater than inlet pressure."}
         print(f"DEBUG: prelim_pump_sizing: {json.dumps(results)}", flush=True)
         return json.dumps(results)
    if not 0 < pump_efficiency <= 1.0 or not 0 < motor_efficiency <= 1.0:
        results = {"error": "Efficiencies must be between 0.0 and 1.0 (e.g., 0.75 for 75%)."}
        print(f"DEBUG: prelim_pump_sizing: {json.dumps(results)}", flush=True)
        return json.dumps(results)
    if mass_flow_kg_h <= 0 or fluid_density_kg_m3 <= 0:
        results = {"error": "Mass flow and density must be positive numbers."}
        print(f"DEBUG: prelim_pump_sizing: {json.dumps(results)}", flush=True)
        return json.dumps(results)

    # --- 2. Calculate Volumetric Flow ---
    volumetric_flow_m3_h = mass_flow_kg_h / fluid_density_kg_m3
    volumetric_flow_m3_s = volumetric_flow_m3_h / 3600

    # --- 3. Calculate Differential Pressure and Head ---
    # Convert barg (gauge) to Pascals
    delta_pressure_pa = (outlet_pressure_barg - inlet_pressure_barg) * 100_000
    
    # Total Head (H) = dP / (rho * g)
    total_head_m = delta_pressure_pa / (fluid_density_kg_m3 * G_CONST)

    # --- 4. Calculate Power ---
    # Hydraulic Power (power to fluid) in Watts
    hydraulic_power_w = volumetric_flow_m3_s * delta_pressure_pa
    hydraulic_power_kw = hydraulic_power_w / 1000

    # Shaft Power (Brake Horsepower) in kW
    shaft_power_kw = hydraulic_power_kw / pump_efficiency

    # Motor Power (Electric motor rating) in kW
    motor_power_kw = shaft_power_kw / motor_efficiency

    # --- 5. Determine Pump Type & NPSHr (Simple Heuristic) ---
    npsh_required_m = 3.0 # Placeholder
    
    if total_head_m > 200 or volumetric_flow_m3_h < 5:
         pump_type = "Positive Displacement (e.g., Reciprocating or Gear)"
         npsh_required_m = 5.0 # PD pumps often require higher NPSH
    else:
         pump_type = "Centrifugal"

    # --- 6. Format Output ---
    results = {
        "volumetric_flow_m3_h": round(volumetric_flow_m3_h, 3),
        "total_head_m": round(total_head_m, 2),
        "discharge_pressure_barg": outlet_pressure_barg,
        "hydraulic_power_kw": round(hydraulic_power_kw, 2),
        "shaft_power_kw": round(shaft_power_kw, 2),
        "motor_power_kw": round(motor_power_kw, 2),
        "npsh_required_m": round(npsh_required_m, 1),
        "pump_type": pump_type
    }
    
    print(f"DEBUG: prelim_pump_sizing: {json.dumps(results)}", flush=True)
    return json.dumps(results, indent=4)


def prelim_compressor_sizing(
    inlet_flow_m3_min: float,
    inlet_pressure_kpa: float,
    discharge_pressure_kpa: float,
    gas_type: str = "air",
    efficiency_polytropic: float = 0.80,
    intercooling: bool = True,
) -> str:
    """
    Performs preliminary sizing for a compressor based on key process parameters.
    
    Args:
        inlet_flow_m3_min: Inlet flow rate in m³/min (at inlet conditions, actual).
        inlet_pressure_kpa: Inlet pressure absolute in kPa.
        discharge_pressure_kpa: Discharge pressure absolute in kPa.
        gas_type: Gas type (e.g., "air", "nitrogen", "ethylene", "propane", "natural_gas"). Default "air".
        efficiency_polytropic: Polytropic efficiency as decimal (0.0-1.0). Default 0.80.
        intercooling: Whether intercooling between stages is available. Default True.
    
    Returns:
        str: A JSON formatted string with sizing results, including:
             - number_of_stages: Estimated number of compression stages.
             - discharge_temperature_c: Final discharge temperature in °C.
             - compression_ratio: Overall compression ratio (P_out / P_in).
             - power_kw: Polytropic power requirement in kW.
             - motor_power_kw: Electric motor rated power with service factor in kW.
             - compressor_type: Recommendation (e.g., "Centrifugal", "Reciprocating", "Screw").
             - stage_compression_ratios: Individual stage compression ratios.
             - intercooler_duty_kw: Heat removal per intercooler in kW (if applicable).
    """

    # --- 1. Constants and Basic Validation ---
    INLET_TEMP_C = 25.0
    INLET_TEMP_K = INLET_TEMP_C + 273.15
    R_UNIVERSAL = 8314.5  # J/(kmol·K)
    MAX_RATIO_PER_STAGE = 4.0
    MOTOR_EFFICIENCY_FACTOR = 0.95 # Includes motor eff and gear losses

    GAS_PROPERTIES = {
        "air": {"k": 1.4, "mw": 28.97, "Z": 1.0},
        "natural_gas": {"k": 1.31, "mw": 16.04, "Z": 0.99},
        "hydrogen": {"k": 1.41, "mw": 2.016, "Z": 1.0},
        "nitrogen": {"k": 1.4, "mw": 28.01, "Z": 1.0},
        "ethylene": {"k": 1.24, "mw": 28.05, "Z": 0.98},
        "propane": {"k": 1.13, "mw": 44.1, "Z": 0.95},
        "default": {"k": 1.4, "mw": 28.97, "Z": 1.0}
    }

    if discharge_pressure_kpa <= inlet_pressure_kpa:
        results = {"error": "Discharge pressure must be greater than inlet pressure."}
        print(f"DEBUG: prelim_compressor_sizing: {json.dumps(results)}", flush=True)
        return json.dumps(results)
    
    if not 0 < efficiency_polytropic <= 1.0:
        results = {"error": "Polytropic efficiency must be a positive decimal <= 1.0."}
        print(f"DEBUG: prelim_compressor_sizing: {json.dumps(results)}", flush=True)
        return json.dumps(results)

    # --- 2. Get Gas Properties ---
    gas_data = GAS_PROPERTIES.get(gas_type.lower(), GAS_PROPERTIES["default"])
    k = gas_data["k"]
    mw = gas_data["mw"]
    z_avg = gas_data["Z"]
    r_gas_j_kg_k = R_UNIVERSAL / mw

    # --- 3. Calculate Staging ---
    total_ratio = discharge_pressure_kpa / inlet_pressure_kpa
    number_of_stages = 1
    
    if intercooling:
        number_of_stages = int(math.ceil(math.log(total_ratio) / math.log(MAX_RATIO_PER_STAGE)))
        if number_of_stages == 0:
            number_of_stages = 1

    ratio_per_stage = total_ratio ** (1 / number_of_stages)

    # --- 4. Calculate Polytropic Head and Discharge Temp ---
    m = (k - 1) / k
    n_minus_1_over_n = m / efficiency_polytropic
    n_over_n_minus_1 = 1 / n_minus_1_over_n
    
    discharge_temp_k = INLET_TEMP_K * (ratio_per_stage ** n_minus_1_over_n)
    discharge_temp_c = discharge_temp_k - 273.15

    if not intercooling:
        # If no intercooling, the final temp is based on the *total* ratio
        discharge_temp_k = INLET_TEMP_K * (total_ratio ** n_minus_1_over_n)
        discharge_temp_c = discharge_temp_k - 273.15

    # --- 5. Calculate Power ---
    inlet_pressure_pa = inlet_pressure_kpa * 1000
    density_inlet_kg_m3 = inlet_pressure_pa / (z_avg * r_gas_j_kg_k * INLET_TEMP_K)
    inlet_flow_m3_s = inlet_flow_m3_min / 60
    mass_flow_kg_s = density_inlet_kg_m3 * inlet_flow_m3_s

    # Polytropic Head (H_p) per stage in J/kg
    head_per_stage_j_kg = (
        z_avg * r_gas_j_kg_k * INLET_TEMP_K * n_over_n_minus_1 *
        ((ratio_per_stage ** n_minus_1_over_n) - 1)
    )
    
    total_head_j_kg = head_per_stage_j_kg * number_of_stages
    
    # If not intercooled, head is calculated on total ratio
    if not intercooling:
        total_head_j_kg = (
            z_avg * r_gas_j_kg_k * INLET_TEMP_K * n_over_n_minus_1 *
            ((total_ratio ** n_minus_1_over_n) - 1)
        )
        
    power_kw = (mass_flow_kg_s * total_head_j_kg) / 1000
    motor_power_kw = power_kw / MOTOR_EFFICIENCY_FACTOR

    # --- 6. Intercooler Duty ---
    intercooler_duty_kw = 0.0
    if intercooling and number_of_stages > 1:
        # Duty = m_dot * Cp * (T_out - T_in)
        # Cp = k * R_s / (k-1)
        cp_j_kg_k = k * r_gas_j_kg_k / (k - 1)
        # Heat to remove per stage (to get back to INLET_TEMP_K)
        duty_per_stage_w = mass_flow_kg_s * cp_j_kg_k * (discharge_temp_k - INLET_TEMP_K)
        # Total duty is for (N-1) intercoolers
        intercooler_duty_kw = (duty_per_stage_w * (number_of_stages - 1)) / 1000

    # --- 7. Determine Compressor Type ---
    if inlet_flow_m3_min < 10:
        compressor_type = "Reciprocating"
    elif inlet_flow_m3_min > 150:
        compressor_type = "Centrifugal (or Axial)"
    else:
        compressor_type = "Rotary Screw / Centrifugal"

    # --- 8. Format Output ---
    results = {
        "number_of_stages": number_of_stages,
        "discharge_temperature_c": round(discharge_temp_c, 2),
        "compression_ratio": round(total_ratio, 3),
        "power_kw": round(power_kw, 2),
        "motor_power_kw": round(motor_power_kw, 2),
        "compressor_type": compressor_type,
        "stage_compression_ratios": [round(ratio_per_stage, 3)] * number_of_stages,
        "intercooler_duty_kw": round(intercooler_duty_kw, 2)
    }

    print(f"DEBUG: prelim_compressor_sizing: {json.dumps(results)}", flush=True)
    return json.dumps(results, indent=4)


# ============================================================================
# SEPARATION EQUIPMENT
# ============================================================================

def prelim_distillation_column_sizing(
    feed_flow_kmol_h: float,
    feed_temperature_c: float,
    overhead_composition: float,
    bottoms_composition: float,
    feed_composition: float,
    relative_volatility: float,
    tray_efficiency_percent: float = 70.0,
    design_pressure_barg: float = 1.0,
) -> str:
    """
    Performs preliminary sizing for a distillation column.
    
    Args:
        feed_flow_kmol_h: Feed flow rate in kmol/h.
        feed_temperature_c: Feed inlet temperature in °C.
        overhead_composition: Light component mole fraction in overhead product (0.0-1.0).
        bottoms_composition: Light component mole fraction in bottoms product (0.0-1.0).
        feed_composition: Light component mole fraction in feed (0.0-1.0).
        relative_volatility: Relative volatility of light/heavy key components.
        tray_efficiency_percent: Tray efficiency (Murphree) in percent. Default 70.0.
        design_pressure_barg: Column design pressure in barg. Default 1.0.
    
    Returns:
        str: A JSON formatted string with sizing results, including:
             - theoretical_stages: Minimum number of theoretical stages (Fenske).
             - minimum_reflux_ratio: Minimum reflux ratio (Underwood).
             - operating_reflux_ratio: Recommended operating reflux ratio.
             - actual_trays: Actual number of trays accounting for efficiency.
             - column_diameter_mm: Internal column diameter in mm.
             - column_height_m: Column height from first to last tray in meters.
             - reboiler_duty_kw: Reboiler heat duty in kW.
             - condenser_duty_kw: Condenser heat duty (cooling) in kW.
             - tray_type: Recommended tray type (e.g., "sieve", "valve", "bubble_cap").
    """
    
    try:
        # --- 1. Fenske Equation for Minimum Stages ---
        xd = overhead_composition
        xb = bottoms_composition
        alpha = relative_volatility
        term1 = (xd / (1 - xd))
        term2 = ((1 - xb) / xb)
        N_min = math.log(term1 * term2) / math.log(alpha)
        
        # --- 2. Underwood Equation for Minimum Reflux (assuming q=1, saturated liquid feed) ---
        xf = feed_composition
        q = 1.0 
        # Solve for theta (root of Underwood eq) - not implemented, using shortcut
        R_min = (1 / (alpha - 1)) * ( (xd / xf) - (alpha * (1-xd) / (1-xf)) )
        if R_min < 0: R_min = 0.5 # Fallback

        # --- 3. Gilliland Correlation (Heuristic) ---
        R_op = 1.3 * R_min
        
        # Heuristic for actual stages
        actual_trays_theoretical = 2.5 * N_min 
        actual_trays = math.ceil(actual_trays_theoretical / (tray_efficiency_percent / 100.0))

        # --- 4. Diameter & Height (Very rough heuristics) ---
        # Diameter based on feed flow
        column_diameter_mm = 500 + (feed_flow_kmol_h * 10)
        # Height based on tray spacing (0.6m)
        column_height_m = actual_trays * 0.6 

        # --- 5. Duties (Placeholder) ---
        # Requires latent heat, which is not provided.
        reboiler_duty_kw = -1.0
        condenser_duty_kw = -1.0
        
        results = {
            "theoretical_stages": round(N_min, 2),
            "minimum_reflux_ratio": round(R_min, 2),
            "operating_reflux_ratio": round(R_op, 2),
            "actual_trays": actual_trays,
            "column_diameter_mm": round(column_diameter_mm, 0),
            "column_height_m": round(column_height_m, 2),
            "reboiler_duty_kw": reboiler_duty_kw,
            "condenser_duty_kw": condenser_duty_kw,
            "tray_type": "Sieve Trays"
        }

    except Exception as e:
        results = {"error": f"Calculation failed. Check inputs. {str(e)}"}

    print(f"DEBUG: prelim_distillation_column_sizing: {json.dumps(results)}", flush=True)
    return json.dumps(results, indent=4)


def prelim_absorption_column_sizing(
    gas_flow_kmol_h: float,
    inlet_concentration: float,
    outlet_concentration: float,
    solvent_type: str = "water",
    henry_constant: float = None,
    design_pressure_barg: float = 1.0,
) -> str:
    """
    Performs preliminary sizing for an absorption column.
    
    Args:
        gas_flow_kmol_h: Gas inlet flow rate in kmol/h.
        inlet_concentration: Component concentration in inlet gas (mole fraction, 0.0-1.0).
        outlet_concentration: Component concentration in outlet gas (mole fraction, 0.0-1.0).
        solvent_type: Solvent medium (e.g., "water", "MEA", "DEA", "MDEA"). Default "water".
        henry_constant: Henry's law constant (Pa·m³/mol) or equilibrium data. Optional.
        design_pressure_barg: Column design pressure in barg. Default 1.0.
    
    Returns:
        str: A JSON formatted string with sizing results, including:
             - number_of_stages: Number of theoretical stages required.
             - column_diameter_mm: Internal column diameter in mm.
             - column_height_m: Total packed or tray height in meters.
             - solvent_circulation_kg_h: Solvent circulation rate in kg/h.
             - packing_type: Recommended packing type and size.
             - pressure_drop_total_kpa: Total pressure drop across column in kPa.
    """
    
    # --- 1. Solvent Properties (Heuristic) ---
    SOLVENT_MW = {"water": 18.015, "mea": 61.08, "dea": 105.14, "mdea": 119.16}
    mw = SOLVENT_MW.get(solvent_type.lower(), 18.015)

    # --- 2. Sizing (Heuristic) ---
    # Kremser equation is too complex without equilibrium data. Use heuristics.
    number_of_stages = 8  # Placeholder
    
    # Solvent circulation
    L_kmol_h = gas_flow_kmol_h * 1.5 # Assume 1.5x Gas flow on molar basis
    solvent_circulation_kg_h = L_kmol_h * mw
    
    # Diameter
    column_diameter_mm = 400 + (gas_flow_kmol_h * 10)
    
    # Height
    column_height_m = number_of_stages * 2.0 # 2m of packing per stage
    
    pressure_drop_total_kpa = 15.0 # Placeholder
    
    results = {
        "number_of_stages": number_of_stages,
        "column_diameter_mm": round(column_diameter_mm, 0),
        "column_height_m": round(column_height_m, 2),
        "solvent_circulation_kg_h": round(solvent_circulation_kg_h, 2),
        "packing_type": "1-inch Ceramic Raschig Rings",
        "pressure_drop_total_kpa": pressure_drop_total_kpa
    }
    
    print(f"DEBUG: prelim_absorption_column_sizing: {json.dumps(results)}", flush=True)
    return json.dumps(results, indent=4)


def prelim_separator_vessel_sizing(
    total_flow_bbl_day: float,
    gas_flow_mmscfd: float,
    oil_percentage: float,
    water_percentage: float,
    separator_type: str = "horizontal",
    residence_time_min: float = 3.0,
    design_pressure_barg: float = 5.0,
    design_temperature_c: float = 40.0,
) -> str:
    """
    Performs preliminary sizing for a two-phase or three-phase separator vessel.
    
    Args:
        total_flow_bbl_day: Total flow rate in barrels per day.
        gas_flow_mmscfd: Gas flow in millions of standard cubic feet per day (MMSCFD).
        oil_percentage: Oil content percentage by volume (0.0-100.0).
        water_percentage: Water content percentage by volume (0.0-100.0).
        separator_type: Separator type (e.g., "horizontal", "vertical", "spherical"). Default "horizontal".
        residence_time_min: Desired liquid residence time in minutes. Default 3.0.
        design_pressure_barg: Design pressure in barg. Default 5.0.
        design_temperature_c: Design temperature in °C. Default 40.0.
    
    Returns:
        str: A JSON formatted string with sizing results, including:
             - vessel_volume_m3: Required vessel volume in m³.
             - diameter_mm: Vessel diameter in mm.
             - length_mm: Vessel length (or height for vertical) in mm.
             - l_d_ratio: Length-to-diameter ratio.
             - gas_outlet_nozzle_dia_mm: Gas outlet nozzle diameter in mm.
             - liquid_outlet_nozzle_dia_mm: Liquid outlet nozzle diameter in mm.
             - internals_type: Internal configuration (e.g., baffles, demistors, weirs).
    """
    
    try:
        # --- 1. Calculate Liquid Volume ---
        BBL_TO_M3 = 0.158987
        DAY_TO_MIN = 1440.0
        
        liquid_flow_bbl_day = total_flow_bbl_day * (oil_percentage + water_percentage) / 100.0
        liquid_flow_m3_min = liquid_flow_bbl_day * BBL_TO_M3 / DAY_TO_MIN
        
        required_liquid_volume_m3 = liquid_flow_m3_min * residence_time_min
        
        # Assume liquid fills 50% of horizontal, 25% of vertical
        if separator_type.lower() == "horizontal":
            vessel_volume_m3 = required_liquid_volume_m3 * 2.0
            l_d_ratio = 3.0
        else: # vertical
            vessel_volume_m3 = required_liquid_volume_m3 * 4.0
            l_d_ratio = 3.0

        # --- 2. Calculate Dimensions (from vessel sizing logic) ---
        diameter_m = ( (4 * vessel_volume_m3) / (math.pi * l_d_ratio) ) ** (1/3)
        length_m = diameter_m * l_d_ratio # This is cylinder length (tan-to-tan)
        
        results = {
            "vessel_volume_m3": round(vessel_volume_m3, 2),
            "diameter_mm": round(diameter_m * 1000, 0),
            "length_mm": round(length_m * 1000, 0),
            "l_d_ratio": l_d_ratio,
            "gas_outlet_nozzle_dia_mm": 150, # Placeholder
            "liquid_outlet_nozzle_dia_mm": 100, # Placeholder
            "internals_type": "Inlet Baffle, Demister Pad, Weir (for 3-phase)"
        }

    except Exception as e:
        results = {"error": f"Calculation failed. Check inputs. {str(e)}"}
        
    print(f"DEBUG: prelim_separator_vessel_sizing: {json.dumps(results)}", flush=True)
    return json.dumps(results, indent=4)


# ============================================================================
# PRESSURE RELIEF EQUIPMENT
# ============================================================================

def prelim_pressure_safety_valve_sizing(
    protected_equipment_id: str,
    required_relief_flow_kg_h: float,
    relief_pressure_barg: float,
    back_pressure_barg: float,
    fluid_phase: str = "vapor",
    fluid_density_kg_m3: float = None,
) -> str:
    """
    Performs preliminary sizing for a pressure safety valve (PSV).
    
    Args:
        protected_equipment_id: Equipment ID being protected (e.g., "E-101", "R-101").
        required_relief_flow_kg_h: Required relief capacity in kg/h.
        relief_pressure_barg: Relief valve set pressure in barg.
        back_pressure_barg: Downstream backpressure in barg.
        fluid_phase: Fluid phase being relieved (e.g., "liquid", "vapor", "two-phase"). Default "vapor".
        fluid_density_kg_m3: Fluid density at relief conditions in kg/m³. Optional.
    
    Returns:
        str: A JSON formatted string with sizing results, including:
             - outlet_nozzle_diameter_mm: Outlet nozzle diameter in mm.
             - valve_capacity_kg_h: Verified valve capacity in kg/h.
             - set_pressure_barg: PSV set pressure in barg.
             - cracking_pressure_barg: Valve cracking pressure in barg.
             - valve_size_class: Valve size classification (e.g., "Size 1", "Size 2").
             - discharge_requirement: Discharge line sizing recommendation.
    """
    
    # API 520 sizing is extremely complex. This is a placeholder.
    # Heuristic: Find a standard orifice size.
    # 'J' Orifice Area = 2.853 in^2 = 0.00184 m^2
    orifice_size = "J Orifice"
    outlet_nozzle_diameter_mm = 100 # 4"
    valve_capacity_kg_h = required_relief_flow_kg_h # Assume it's sized correctly
    cracking_pressure_barg = relief_pressure_barg * 0.98 # Approx
    valve_size_class = f"3\" x {orifice_size} x 4\"" # Inlet x Orifice x Outlet
    
    results = {
        "outlet_nozzle_diameter_mm": outlet_nozzle_diameter_mm,
        "valve_capacity_kg_h": valve_capacity_kg_h,
        "set_pressure_barg": relief_pressure_barg,
        "cracking_pressure_barg": round(cracking_pressure_barg, 2),
        "valve_size_class": valve_size_class,
        "discharge_requirement": "Discharge to flare header or safe location."
    }
    
    print(f"DEBUG: prelim_pressure_safety_valve_sizing: {json.dumps(results)}", flush=True)
    return json.dumps(results, indent=4)


def prelim_blowdown_valve_sizing(
    protected_equipment_id: str,
    equipment_volume_m3: float,
    blowdown_time_minutes: float,
    initial_pressure_barg: float,
    final_pressure_barg: float = 0.5,
    fluid_type: str = "hydrocarbon",
    fluid_density_kg_m3: float = None,
) -> str:
    """
    Performs preliminary sizing for a blowdown valve for equipment depressurization.
    
    Args:
        protected_equipment_id: Equipment ID being protected.
        equipment_volume_m3: Equipment internal volume in m³.
        blowdown_time_minutes: Desired depressurization time in minutes.
        initial_pressure_barg: Initial system pressure in barg.
        final_pressure_barg: Final pressure after blowdown in barg. Default 0.5.
        fluid_type: Fluid type (e.g., "hydrocarbon", "water", "steam", "air"). Default "hydrocarbon".
        fluid_density_kg_m3: Fluid density in kg/m³. Optional.
    
    Returns:
        str: A JSON formatted string with sizing results, including:
             - required_valve_flow_capacity_kg_h: Required valve flow capacity in kg/h.
             - valve_inlet_diameter_mm: Inlet connection diameter in mm.
             - valve_outlet_diameter_mm: Outlet connection diameter in mm.
             - blowdown_line_diameter_mm: Blowdown discharge line diameter in mm.
             - valve_actuation_type: Recommended actuation (e.g., "manual_ball", "solenoid").
             - discharge_time_minutes: Actual depressurization time achievable in minutes.
    """
    
    if fluid_density_kg_m3 is None:
        fluid_density_kg_m3 = 50.0 # Guess for a gas
        
    # Heuristic: Avg flow = (Total Mass) / Time
    total_mass_kg = equipment_volume_m3 * fluid_density_kg_m3
    blowdown_time_h = blowdown_time_minutes / 60.0
    
    if blowdown_time_h == 0:
         results = {"error": "Blowdown time must be > 0."}
         print(f"DEBUG: prelim_blowdown_valve_sizing: {json.dumps(results)}", flush=True)
         return json.dumps(results)
         
    required_valve_flow_capacity_kg_h = total_mass_kg / blowdown_time_h
    
    # Heuristic sizing
    valve_inlet_diameter_mm = 50 # 2"
    valve_outlet_diameter_mm = 80 # 3"
    blowdown_line_diameter_mm = 100 # 4"
    
    results = {
        "required_valve_flow_capacity_kg_h": round(required_valve_flow_capacity_kg_h, 2),
        "valve_inlet_diameter_mm": valve_inlet_diameter_mm,
        "valve_outlet_diameter_mm": valve_outlet_diameter_mm,
        "blowdown_line_diameter_mm": blowdown_line_diameter_mm,
        "valve_actuation_type": "Automated Ball Valve (Fail-Open)",
        "discharge_time_minutes": blowdown_time_minutes
    }
    
    print(f"DEBUG: prelim_blowdown_valve_sizing: {json.dumps(results)}", flush=True)
    return json.dumps(results, indent=4)


def prelim_vent_valve_sizing(
    vapor_flow_kmol_h: float,
    vapor_molecular_weight: float,
    vapor_temperature_c: float,
    vapor_density_kg_m3: float,
    equipment_pressure_barg: float,
    vent_line_length_m: float = 5.0,
) -> str:
    """
    Performs preliminary sizing for an atmospheric vent valve for vapor release.
    
    Args:
        vapor_flow_kmol_h: Vapor release rate in kmol/h.
        vapor_molecular_weight: Average molecular weight in g/mol.
        vapor_temperature_c: Vapor temperature in °C.
        vapor_density_kg_m3: Vapor density at operating conditions in kg/m³.
        equipment_pressure_barg: Equipment internal pressure in barg.
        vent_line_length_m: Length of vent line to discharge point in meters. Default 5.0.
    
    Returns:
        str: A JSON formatted string with sizing results, including:
             - vent_valve_diameter_mm: Vent valve outlet diameter in mm.
             - vent_line_diameter_mm: Vapor line diameter in mm.
             - volumetric_flow_m3_h: Volumetric flow through vent in m³/h.
             - pressure_drop_kpa: Pressure drop in vent line in kPa.
             - valve_type: Recommended vent valve type (e.g., "cap", "duckbill", "flame_arrestor").
    """
    
    # --- 1. Calculate Flow ---
    vapor_flow_kg_h = vapor_flow_kmol_h * (vapor_molecular_weight / 1000.0) # kmol->mol->g->kg
    if vapor_density_kg_m3 == 0:
        results = {"error": "Density cannot be zero."}
        print(f"DEBUG: prelim_vent_valve_sizing: {json.dumps(results)}", flush=True)
        return json.dumps(results)
        
    volumetric_flow_m3_h = vapor_flow_kg_h / vapor_density_kg_m3
    volumetric_flow_m3_s = volumetric_flow_m3_h / 3600
    
    # --- 2. Size Line (Heuristic) ---
    # Assume max velocity of 20 m/s for vent
    MAX_VEL_M_S = 20.0
    area_m2 = volumetric_flow_m3_s / MAX_VEL_M_S
    diameter_m = ( (4 * area_m2) / math.pi ) ** 0.5
    
    vent_line_diameter_mm = math.ceil(diameter_m * 1000 / 25) * 25 # Round up to nearest 25mm
    
    results = {
        "vent_valve_diameter_mm": vent_line_diameter_mm,
        "vent_line_diameter_mm": vent_line_diameter_mm,
        "volumetric_flow_m3_h": round(volumetric_flow_m3_h, 2),
        "pressure_drop_kpa": 5.0, # Placeholder
        "valve_type": "Conservation Vent (P-V Valve)"
    }
    
    print(f"DEBUG: prelim_vent_valve_sizing: {json.dumps(results)}", flush=True)
    return json.dumps(results, indent=4)


# ============================================================================
# STORAGE & CONTAINMENT EQUIPMENT
# ============================================================================

def prelim_storage_tank_sizing(
    design_capacity_m3: float,
    fluid_type: str = "crude_oil",
    storage_duration_hours: float = 24.0,
    design_pressure_barg: float = 0.1,
    design_temperature_c: float = 40.0,
    tank_type: str = "vertical_cylindrical",
) -> str:
    """
    Performs preliminary sizing for an atmospheric or low-pressure storage tank.
    
    Args:
        design_capacity_m3: Design storage capacity in m³.
        fluid_type: Fluid type stored (e.g., "crude_oil", "naphtha", "water"). Default "crude_oil".
        storage_duration_hours: Typical storage duration in hours. Default 24.0.
        design_pressure_barg: Design pressure in barg (typically 0.05-0.2 for atmospheric). Default 0.1.
        design_temperature_c: Design temperature in °C. Default 40.0.
        tank_type: Tank type (e.g., "vertical_cylindrical", "horizontal", "spherical"). Default "vertical_cylindrical".
    
    Returns:
        str: A JSON formatted string with sizing results, including:
             - tank_diameter_mm: Tank diameter in mm.
             - tank_height_mm: Tank height in mm.
             - shell_thickness_mm: Shell plate thickness in mm.
             - roof_type: Roof type recommendation (e.g., "cone", "dome", "floating_roof").
             - volume_actual_m3: Actual usable volume in m³.
             - nozzle_connections: Recommended nozzle types and sizes.
    """
    
    if design_capacity_m3 <= 0:
        results = {"error": "Design capacity must be positive."}
        print(f"DEBUG: prelim_storage_tank_sizing: {json.dumps(results)}", flush=True)
        return json.dumps(results)

    # --- 1. Dimensions ---
    # Assume H/D ratio of 1 for simplicity
    # V = (pi * D^2 / 4) * H = (pi * D^3 / 4)
    # D = (4 * V / pi)^(1/3)
    diameter_m = ( (4 * design_capacity_m3) / math.pi ) ** (1/3)
    height_m = diameter_m
    
    # --- 2. Roof Type ---
    if fluid_type.lower() in ["crude_oil", "naphtha", "gasoline"]:
        roof_type = "Internal Floating Roof"
    else:
        roof_type = "Cone Roof"
        
    # --- 3. Thickness (API 650 1-foot method, simplified) ---
    # t = (2.6 * D * (H-1) * G) / S
    # Assuming G=1.0 (water), S=235 MPa (steel) -> This is complex.
    # Use heuristic: 6mm minimum for small tanks, 8-10mm for large.
    shell_thickness_mm = 6.0
    if diameter_m > 20:
        shell_thickness_mm = 8.0
    if diameter_m > 50:
        shell_thickness_mm = 12.0

    results = {
        "tank_diameter_mm": round(diameter_m * 1000, 0),
        "tank_height_mm": round(height_m * 1000, 0),
        "shell_thickness_mm": shell_thickness_mm,
        "roof_type": roof_type,
        "volume_actual_m3": round(design_capacity_m3, 2),
        "nozzle_connections": "1x 12\" Inlet, 1x 12\" Outlet, 1x 4\" Drain, 1x 24\" Manway"
    }
    
    print(f"DEBUG: prelim_storage_tank_sizing: {json.dumps(results)}", flush=True)
    return json.dumps(results, indent=4)


def prelim_surge_drum_sizing(
    inlet_flow_kg_h: float,
    outlet_flow_kg_h: float,
    fluid_density_kg_m3: float,
    surge_time_minutes: float = 10.0,
    operating_pressure_barg: float = 1.0,
    l_d_ratio: float = 3.0,
) -> str:
    """
    Performs preliminary sizing for a surge/buffer drum for process flow stabilization.
    
    Args:
        inlet_flow_kg_h: Maximum inlet flow rate in kg/h.
        outlet_flow_kg_h: Maximum outlet flow rate in kg/h.
        fluid_density_kg_m3: Fluid density in kg/m³.
        surge_time_minutes: Surge time (buffer capacity) in minutes. Default 10.0.
        operating_pressure_barg: Operating pressure in barg. Default 1.0.
        l_d_ratio: Length-to-diameter ratio. Default 3.0.
    
    Returns:
        str: A JSON formatted string with sizing results, including:
             - drum_volume_m3: Required drum volume in m³.
             - drum_diameter_mm: Drum diameter in mm.
             - drum_length_mm: Drum length in mm.
             - liquid_level_control: Level control instrumentation recommendation.
    """
    
    if fluid_density_kg_m3 == 0:
        results = {"error": "Density cannot be zero."}
        print(f"DEBUG: prelim_surge_drum_sizing: {json.dumps(results)}", flush=True)
        return json.dumps(results)
        
    # --- 1. Volume ---
    # Size based on the max flow
    max_flow_kg_h = max(inlet_flow_kg_h, outlet_flow_kg_h)
    vol_flow_m3_h = max_flow_kg_h / fluid_density_kg_m3
    
    # Surge volume (liquid part)
    surge_volume_m3 = vol_flow_m3_h * (surge_time_minutes / 60.0)
    
    # Assume liquid fills 50% of the drum
    drum_volume_m3 = surge_volume_m3 * 2.0
    
    # --- 2. Dimensions (Assume L/D = 3) ---
    diameter_m = ( (4 * drum_volume_m3) / (math.pi * l_d_ratio) ) ** (1/3)
    length_m = diameter_m * l_d_ratio

    results = {
        "drum_volume_m3": round(drum_volume_m3, 2),
        "drum_diameter_mm": round(diameter_m * 1000, 0),
        "drum_length_mm": round(length_m * 1000, 0),
        "liquid_level_control": "Guided Wave Radar Level Transmitter (LT) and Level Control Valve (LCV)"
    }
    
    print(f"DEBUG: prelim_surge_drum_sizing: {json.dumps(results)}", flush=True)
    return json.dumps(results, indent=4)


# ============================================================================
# PROCESS EQUIPMENT
# ============================================================================

def prelim_reactor_vessel_sizing(
    feed_flow_kg_h: float,
    residence_time_minutes: float,
    mixture_density_kg_m3: float,
    reaction_exothermic: bool = False,
    heat_removal_kw: float = 0.0,
    design_pressure_barg: float = 5.0,
    design_temperature_c: float = 60.0,
) -> str:
    """
    Performs preliminary sizing for a reactor vessel based on residence time and reaction requirements.
    
    Args:
        feed_flow_kg_h: Feed flow rate in kg/h.
        residence_time_minutes: Required residence time in minutes.
        mixture_density_kg_m3: Reaction mixture density in kg/m³.
        reaction_exothermic: Whether reaction is exothermic. Default False.
        heat_removal_kw: Heat removal capacity required in kW (if exothermic). Default 0.0.
        design_pressure_barg: Design pressure in barg. Default 5.0.
        design_temperature_c: Design temperature in °C. Default 60.0.
    
    Returns:
        str: A JSON formatted string with sizing results, including:
             - reactor_volume_m3: Required reactor volume in m³.
             - reactor_diameter_mm: Reactor diameter in mm.
             - reactor_height_mm: Reactor height in mm.
             - agitator_power_kw: Agitator motor power in kW.
             - cooling_surface_area_m2: Cooling jacket surface area in m² (if needed).
             - baffle_configuration: Baffle and impeller configuration recommendation.
    """
    
    if mixture_density_kg_m3 == 0:
        results = {"error": "Density cannot be zero."}
        print(f"DEBUG: prelim_reactor_vessel_sizing: {json.dumps(results)}", flush=True)
        return json.dumps(results)
        
    # --- 1. Volume ---
    vol_flow_m3_h = feed_flow_kg_h / mixture_density_kg_m3
    reactor_volume_m3 = vol_flow_m3_h * (residence_time_minutes / 60.0)
    
    # --- 2. Dimensions (Assume L/D = 1.5) ---
    l_d_ratio = 1.5
    diameter_m = ( (4 * reactor_volume_m3) / (math.pi * l_d_ratio) ) ** (1/3)
    height_m = diameter_m * l_d_ratio # Tan-to-tan height
    
    # --- 3. Agitator (Heuristic: 5 kW per m3) ---
    agitator_power_kw = reactor_volume_m3 * 5.0
    
    # --- 4. Cooling Area ---
    cooling_surface_area_m2 = 0.0
    if reaction_exothermic and heat_removal_kw > 0:
        # Assume U=500 W/m2K, LMTD=20C
        # A = Q / (U * LMTD)
        U_jacket = 500 
        LMTD_jacket = 20
        cooling_surface_area_m2 = (heat_removal_kw * 1000) / (U_jacket * LMTD_jacket)
    
    results = {
        "reactor_volume_m3": round(reactor_volume_m3, 2),
        "reactor_diameter_mm": round(diameter_m * 1000, 0),
        "reactor_height_mm": round(height_m * 1000, 0),
        "agitator_power_kw": round(agitator_power_kw, 2),
        "cooling_surface_area_m2": round(cooling_surface_area_m2, 2),
        "baffle_configuration": "4 Baffles, Pitched-Blade Turbine Impeller"
    }
    
    print(f"DEBUG: prelim_reactor_vessel_sizing: {json.dumps(results)}", flush=True)
    return json.dumps(results, indent=4)


# ============================================================================
# SPECIALIZED EQUIPMENT
# ============================================================================

def prelim_knockout_drum_sizing(
    vapor_flow_kmol_h: float,
    liquid_content_percent: float,
    design_pressure_barg: float = 5.0,
    design_temperature_c: float = 40.0,
    residence_time_seconds: float = 180.0,
    vapor_mw: float = 30.0, # g/mol
    liquid_density_kg_m3: float = 800.0,
) -> str:
    """
    Performs preliminary sizing for a knockout drum for liquid removal from vapor streams.
    
    Args:
        vapor_flow_kmol_h: Vapor flow rate in kmol/h.
        liquid_content_percent: Expected liquid content by mass percentage (0.0-100.0).
        design_pressure_barg: Design pressure in barg. Default 5.0.
        design_temperature_c: Design temperature in °C. Default 40.0.
        residence_time_seconds: Desired liquid residence time in seconds. Default 180.0.
        vapor_mw: Vapor Molecular Weight (g/mol) - Added for mass flow calc.
        liquid_density_kg_m3: Liquid Density (kg/m3) - Added for volume calc.
    
    Returns:
        str: A JSON formatted string with sizing results, including:
             - drum_volume_m3: Required drum volume in m³.
             - drum_diameter_mm: Drum diameter in mm.
             - drum_length_mm: Drum length in mm.
             - liquid_outlet_nozzle_mm: Liquid drain nozzle size in mm.
             - mist_eliminator_type: Internal mist eliminator recommendation.
    """
    
    if liquid_density_kg_m3 == 0:
        results = {"error": "Liquid density cannot be zero."}
        print(f"DEBUG: prelim_knockout_drum_sizing: {json.dumps(results)}", flush=True)
        return json.dumps(results)

    # --- 1. Calculate Liquid Volume ---
    total_mass_flow_kg_h = vapor_flow_kmol_h * (vapor_mw / 1000.0) # kmol->mol->g->kg
    liquid_mass_flow_kg_h = total_mass_flow_kg_h * (liquid_content_percent / 100.0)
    liquid_vol_flow_m3_h = liquid_mass_flow_kg_h / liquid_density_kg_m3
    
    liquid_surge_volume_m3 = liquid_vol_flow_m3_h * (residence_time_seconds / 3600.0)
    
    # Assume vertical drum, 25% liquid level
    drum_volume_m3 = liquid_surge_volume_m3 * 4.0
    
    # --- 2. Dimensions (L/D = 3) ---
    l_d_ratio = 3.0
    diameter_m = ( (4 * drum_volume_m3) / (math.pi * l_d_ratio) ) ** (1/3)
    length_m = diameter_m * l_d_ratio # This is height
    
    results = {
        "drum_volume_m3": round(drum_volume_m3, 2),
        "drum_diameter_mm": round(diameter_m * 1000, 0),
        "drum_length_mm": round(length_m * 1000, 0),
        "liquid_outlet_nozzle_mm": 50, # 2"
        "mist_eliminator_type": "Wire Mesh Demister Pad"
    }
    
    print(f"DEBUG: prelim_knockout_drum_sizing: {json.dumps(results)}", flush=True)
    return json.dumps(results, indent=4)


def prelim_filter_vessel_sizing(
    fluid_flow_m3_h: float,
    filtration_type: str = "cartridge",
    design_pressure_barg: float = 3.0,
    design_temperature_c: float = 40.0,
    filter_media_permeability_m_s: float = 0.002, # 0.002 m/s = 7.2 m/h (typical)
) -> str:
    """
    Performs preliminary sizing for a filter vessel for solid-liquid or solid-gas separation.
    
    Args:
        fluid_flow_m3_h: Fluid flow rate in m³/h.
        filtration_type: Type of filtration (e.g., "bag_filter", "cartridge", "sand", "membrane"). Default "cartridge".
        design_pressure_barg: Design pressure in barg. Default 3.0.
        design_temperature_c: Design temperature in °C. Default 40.0.
        filter_media_permeability_m_s: Filter media permeability or typical face velocity in m/s. Default 0.002.
    
    Returns:
        str: A JSON formatted string with sizing results, including:
             - filter_area_m2: Required filter media area in m².
             - vessel_volume_m3: Vessel volume for filter housing in m³.
             - vessel_diameter_mm: Vessel diameter in mm.
             - number_of_elements: Number of filter cartridges or bags.
             - replacement_schedule_hours: Filter cartridge/bag replacement interval in operating hours.
    """
    
    # --- 1. Area ---
    fluid_flow_m3_s = fluid_flow_m3_h / 3600.0
    if filter_media_permeability_m_s == 0:
        results = {"error": "Permeability cannot be zero."}
        print(f"DEBUG: prelim_filter_vessel_sizing: {json.dumps(results)}", flush=True)
        return json.dumps(results)
        
    filter_area_m2 = fluid_flow_m3_s / filter_media_permeability_m_s
    
    # --- 2. Elements (Heuristic) ---
    # Assume 1 cartridge = 0.5 m^2 area
    AREA_PER_ELEMENT = 0.5
    number_of_elements = math.ceil(filter_area_m2 / AREA_PER_ELEMENT)
    
    # --- 3. Vessel Size (Heuristic) ---
    vessel_volume_m3 = number_of_elements * 0.05 # 50L per element
    l_d_ratio = 4.0
    vessel_diameter_mm = round(( (4 * vessel_volume_m3) / (math.pi * l_d_ratio) ) ** (1/3) * 1000, 0)
    
    
    results = {
        "filter_area_m2": round(filter_area_m2, 2),
        "vessel_volume_m3": round(vessel_volume_m3, 2),
        "vessel_diameter_mm": vessel_diameter_mm,
        "number_of_elements": number_of_elements,
        "replacement_schedule_hours": 720 # Placeholder (e.g., 1 month)
    }
    
    print(f"DEBUG: prelim_filter_vessel_sizing: {json.dumps(results)}", flush=True)
    return json.dumps(results, indent=4)


def prelim_dryer_vessel_sizing(
    gas_flow_kmol_h: float,
    inlet_moisture_ppm: float,
    outlet_moisture_ppm: float,
    design_pressure_barg: float = 3.0,
    regeneration_type: str = "heated_air",
) -> str:
    """
    Performs preliminary sizing for a gas dryer vessel for moisture removal.
    
    Args:
        gas_flow_kmol_h: Dry gas flow in kmol/h.
        inlet_moisture_ppm: Inlet moisture content in ppm (volume).
        outlet_moisture_ppm: Desired outlet moisture in ppm (volume).
        design_pressure_barg: Design pressure in barg. Default 3.0.
        regeneration_type: Regeneration method (e.g., "heated_air", "vacuum", "pressure_swing"). Default "heated_air".
    
    Returns:
        str: A JSON formatted string with sizing results, including:
             - dryer_vessel_volume_m3: Dryer vessel volume in m³.
             - desiccant_volume_m3: Desiccant bed volume in m³.
             - vessel_diameter_mm: Vessel diameter in mm.
             - cycle_time_hours: Operating cycle time before regeneration in hours.
             - regeneration_duty_kw: Heat duty for regeneration in kW (if thermal regeneration).
    """
    
    # Sizing for this is complex (adsorption waves, etc.)
    # Use heuristics based on flow.
    
    # --- 1. Desiccant Volume (Heuristic) ---
    # Assume 0.1 m3 of desiccant per 100 kmol/h of gas
    desiccant_volume_m3 = (gas_flow_kmol_h / 100.0) * 0.1
    if desiccant_volume_m3 < 0.5: desiccant_volume_m3 = 0.5
    
    # --- 2. Vessel Volume ---
    # Desiccant fills 50% of the vessel
    dryer_vessel_volume_m3 = desiccant_volume_m3 * 2.0
    
    # --- 3. Dimensions (L/D = 2.5) ---
    l_d_ratio = 2.5
    vessel_diameter_mm = round(( (4 * dryer_vessel_volume_m3) / (math.pi * l_d_ratio) ) ** (1/3) * 1000, 0)
    
    # --- 4. Regeneration ---
    cycle_time_hours = 8.0 # Typical
    regeneration_duty_kw = desiccant_volume_m3 * 50 # Heuristic: 50 kW per m3 of desiccant
    
    results = {
        "dryer_vessel_volume_m3": round(dryer_vessel_volume_m3, 2),
        "desiccant_volume_m3": round(desiccant_volume_m3, 2),
        "vessel_diameter_mm": vessel_diameter_mm,
        "cycle_time_hours": cycle_time_hours,
        "regeneration_duty_kw": round(regeneration_duty_kw, 2)
    }
    
    print(f"DEBUG: prelim_dryer_vessel_sizing: {json.dumps(results)}", flush=True)
    return json.dumps(results, indent=4)

