"""Single edge calculation orchestration for pipe pressure drop.

This module provides the main entry point for calculating pressure drop
across a single pipe section, coordinating the various calculators.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from packages.hydraulics.src.calculators.fittings import FittingLossCalculator
from packages.hydraulics.src.calculators.hydraulics import FrictionCalculator
from packages.hydraulics.src.calculators.gas_flow import solve_isothermal, solve_adiabatic, GasState
from packages.hydraulics.src.calculators.elevation import ElevationCalculator
from packages.hydraulics.src.calculators.user_fixed_loss import UserFixedLossCalculator
from packages.hydraulics.src.calculators.valves import ControlValveCalculator
from packages.hydraulics.src.calculators.orifices import OrificeCalculator
from packages.hydraulics.src.models.fluid import Fluid
from packages.hydraulics.src.models.pipe_section import PipeSection, Fitting
from packages.hydraulics.src.models.components import ControlValve, Orifice
from packages.hydraulics.src.models.results import (
    CalculationOutput,
    PressureDropDetails,
    ResultSummary,
    StatePoint,
)


@dataclass
class EdgeCalculationInput:
    """Input parameters for single edge calculation."""
    pipe_id: str
    pipe_name: str
    
    # Dimensions (all in SI: m, m, m)
    length: float = 0.0
    pipe_diameter: float = 0.0
    inlet_diameter: Optional[float] = None
    outlet_diameter: Optional[float] = None
    roughness: float = 0.0457 / 1000  # default 0.0457mm in meters
    elevation_change: float = 0.0
    
    # Fittings
    fitting_type: str = "LR"
    fittings: List[Fitting] = field(default_factory=list)
    schedule: str = "40"
    # K values
    user_K: Optional[float] = None
    piping_fitting_safety_factor: float = 0.0  # 0.0 = no safety factor (multiplier = 1.0)
    
    # Flow conditions (SI units: kg/s, K, Pa)
    mass_flow_rate: float = 0.0
    temperature: float = 298.15
    pressure: float = 101325.0
    
    # Fluid properties
    fluid_phase: str = "liquid"
    fluid_density: Optional[float] = None  # kg/m³
    fluid_viscosity: float = 0.001  # Pa·s
    fluid_molecular_weight: Optional[float] = None  # kg/kmol
    fluid_z_factor: Optional[float] = None
    fluid_specific_heat_ratio: Optional[float] = None
    
    # Direction
    direction: str = "forward"
    
    # Gas flow model
    gas_flow_model: str = "isothermal"
    
    # User fixed loss
    user_specified_fixed_loss: Optional[float] = None
    
    # Control valve (optional - for control valve sections)
    control_valve: Optional[ControlValve] = None
    
    # Orifice (optional - for orifice sections)
    orifice: Optional[Orifice] = None
    
    # Pipe section type
    pipe_section_type: str = "pipeline"  # "pipeline" | "control valve" | "orifice"
    
    # Erosional constant
    erosional_constant: float = 100.0


@dataclass
class EdgeCalculationOutput:
    """Output from single edge calculation."""
    pipe_id: str
    success: bool
    error: Optional[str] = None
    
    # K values
    fitting_K: Optional[float] = None
    pipe_length_K: Optional[float] = None
    user_K: Optional[float] = None
    total_K: Optional[float] = None
    piping_fitting_safety_factor: Optional[float] = None
    
    # Calculation results
    reynolds_number: Optional[float] = None
    frictional_factor: Optional[float] = None
    flow_scheme: Optional[str] = None
    
    # Pressure drops (Pa)
    pipe_and_fittings_loss: Optional[float] = None
    elevation_loss: Optional[float] = None
    user_fixed_loss: Optional[float] = None
    total_segment_loss: Optional[float] = None
    
    # Gas flow specific
    gas_flow_critical_pressure: Optional[float] = None
    
    # Equivalent length
    equivalent_length: Optional[float] = None
    
    # State points
    inlet_pressure: Optional[float] = None
    inlet_temperature: Optional[float] = None
    inlet_density: Optional[float] = None
    inlet_velocity: Optional[float] = None
    inlet_mach: Optional[float] = None
    
    outlet_pressure: Optional[float] = None
    outlet_temperature: Optional[float] = None
    outlet_density: Optional[float] = None
    outlet_velocity: Optional[float] = None
    outlet_mach: Optional[float] = None
    
    # Additional calculated values
    erosional_velocity: Optional[float] = None
    flow_momentum: Optional[float] = None  # Inlet flow momentum (rho * v^2)
    outlet_flow_momentum: Optional[float] = None  # Outlet flow momentum (rho * v^2)
    
    # Control valve outputs
    control_valve_pressure_drop: Optional[float] = None
    control_valve_cv: Optional[float] = None
    control_valve_cg: Optional[float] = None
    
    # Orifice outputs
    orifice_pressure_drop: Optional[float] = None
    orifice_beta_ratio: Optional[float] = None
    orifice_discharge_coefficient: Optional[float] = None


def calculate_single_edge(input_data: EdgeCalculationInput) -> EdgeCalculationOutput:
    """
    Calculate pressure drop across a single pipe section.
    
    This function orchestrates the various calculators:
    1. Fitting loss calculator (2-K method)
    2. Friction calculator (Darcy-Weisbach)
    3. Elevation loss calculator
    4. User fixed loss
    5. Gas flow solver (isothermal or adiabatic) if gas phase
    
    Args:
        input_data: EdgeCalculationInput with all pipe and fluid properties
        
    Returns:
        EdgeCalculationOutput with calculation results
    """
    output = EdgeCalculationOutput(
        pipe_id=input_data.pipe_id,
        success=False,
    )
    
    try:
        # Create Fluid object
        if input_data.fluid_phase.lower() in {"gas", "vapor"}:
            if not all([input_data.fluid_molecular_weight, input_data.fluid_z_factor, input_data.fluid_specific_heat_ratio]):
                output.error = "Gas phase requires molecular_weight, z_factor, and specific_heat_ratio"
                return output
            fluid = Fluid(
                name="Gas",
                phase="gas",
                viscosity=input_data.fluid_viscosity,
                molecular_weight=input_data.fluid_molecular_weight,
                z_factor=input_data.fluid_z_factor,
                specific_heat_ratio=input_data.fluid_specific_heat_ratio,
            )
        else:
            if not input_data.fluid_density:
                output.error = "Liquid phase requires density"
                return output
            fluid = Fluid(
                name="Liquid",
                phase="liquid",
                viscosity=input_data.fluid_viscosity,
                density=input_data.fluid_density,
            )
        
        # Create PipeSection
        section = PipeSection(
            id=input_data.pipe_id,
            schedule=input_data.schedule,
            roughness=input_data.roughness,
            length=input_data.length,
            elevation_change=input_data.elevation_change,
            fitting_type=input_data.fitting_type,
            fittings=input_data.fittings,
            fitting_K=None,
            pipe_length_K=None,
            user_K=input_data.user_K,
            piping_and_fitting_safety_factor=input_data.piping_fitting_safety_factor,
            total_K=None,
            user_specified_fixed_loss=input_data.user_specified_fixed_loss,
            pipe_diameter=input_data.pipe_diameter,
            inlet_diameter=input_data.inlet_diameter,
            outlet_diameter=input_data.outlet_diameter,
            mass_flow_rate=input_data.mass_flow_rate,
            temperature=input_data.temperature,
            pressure=input_data.pressure,
            control_valve=input_data.control_valve,
            orifice=input_data.orifice,
        )
        
        # Calculate fitting losses
        fitting_calc = FittingLossCalculator(fluid=fluid, default_pipe_diameter=input_data.pipe_diameter)
        fitting_calc.calculate(section)
        output.fitting_K = section.fitting_K
        
        # Calculate friction losses
        friction_calc = FrictionCalculator(fluid=fluid, default_pipe_diameter=input_data.pipe_diameter)
        friction_calc.calculate(section)
        output.pipe_length_K = section.pipe_length_K
        output.total_K = section.total_K
        output.equivalent_length = section.equivalent_length
        
        # Extract friction calculation details
        pressure_drop = section.calculation_output.pressure_drop
        output.reynolds_number = pressure_drop.reynolds_number
        output.frictional_factor = pressure_drop.frictional_factor
        output.flow_scheme = pressure_drop.flow_scheme
        output.pipe_and_fittings_loss = pressure_drop.pipe_and_fittings
        
        # Calculate elevation losses (for liquid only)
        if fluid.is_liquid():
            elevation_calc = ElevationCalculator(fluid=fluid)
            elevation_calc.calculate(section)
            output.elevation_loss = pressure_drop.elevation_change
        
        # Calculate user fixed losses
        if input_data.user_specified_fixed_loss:
            user_loss_calc = UserFixedLossCalculator()
            user_loss_calc.calculate(section)
            output.user_fixed_loss = pressure_drop.user_specified_fixed_loss
        
        # Calculate control valve pressure drop (if control valve section)
        if input_data.control_valve and input_data.pipe_section_type == "control valve":
            try:
                cv_calc = ControlValveCalculator(fluid=fluid)
                cv_calc.calculate(section, inlet_pressure_override=input_data.pressure)
                output.control_valve_pressure_drop = pressure_drop.control_valve_pressure_drop
                if section.control_valve:
                    output.control_valve_cv = section.control_valve.cv
                    output.control_valve_cg = section.control_valve.cg
            except Exception as cv_error:
                # Log but don't fail - control valve calculation is optional
                output.error = f"Control valve calculation error: {cv_error}"
        
        # Calculate orifice pressure drop (if orifice section)
        if input_data.orifice and input_data.pipe_section_type == "orifice":
            try:
                orifice_calc = OrificeCalculator(
                    fluid=fluid,
                    default_pipe_diameter=input_data.pipe_diameter,
                    mass_flow_rate=input_data.mass_flow_rate,
                )
                orifice_calc.calculate(section, inlet_pressure_override=input_data.pressure)
                output.orifice_pressure_drop = pressure_drop.orifice_pressure_drop
                if section.orifice:
                    output.orifice_beta_ratio = section.orifice.d_over_D_ratio
                    output.orifice_discharge_coefficient = section.orifice.discharge_coefficient
            except Exception as orifice_error:
                # Log but don't fail - orifice calculation is optional
                output.error = f"Orifice calculation error: {orifice_error}"
        
        output.total_segment_loss = pressure_drop.total_segment_loss
        output.user_K = section.user_K
        output.piping_fitting_safety_factor = section.piping_and_fitting_safety_factor
        
        # Set state points
        output.inlet_pressure = input_data.pressure
        output.inlet_temperature = input_data.temperature
        output.inlet_density = fluid.current_density(input_data.temperature, input_data.pressure)
        
        # For gas flow, use specialized solvers (only for pipelines)
        if fluid.is_gas() and input_data.length > 0 and input_data.pipe_section_type == "pipeline":
            friction_factor = output.frictional_factor or 0.02
            k_total = output.total_K or 0.0
            is_forward = input_data.direction.lower() == "forward"
            
            if input_data.gas_flow_model.lower() == "adiabatic":
                inlet_state, outlet_state = solve_adiabatic(
                    boundary_pressure=input_data.pressure,
                    temperature=input_data.temperature,
                    mass_flow=input_data.mass_flow_rate,
                    diameter=input_data.pipe_diameter,
                    length=input_data.length,
                    friction_factor=friction_factor,
                    k_total=k_total,
                    k_additional=0.0,
                    molar_mass=input_data.fluid_molecular_weight,
                    z_factor=input_data.fluid_z_factor,
                    gamma=input_data.fluid_specific_heat_ratio,
                    is_forward=is_forward,
                )
                output.inlet_pressure = inlet_state.pressure
                output.inlet_temperature = inlet_state.temperature
                output.inlet_density = inlet_state.density
                output.inlet_velocity = inlet_state.velocity
                output.inlet_mach = inlet_state.mach
                
                output.outlet_pressure = outlet_state.pressure
                output.outlet_temperature = outlet_state.temperature
                output.outlet_density = outlet_state.density
                output.outlet_velocity = outlet_state.velocity
                output.outlet_mach = outlet_state.mach
                
                output.gas_flow_critical_pressure = outlet_state.gas_flow_critical_pressure
                
                # Update total_segment_loss to reflect actual gas flow pressure drop
                actual_dP = output.inlet_pressure - output.outlet_pressure
                output.total_segment_loss = actual_dP
                output.pipe_and_fittings_loss = actual_dP
            else:
                # Isothermal
                final_pressure, final_state = solve_isothermal(
                    inlet_pressure=input_data.pressure,
                    temperature=input_data.temperature,
                    mass_flow=input_data.mass_flow_rate,
                    diameter=input_data.pipe_diameter,
                    length=input_data.length,
                    friction_factor=friction_factor,
                    k_total=k_total,
                    k_additional=0.0,
                    molar_mass=input_data.fluid_molecular_weight,
                    z_factor=input_data.fluid_z_factor,
                    gamma=input_data.fluid_specific_heat_ratio,
                    is_forward=is_forward,
                )
                
                # solve_isothermal returns:
                # - Forward: final_pressure = outlet (downstream) pressure
                # - Backward: final_pressure = inlet (upstream) pressure
                from math import pi, sqrt
                RGAS = 8314.462618  # J/(kmol*K)
                area = pi * (input_data.pipe_diameter ** 2) / 4
                
                if is_forward:
                    # Forward: boundary is inlet, final_pressure is outlet
                    output.inlet_pressure = input_data.pressure
                    output.outlet_pressure = final_pressure
                    output.inlet_density = fluid.current_density(input_data.temperature, input_data.pressure)
                    output.outlet_density = final_state.density
                    output.outlet_velocity = final_state.velocity
                    output.outlet_mach = final_state.mach
                    # Calculate inlet velocity/mach
                    inlet_velocity = input_data.mass_flow_rate / (output.inlet_density * area)
                    sonic_velocity = sqrt(input_data.fluid_specific_heat_ratio * input_data.fluid_z_factor * RGAS * input_data.temperature / input_data.fluid_molecular_weight)
                    output.inlet_velocity = inlet_velocity
                    output.inlet_mach = inlet_velocity / sonic_velocity
                else:
                    # Backward: boundary is outlet, final_pressure is inlet
                    output.outlet_pressure = input_data.pressure
                    output.inlet_pressure = final_pressure
                    output.outlet_density = fluid.current_density(input_data.temperature, input_data.pressure)
                    output.inlet_density = final_state.density
                    output.inlet_velocity = final_state.velocity
                    output.inlet_mach = final_state.mach
                    # Calculate outlet velocity/mach
                    outlet_velocity = input_data.mass_flow_rate / (output.outlet_density * area)
                    sonic_velocity = sqrt(input_data.fluid_specific_heat_ratio * input_data.fluid_z_factor * RGAS * input_data.temperature / input_data.fluid_molecular_weight)
                    output.outlet_velocity = outlet_velocity
                    output.outlet_mach = outlet_velocity / sonic_velocity
                
                output.inlet_temperature = input_data.temperature  # Isothermal - same temp everywhere
                output.outlet_temperature = input_data.temperature
                output.gas_flow_critical_pressure = final_state.gas_flow_critical_pressure
                
                # Update total_segment_loss to reflect actual gas flow pressure drop
                actual_dP = output.inlet_pressure - output.outlet_pressure
                output.total_segment_loss = actual_dP
                output.pipe_and_fittings_loss = actual_dP
            
            # Calculate erosional velocity and flow momentum for gas flow
            # These are calculated at inlet conditions (most critical point)
            from math import sqrt
            if output.inlet_density and output.inlet_density > 0:
                # API 14E formula: Ve = C / sqrt(rho)
                # C is typically given in imperial units (100-150 for continuous service)
                # Conversion: C_SI = C_imperial × 0.3048 × sqrt(16.0185) ≈ C_imperial × 1.22
                # This gives Ve in m/s when rho is in kg/m³
                C_SI_CONVERSION = 0.3048 * sqrt(16.0185)  # ≈ 1.22
                c_si = input_data.erosional_constant * C_SI_CONVERSION
                output.erosional_velocity = c_si / sqrt(output.inlet_density)
            
            # Calculate flow momentum for both inlet and outlet (rho * v^2)
            if output.inlet_density and output.inlet_velocity:
                output.flow_momentum = output.inlet_density * output.inlet_velocity * output.inlet_velocity
            if output.outlet_density and output.outlet_velocity:
                output.outlet_flow_momentum = output.outlet_density * output.outlet_velocity * output.outlet_velocity
        else:
            # General calculation (Liquid, or discrete Gas components like valves/orifices)
            is_forward = input_data.direction.lower() == "forward"
            total_loss = output.total_segment_loss or 0.0
            
            output.inlet_temperature = input_data.temperature
            output.outlet_temperature = input_data.temperature # Assume isothermal for discrete components
            
            if is_forward:
                output.inlet_pressure = input_data.pressure
                output.outlet_pressure = input_data.pressure - total_loss
            else:
                output.outlet_pressure = input_data.pressure
                output.inlet_pressure = input_data.pressure + total_loss
            
            # Recalculate densities (important for gas component expansion)
            output.inlet_density = fluid.current_density(output.inlet_temperature, output.inlet_pressure)
            output.outlet_density = fluid.current_density(output.outlet_temperature, output.outlet_pressure)
            
            # Calculate velocity
            from math import pi, sqrt
            area = 0.0
            if input_data.pipe_diameter > 0:
                area = pi * (input_data.pipe_diameter ** 2) / 4
            
            if area > 0 and input_data.mass_flow_rate > 0:
                if output.inlet_density and output.inlet_density > 0:
                    output.inlet_velocity = input_data.mass_flow_rate / (output.inlet_density * area)
                
                if output.outlet_density and output.outlet_density > 0:
                    output.outlet_velocity = input_data.mass_flow_rate / (output.outlet_density * area)
            
            # Calculate erosional velocity: Ve = C / sqrt(rho)
            if output.inlet_density and output.inlet_density > 0:
                C_SI_CONVERSION = 0.3048 * sqrt(16.0185)  # ≈ 1.22
                c_si = input_data.erosional_constant * C_SI_CONVERSION
                output.erosional_velocity = c_si / sqrt(output.inlet_density)
            
            # Calculate flow momentum: rho * v^2
            if output.inlet_density and output.inlet_velocity:
                output.flow_momentum = output.inlet_density * output.inlet_velocity * output.inlet_velocity
            
            if output.outlet_density and output.outlet_velocity:
                output.outlet_flow_momentum = output.outlet_density * output.outlet_velocity * output.outlet_velocity
            
            # Mach number
            speed_of_sound = 1500.0  # Default for liquid (water)
            
            if fluid.is_gas() and output.inlet_temperature:
                 # Calculate speed of sound for gas
                 # c = sqrt(gamma * Z * R * T / MW)
                 RGAS = 8314.462618
                 if input_data.fluid_specific_heat_ratio and input_data.fluid_molecular_weight:
                     gamma = input_data.fluid_specific_heat_ratio
                     z_factor = input_data.fluid_z_factor or 1.0
                     mw = input_data.fluid_molecular_weight
                     speed_of_sound_in = sqrt(gamma * z_factor * RGAS * output.inlet_temperature / mw)
                     speed_of_sound_out = sqrt(gamma * z_factor * RGAS * output.outlet_temperature / mw)
                     
                     if output.inlet_velocity:
                         output.inlet_mach = output.inlet_velocity / speed_of_sound_in
                     if output.outlet_velocity:
                         output.outlet_mach = output.outlet_velocity / speed_of_sound_out
            else:
                 # Liquid
                 if output.inlet_velocity:
                     output.inlet_mach = output.inlet_velocity / speed_of_sound
                 if output.outlet_velocity:
                     output.outlet_mach = output.outlet_velocity / speed_of_sound
        
        output.success = True
        
    except Exception as e:
        output.error = str(e)
    
    return output