"""Gas flow solvers for isothermal and adiabatic piping segments."""
from __future__ import annotations

from dataclasses import dataclass
from math import log, sqrt, pi
from typing import Optional, Tuple
import numpy as np

from scipy.optimize import brentq  # Import brentq

UNIVERSAL_GAS_CONSTANT = 8314.462618  # J/(kmol*K)
MIN_FANNO_TARGET = 1e-9
MIN_MACH = 1e-6
MIN_DARCY_F = 1e-8
MIN_LENGTH = 1e-9
MIN_VISCOSITY = 1e-12
MAX_ISOTHERMAL_ITER = 25
MAX_ADIABATIC_ITER = 25
ISOTHERMAL_TOL = 1e-6
ADIABATIC_TOL = 1e-9


def _normalize_friction_factor(value: float, factor_type: str) -> float:
    """Return Darcy friction factor regardless of the provided convention."""
    if value <= 0:
        return value
    normalized = (factor_type or "darcy").strip().lower()
    if normalized in {"darcy", "d"}:
        return value
    if normalized in {"fanning", "f"}:
        return 4.0 * value
    raise ValueError(
        f"Unknown friction_factor_type '{factor_type}'. Expected 'darcy' or 'fanning'.")


@dataclass
class GasState:
    pressure: float = 101.325
    temperature: float = 298.15
    density: float = 1.0
    velocity: float = 0.0
    mach: float = 0.0
    molar_mass: float = 28.9644
    z_factor: float = 0.0
    gamma: float = 1.4
    gas_flow_critical_pressure: Optional[float] = None
    is_choked: bool = False


def _fanno_fL_D(mach: float, gamma: float) -> float:
    """
    Calculates the Darcy-based Fanno friction parameter (f_D * L*/D).

    This parameter represents the dimensionless length required for a flow to reach sonic conditions
    (Mach 1) from a given initial Mach number, considering friction. It's a key component
    in Fanno flow equations for adiabatic flow in constant-area ducts with friction.

    Args:
        mach (float): The current Mach number of the flow.
        gamma (float): The ratio of specific heats (Cp/Cv) for the gas.

    Returns:
        float: The Fanno friction parameter (f_D * L*/D).
    """
    if mach <= 0:
        return float('inf')  # Or handle as an error
    # Term 1: Contribution from Mach number change
    term1 = (1 - mach**2) / (gamma * mach**2)
    # Term 2: Contribution from entropy change due to friction (logarithmic term)
    term2 = ((gamma + 1) / (2 * gamma)) * log(((gamma + 1) *
                                               mach**2) / (2 * (1 + ((gamma - 1) / 2) * mach**2)))
    return term1 + term2


def _fanno_target_function(mach: float, fL_D_target: float, gamma: float) -> float:
    """Target function for root-finding: _fanno_fL_D(mach, gamma) - fL_D_target."""
    return _fanno_fL_D(mach, gamma) - fL_D_target


def _fanno_mach_from_fL_D(fL_D: float, gamma: float, initial_guess_mach: float, tol: float = 1e-9) -> float:
    """Iteratively solves for Mach number M given Fanno friction parameter 4fL*/D using brentq."""
    # Define search bounds based on initial guess
    if initial_guess_mach < 1.0:  # Subsonic flow
        a = 1e-6  # Lower bound for Mach number (cannot be zero)
        # Upper bound for subsonic Mach number (cannot reach 1.0)
        b = 1.0 - 1e-6
    else:  # Supersonic flow
        # Lower bound for supersonic Mach number (cannot reach 1.0)
        a = 1.0 + 1e-6
        b = 10.0  # Arbitrary high upper bound for Mach number

    try:
        mach = brentq(_fanno_target_function, a, b,
                      args=(fL_D, gamma), xtol=tol)
        return mach
    except ValueError as e:
        raise ValueError(
            f"Brentq failed to find Mach number for fL_D={fL_D}, gamma={gamma}, initial_guess_mach={initial_guess_mach}. Error: {e}")


def _fanno_pressure_ratio(mach: float, gamma: float) -> float:
    """
    Calculates P/P* (pressure to critical pressure ratio) for Fanno flow.

    This ratio relates the static pressure at a given Mach number to the static pressure
    at the sonic (critical) condition (Mach 1) in Fanno flow.

    Args:
        mach (float): The current Mach number of the flow.
        gamma (float): The ratio of specific heats (Cp/Cv) for the gas.

    Returns:
        float: The ratio of static pressure to critical static pressure (P/P*).
    """
    return (1 / mach) * sqrt((gamma + 1) / (2 * (1 + ((gamma - 1) / 2) * mach**2)))


def _fanno_temperature_ratio(mach: float, gamma: float) -> float:
    """
    Calculates T/T* (temperature to critical temperature ratio) for Fanno flow.

    This ratio relates the static temperature at a given Mach number to the static temperature
    at the sonic (critical) condition (Mach 1) in Fanno flow.

    Args:
        mach (float): The current Mach number of the flow.
        gamma (float): The ratio of specific heats (Cp/Cv) for the gas.

    Returns:
        float: The ratio of static temperature to critical static temperature (T/T*).
    """
    return (gamma + 1) / (2 * (1 + ((gamma - 1) / 2) * mach**2))


def _gas_flow_critical_pressure_from_conditions(
    *,
    mass_flow: float,
    diameter: float,
    temperature: float,
    molar_mass: float,
    z_factor: float,
    gamma: float,
    gas_flow_model: Optional[str] = "adiabatic",
) -> Optional[float]:
    """Return the pressure at which Mach 1 occurs for the provided conditions."""
    if (
        mass_flow is None
        or mass_flow <= 0
        or diameter <= 0
        or temperature <= 0
        or molar_mass <= 0
        or z_factor <= 0
        or gamma <= 0
    ):
        return None
    area = pi * diameter * diameter * 0.25
    sonic = sqrt(gamma * z_factor * UNIVERSAL_GAS_CONSTANT * temperature / molar_mass)
    if sonic <= 0 or not np.isfinite(sonic):
        return None
    density_star = mass_flow / (area * sonic)
    if density_star <= 0 or not np.isfinite(density_star):
        return None
    if gas_flow_model == "adiabatic":
        return mass_flow / area * sqrt(temperature * UNIVERSAL_GAS_CONSTANT / gamma / molar_mass / (1 + (gamma - 1) / 2))
    else:
        return mass_flow / area * sqrt(temperature * UNIVERSAL_GAS_CONSTANT / gamma / mass_flow)
    return density_star * z_factor * UNIVERSAL_GAS_CONSTANT * temperature / molar_mass


def _validate_gas_flow_inputs(
    pressure: float,
    temperature: float,
    mass_flow: float,
    diameter: float,
    molar_mass: float,
    z_factor: float,
    gamma: float,
    friction_factor: Optional[float] = None,
    k_total: Optional[float] = None,
    length: Optional[float] = None,
) -> None:
    """
    Validates input parameters for gas flow calculations.
    
    Args:
        pressure: Absolute pressure (Pa) - must be positive
        temperature: Absolute temperature (K) - must be positive
        mass_flow: Mass flow rate (kg/s) - can be zero or positive
        diameter: Pipe diameter (m) - must be positive
        molar_mass: Molar mass (kg/kmol) - must be positive
        z_factor: Compressibility factor - must be positive
        gamma: Ratio of specific heats - must be > 1.0
        friction_factor: Optional friction factor - must be non-negative
        k_total: Optional loss coefficient - must be non-negative
        length: Optional pipe length - must be non-negative
    
    Raises:
        ValueError: If any parameter is invalid
    """
    if pressure <= 0:
        raise ValueError(f"Pressure must be positive, got {pressure} Pa")
    if temperature <= 0:
        raise ValueError(f"Temperature must be positive, got {temperature} K")
    if diameter <= 0:
        raise ValueError(f"Diameter must be positive, got {diameter} m")
    if molar_mass <= 0:
        raise ValueError(f"Molar mass must be positive, got {molar_mass} kg/kmol")
    if z_factor <= 0:
        raise ValueError(f"Compressibility factor must be positive, got {z_factor}")
    if gamma <= 1.0:
        raise ValueError(f"Gamma (Cp/Cv) must be > 1.0, got {gamma}")
    if mass_flow < 0:
        raise ValueError(f"Mass flow must be non-negative, got {mass_flow} kg/s")
    
    if friction_factor is not None and friction_factor < 0:
        raise ValueError(f"Friction factor must be non-negative, got {friction_factor}")
    if k_total is not None and k_total < 0:
        raise ValueError(f"Total loss coefficient must be non-negative, got {k_total}")
    if length is not None and length < 0:
        raise ValueError(f"Length must be non-negative, got {length} m")


def solve_isothermal(
    inlet_pressure: float,
    temperature: float,
    mass_flow: float,
    diameter: float,
    length: float,
    friction_factor: float,
    k_total: float,
    k_additional: float,
    molar_mass: float,
    z_factor: float,
    gamma: float,
    is_forward: bool = True,
    friction_factor_type: str = "darcy",
    viscosity: Optional[float] = None,
    roughness: Optional[float] = None,
) -> Tuple[float, GasState]:
    """
    Solves isothermal gas flow through a pipe section with friction and minor losses.
    
    Uses the fundamental gas dynamics equation for isothermal flow with iterative
    solution for pressure drop. The isothermal assumption means temperature remains
    constant throughout the pipe section.
    
    Args:
        inlet_pressure (float): Upstream absolute pressure (Pa).
        temperature (float): Constant gas temperature (K).
        mass_flow (float): Mass flow rate through the pipe (kg/s).
        diameter (float): Internal pipe diameter (m).
        length (float): Pipe length (m).
        friction_factor (float): Darcy friction factor (dimensionless).
        k_total (float): Total minor loss coefficient (dimensionless).
        k_additional (float): Additional loss coefficient for this section (dimensionless).
        molar_mass (float): Gas molar mass (kg/kmol).
        z_factor (float): Gas compressibility factor (dimensionless).
        gamma (float): Ratio of specific heats Cp/Cv (dimensionless).
        is_forward (bool): True for forward flow, False for reverse flow.
        friction_factor_type (str): Type of friction factor ("darcy" or "fanning").
        viscosity (float, optional): Gas dynamic viscosity (Pa·s).
        roughness (float, optional): Pipe absolute roughness (m).
    
    Returns:
        Tuple[float, GasState]:
        - Final pressure at outlet/inlet depending on flow direction (Pa)
        - GasState with calculated properties at the final point
    
    Raises:
        ValueError: If input parameters are invalid or convergence is not achieved
    """
    # Input validation
    _validate_gas_flow_inputs(
        inlet_pressure, temperature, mass_flow, diameter,
        molar_mass, z_factor, gamma, friction_factor, k_total, length
    )
    
    if length <= 0:
        return inlet_pressure, _gas_state(inlet_pressure, temperature, mass_flow, diameter, molar_mass, z_factor, gamma)

    k_total = k_total + k_additional

    if k_total == 0.0:
        return inlet_pressure, _gas_state(inlet_pressure, temperature, mass_flow, diameter, molar_mass, z_factor, gamma)

    area = pi * diameter * diameter * 0.25

    # Helper functions
    def _k_total_term(k_total: float, P1: float, P2: float):
        return k_total + 2 * log(P1 / P2)

    upstream_pressure = inlet_pressure
    downstream_pressure: Optional[float] = None

    if is_forward:
        downstream_pressure_guess = 0.9 * upstream_pressure
        for _ in range(MAX_ISOTHERMAL_ITER):
            downstream_pressure = downstream_pressure_guess
            term_1 = _k_total_term(
                k_total, upstream_pressure, downstream_pressure)
            P2_2 = (upstream_pressure ** 2) - term_1 * ((mass_flow / area) **
                                                        2) * z_factor * UNIVERSAL_GAS_CONSTANT * temperature / molar_mass
            if P2_2 <= 0:
                downstream_pressure_guess = 0.0
                break
            downstream_pressure_guess = sqrt(P2_2)

            if abs(downstream_pressure_guess - downstream_pressure) <= ISOTHERMAL_TOL * downstream_pressure_guess:
                downstream_pressure = downstream_pressure_guess
                break

        if downstream_pressure is None:
            raise ValueError(
                "Isothermal solver failed to compute downstream pressure")
    else:
        downstream_pressure = inlet_pressure
        upstream_pressure_guess = 1.1 * downstream_pressure
        for _ in range(MAX_ISOTHERMAL_ITER):
            upstream_pressure = upstream_pressure_guess
            term_1 = _k_total_term(
                k_total, upstream_pressure, downstream_pressure)
            P1_2 = (downstream_pressure ** 2) + term_1 * ((mass_flow / area) **
                                                          2) * z_factor * UNIVERSAL_GAS_CONSTANT * temperature / molar_mass
            if P1_2 <= 0:
                upstream_pressure_guess = 0.0
                break
            upstream_pressure_guess = sqrt(P1_2)

            if abs(upstream_pressure_guess - upstream_pressure) <= ISOTHERMAL_TOL * upstream_pressure_guess:
                upstream_pressure = upstream_pressure_guess
                break

        if upstream_pressure is None:
            raise ValueError(
                "Isothermal solver failed to compute upstream pressure")

    gas_flow_critical_pressure = _gas_flow_critical_pressure_from_conditions(
        mass_flow=mass_flow,
        diameter=diameter,
        temperature=temperature,
        molar_mass=molar_mass,
        z_factor=z_factor,
        gamma=gamma,
    )
    choked = False
    final_pressure = downstream_pressure if is_forward else upstream_pressure
    if gas_flow_critical_pressure is not None and (final_pressure <= gas_flow_critical_pressure or final_pressure <= 0):
        final_pressure = gas_flow_critical_pressure
        choked = True
    elif final_pressure <= 0:
        raise ValueError("Isothermal solver produced non-positive pressure. Check inputs.")
    final_state = _gas_state(final_pressure, temperature, mass_flow, diameter, molar_mass, z_factor, gamma)
    final_state.gas_flow_critical_pressure = gas_flow_critical_pressure
    final_state.is_choked = choked
    return final_pressure, final_state


def solve_adiabatic(
    boundary_pressure: float,
    temperature: float,
    mass_flow: float,
    diameter: float,
    length: float,
    friction_factor: float,
    k_total: float,
    k_additional: float,
    molar_mass: float,
    z_factor: float,
    gamma: float,
    is_forward: bool = True,
    *,
    label: Optional[str] = None,
    friction_factor_type: str = "darcy",
) -> Tuple[GasState, GasState]:
    """
    Solves adiabatic gas flow through a pipe section using Fanno flow theory.
    
    Uses Fanno flow equations for adiabatic flow with friction. The solution
    accounts for changes in temperature, pressure, and Mach number through
    the pipe section using iterative methods.
    
    Args:
        boundary_pressure (float): Boundary absolute pressure (Pa).
        temperature (float): Initial gas temperature (K).
        mass_flow (float): Mass flow rate through the pipe (kg/s).
        diameter (float): Internal pipe diameter (m).
        length (float): Pipe length (m).
        friction_factor (float): Darcy friction factor (dimensionless).
        k_total (float): Total minor loss coefficient (dimensionless).
        k_additional (float): Additional loss coefficient for this section (dimensionless).
        molar_mass (float): Gas molar mass (kg/kmol).
        z_factor (float): Gas compressibility factor (dimensionless).
        gamma (float): Ratio of specific heats Cp/Cv (dimensionless).
        is_forward (bool): True for forward flow, False for reverse flow.
        label (str, optional): Optional label for debugging/tracing.
        friction_factor_type (str): Type of friction factor ("darcy" or "fanning").
    
    Returns:
        Tuple[GasState, GasState]:
        - Inlet gas state (pressure, temperature, density, velocity, Mach number)
        - Outlet gas state (pressure, temperature, density, velocity, Mach number)
    
    Raises:
        ValueError: If input parameters are invalid or convergence is not achieved
    """
    # Input validation
    _validate_gas_flow_inputs(
        boundary_pressure, temperature, mass_flow, diameter,
        molar_mass, z_factor, gamma, friction_factor, k_total, length
    )
    
    if length is None or length <= 0:
        return _gas_state(boundary_pressure, temperature, mass_flow, diameter, molar_mass, z_factor, gamma), \
            _gas_state(boundary_pressure, temperature, mass_flow,
                       diameter, molar_mass, z_factor, gamma)

    # print(k_total, k_additional)
    k_total = k_total + k_additional

    if k_total == 0.0:
        return _gas_state(boundary_pressure, temperature, mass_flow, diameter, molar_mass, z_factor, gamma), \
            _gas_state(boundary_pressure, temperature, mass_flow,
                       diameter, molar_mass, z_factor, gamma)

    # Helper functions
    def _calculate_y(gamma: float, ma: float) -> float:
        return 1 + (gamma - 1) / 2 * ma ** 2

    def _find_ma(
        pressure: float,
        temperature: float,
        mass_flow: float,
        diameter: float,
        molar_mass: float,
        z_factor: float,
        gamma: float,
        is_forward: bool
    ) -> Tuple[float, float, float, float]:
        """
        Solves for Mach numbers using exact Fanno Flow integration (brentq).
        
        Returns: (MA_known, MA_unknown, Y_known, Y_unknown)
        """
        area = pi * diameter * diameter / 4.0

        # 1. Calculate Known Mach Number at Boundary (M_known)
        # Uses real gas sonic speed
        sonic = sqrt(gamma * z_factor * UNIVERSAL_GAS_CONSTANT * temperature / molar_mass)
        density = (pressure * molar_mass) / (z_factor * UNIVERSAL_GAS_CONSTANT * temperature)
        velocity = mass_flow / (density * area)
        M_known = velocity / sonic

        # 2. Calculate Fanno Parameter for Known State
        # fL_D_known represents the dimensionless length to choke (M=1)
        fL_D_known = _fanno_fL_D(M_known, gamma)

        # 3. Calculate Target Fanno Parameter
        # Physics: Friction always moves Mach -> 1. Therefore fL*/D always decreases in flow direction.
        # Forward (Inlet -> Outlet):  fL_D_outlet = fL_D_inlet - K
        # Backward (Outlet -> Inlet): fL_D_inlet  = fL_D_outlet + K
        if is_forward:
            fL_D_target = fL_D_known - k_total
        else:
            fL_D_target = fL_D_known + k_total

        # 4. Solve for Unknown Mach Number
        if fL_D_target <= 0:
            # Choked Flow Condition: Pipe is longer than physically possible for this inlet M.
            # We clamp to M=1.0 (Sonic) as the limiting condition.
            M_target = 1.0
        else:
            # Use the existing root finder to get exact solution
            try:
                M_target = _fanno_mach_from_fL_D(fL_D_target, gamma, initial_guess_mach=M_known)
            except ValueError:
                # Fallback for extreme edge cases
                M_target = 1.0

        # 5. Calculate Y ratios (Temperature ratios T/T*)
        # Y = 1 + (gamma-1)/2 * M^2
        Y_known = _calculate_y(gamma, M_known)
        Y_target = _calculate_y(gamma, M_target)

        return M_known, M_target, Y_known, Y_target

    if is_forward:
        MA1, MA2, Y1, Y2 = _find_ma(boundary_pressure, temperature,
                                    mass_flow, diameter, molar_mass, z_factor, gamma, is_forward)
        inlet_pressure = boundary_pressure
        inlet_temperature = temperature / Y1
        outlet_pressure = inlet_pressure * MA1 / MA2 * sqrt(Y1 / Y2)
        outlet_temperature = inlet_temperature * Y1 / Y2
    else:
        MA2, MA1, Y2, Y1 = _find_ma(boundary_pressure, temperature,
                                    mass_flow, diameter, molar_mass, z_factor, gamma, is_forward)
        outlet_pressure = boundary_pressure
        outlet_temperature = temperature / Y2
        inlet_pressure = outlet_pressure * MA2 / MA1 * sqrt(Y2 / Y1)
        inlet_temperature = outlet_temperature * Y2 / Y1

    inlet_state = _gas_state(inlet_pressure, inlet_temperature,
                             mass_flow, diameter, molar_mass, z_factor, gamma)
    outlet_state = _gas_state(
        outlet_pressure, outlet_temperature, mass_flow, diameter, molar_mass, z_factor, gamma)

    def _apply_choke(state: GasState, temperature: float) -> GasState:
        gas_flow_critical_pressure = _gas_flow_critical_pressure_from_conditions(
            mass_flow=mass_flow,
            diameter=diameter,
            temperature=temperature,
            molar_mass=molar_mass,
            z_factor=z_factor,
            gamma=gamma,
            gas_flow_model="adiabatic",
        )
        if gas_flow_critical_pressure is not None and state.pressure <= gas_flow_critical_pressure:
            choked_state = _gas_state(
                gas_flow_critical_pressure, temperature, mass_flow, diameter, molar_mass, z_factor, gamma
            )
            choked_state.gas_flow_critical_pressure = gas_flow_critical_pressure
            choked_state.is_choked = True
            return choked_state
        state.gas_flow_critical_pressure = gas_flow_critical_pressure
        return state

    inlet_state = _apply_choke(inlet_state, inlet_temperature)
    outlet_state = _apply_choke(outlet_state, outlet_temperature)
    return inlet_state, outlet_state


def _gas_state(pressure: float, temperature: float, mass_flow: float, diameter: float, molar_mass: float, z_factor: float, gamma: float) -> GasState:
    """
    Calculates the state properties of a gas at a given point in the pipe.

    This function computes density, velocity, and Mach number based on the provided
    thermodynamic and flow parameters.

    Args:
        pressure (float): Absolute pressure of the gas.
        temperature (float): Absolute temperature of the gas.
        mass_flow (float): Mass flow rate of the gas.
        diameter (float): Inner diameter of the pipe.
        molar_mass (float): Molar mass of the gas.
        z_factor (float): Compressibility factor of the gas.
        gamma (float): Ratio of specific heats (Cp/Cv) for the gas.

    Returns:
        GasState: A dataclass containing the calculated gas properties.

    Raises:
        ValueError: If input parameters are invalid or calculation results in numerical errors
    """
    # Input validation
    _validate_gas_flow_inputs(pressure, temperature, mass_flow, diameter, molar_mass, z_factor, gamma)
    
    # Calculate gas density using the real gas law (considering compressibility factor Z)
    if z_factor <= 0:
        raise ValueError(f"Compressibility factor must be positive, got {z_factor}")
    
    density = (pressure * molar_mass) / (z_factor * UNIVERSAL_GAS_CONSTANT * temperature)
    
    # Check for reasonable density values
    if density <= 0 or not np.isfinite(density):
        raise ValueError(f"Invalid density calculated: {density} kg/m³. Check input parameters.")
    
    area = pi * diameter * diameter / 4.0
    
    # Validate area calculation
    if area <= 0:
        raise ValueError(f"Invalid pipe area calculated: {area} m². Check diameter: {diameter} m")
    
    # Calculate flow velocity from mass flow rate, density, and pipe area
    try:
        velocity = mass_flow / (density * area)
    except ZeroDivisionError:
        raise ValueError("Division by zero in velocity calculation. Check density and area values.")
    
    # Validate velocity calculation
    if not np.isfinite(velocity):
        raise ValueError(f"Invalid velocity calculated: {velocity} m/s. Check input parameters.")
    
    # Calculate the speed of sound (sonic speed) for a real gas
    if z_factor <= 0 or gamma <= 0 or temperature <= 0 or molar_mass <= 0:
        raise ValueError(f"Invalid parameters for sonic speed calculation: z={z_factor}, γ={gamma}, T={temperature}, M={molar_mass}")
    
    sonic = sqrt(gamma * z_factor * UNIVERSAL_GAS_CONSTANT * temperature / molar_mass)
    
    # Validate sonic speed calculation
    if not np.isfinite(sonic) or sonic <= 0:
        raise ValueError(f"Invalid sonic speed calculated: {sonic} m/s. Check input parameters.")
    
    # Calculate Mach number with additional validation
    if sonic <= 0:
        raise ValueError("Sonic speed must be positive for Mach number calculation")
    
    mach = velocity / sonic
    
    # Validate Mach number is reasonable
    if not np.isfinite(mach) or mach < 0:
        raise ValueError(f"Invalid Mach number calculated: {mach}. Velocity: {velocity} m/s, Sonic: {sonic} m/s")
    
    return GasState(
        pressure=pressure,
        temperature=temperature,
        density=density,
        velocity=velocity,
        mach=mach,
        molar_mass=molar_mass,
        z_factor=z_factor,
        gamma=gamma,
    )
