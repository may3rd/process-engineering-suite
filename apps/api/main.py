"""FastAPI backend for Process Engineering Suite hydraulics calculations."""
import sys
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

# Add the project root to the Python path for package imports
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from schemas import (
    PipeSectionRequest,
    CalculationResponse,
    PressureDropResponse,
    ResultSummaryResponse,
    StatePointResponse,
    FittingBreakdownResponse,
    LengthEstimationRequest,
    LengthEstimationResponse,
)
from packages.hydraulics.src.single_edge import (
    calculate_single_edge,
    EdgeCalculationInput,
)
from packages.hydraulics.src.models.pipe_section import Fitting
from packages.hydraulics.src.models.components import ControlValve, Orifice
from packages.hydraulics.src.utils.units import convert


app = FastAPI(
    title="Process Engineering Suite API",
    description="Hydraulics calculation backend for pressure drop and flow analysis",
    version="1.0.0",
)

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _convert_units_to_si(request: PipeSectionRequest) -> EdgeCalculationInput:
    """
    Convert request units to SI units for calculation using the convert() helper.
    
    Target SI units:
    - length: m
    - diameter: m
    - roughness: m
    - massFlowRate: kg/s
    - pressure: Pa (absolute)
    - temperature: K
    - viscosity: Pa*s
    - density: kg/m³
    """
    # Convert diameters (default unit is mm)
    diameter_unit = request.pipeDiameterUnit or request.diameterUnit or "mm"
    diameter_value = request.pipeDiameter or request.diameter or 0.0
    diameter = convert(diameter_value, diameter_unit, "m")
    
    inlet_diameter = None
    if request.inletDiameter:
        inlet_unit = request.inletDiameterUnit or "mm"
        inlet_diameter = convert(request.inletDiameter, inlet_unit, "m")
    
    outlet_diameter = None
    if request.outletDiameter:
        outlet_unit = request.outletDiameterUnit or "mm"
        outlet_diameter = convert(request.outletDiameter, outlet_unit, "m")
    
    # Convert roughness (default unit is mm)
    roughness_value = request.roughness or 0.0457
    roughness_unit = request.roughnessUnit or "mm"
    roughness = convert(roughness_value, roughness_unit, "m")
    
    # Convert mass flow rate (default unit is kg/h)
    mass_flow_value = request.massFlowRate or 0.0
    mass_flow_unit = request.massFlowRateUnit or "kg/h"
    mass_flow_rate = convert(mass_flow_value, mass_flow_unit, "kg/s")
    
    # Convert pressure to Pa (absolute)
    # Frontend sends gauge pressure, need to add atmospheric
    pressure_value = request.boundaryPressure or 101.325
    pressure_unit = request.boundaryPressureUnit or "kPa"
    # Convert to Pa first, then add atmospheric for absolute
    pressure_pa = convert(pressure_value, pressure_unit.replace("g", ""), "Pa")  # Remove 'g' from kPag
    pressure = pressure_pa + 101325  # Add atmospheric for absolute
    
    # Convert temperature to K
    # The frontend stores temperature in C even if unit says K
    temp_value = request.boundaryTemperature or 25.0
    temp_unit = request.boundaryTemperatureUnit or "C"
    # Handle case where frontend says K but value is actually C
    if temp_unit == "K" and temp_value < 200:
        temp_unit = "C"
    temperature = convert(temp_value, temp_unit, "K")
    
    # Convert viscosity (default unit is cP)
    fluid = request.fluid
    viscosity = 0.001  # default 1 cP = 0.001 Pa·s
    if fluid and fluid.viscosity:
        viscosity_unit = fluid.viscosityUnit or "cP"
        viscosity = convert(fluid.viscosity, viscosity_unit, "Pa*s")
    
    # Density (already in kg/m³)
    density = None
    if fluid and fluid.density:
        density = fluid.density
    
    # Gas properties
    molecular_weight = None
    z_factor = None
    specific_heat_ratio = None
    if fluid:
        if fluid.molecularWeight:
            molecular_weight = fluid.molecularWeight
        z_factor = fluid.zFactor
        specific_heat_ratio = fluid.specificHeatRatio
    
    # Convert fittings
    fittings = []
    if request.fittings:
        for f in request.fittings:
            try:
                fittings.append(Fitting(type=f.type, count=f.count))
            except ValueError:
                pass
    
    # Automatically add swage fittings if inlet/outlet diameter differs from pipe diameter
    # This ensures the K value for reducers/expanders is properly calculated
    def needs_swage(upstream: float, downstream: float, tolerance: float = 0.001) -> bool:
        """Check if a swage is needed between two diameters."""
        if upstream is None or downstream is None:
            return False
        if upstream <= 0 or downstream <= 0:
            return False
        return abs(upstream - downstream) > tolerance
    
    def has_fitting(fittings_list: list, fit_type: str) -> bool:
        """Check if a fitting type already exists in the list."""
        return any(f.type == fit_type for f in fittings_list)
    
    if needs_swage(inlet_diameter, diameter) and not has_fitting(fittings, "inlet_swage"):
        fittings.append(Fitting(type="inlet_swage", count=1))
        
    if needs_swage(diameter, outlet_diameter) and not has_fitting(fittings, "outlet_swage"):
        fittings.append(Fitting(type="outlet_swage", count=1))
    
    # User specified pressure loss conversion
    user_fixed_loss = None
    if request.userSpecifiedPressureLoss:
        user_loss_unit = request.userSpecifiedPressureLossUnit or "kPa"
        user_fixed_loss = convert(request.userSpecifiedPressureLoss, user_loss_unit, "Pa")
    
    # Control Valve conversion
    control_valve = None
    if request.controlValve:
        cv_req = request.controlValve
        cv_pressure_drop_pa = None
        if cv_req.pressureDrop:
            unit = cv_req.pressureDropUnit or "kPa"
            cv_pressure_drop_pa = convert(cv_req.pressureDrop, unit, "Pa")
            
        control_valve = ControlValve(
            tag=request.name if request.pipeSectionType == "control valve" else None,
            cv=cv_req.cv,
            cg=cv_req.cg,
            pressure_drop=cv_pressure_drop_pa,
            C1=cv_req.C1,
            xT=cv_req.xT,
        )

    # Orifice conversion
    orifice = None
    if request.orifice:
        orf_req = request.orifice
        orf_pressure_drop_pa = None
        if orf_req.pressureDrop:
            unit = orf_req.pressureDropUnit or "kPa"
            orf_pressure_drop_pa = convert(orf_req.pressureDrop, unit, "Pa")
            
        orifice = Orifice(
            tag=request.name if request.pipeSectionType == "orifice" else None,
            d_over_D_ratio=orf_req.betaRatio,
            pressure_drop=orf_pressure_drop_pa,
            pipe_diameter=diameter,
            orifice_diameter=orf_req.diameter,
        )

    return EdgeCalculationInput(
        pipe_id=request.id,
        pipe_name=request.name,
        length=request.length or 0.0,
        pipe_diameter=diameter,
        inlet_diameter=inlet_diameter,
        outlet_diameter=outlet_diameter,
        roughness=roughness,
        elevation_change=request.elevation or 0.0,
        fitting_type=request.fittingType or "LR",
        fittings=fittings,
        schedule=request.schedule or "40",
        user_K=request.userK,
        # Frontend sends safety factor as percentage (e.g., 50 for 50%)
        # PipeSection.__post_init__ adds 1.0 to this value internally
        # So pass 0.0 for no increase, 0.5 for 50% increase, etc.
        piping_fitting_safety_factor=(request.pipingFittingSafetyFactor or 0) / 100.0,
        mass_flow_rate=mass_flow_rate,
        temperature=temperature,
        pressure=pressure,
        fluid_phase=fluid.phase if fluid and fluid.phase else "liquid",
        fluid_density=density,
        fluid_viscosity=viscosity,
        fluid_molecular_weight=molecular_weight,
        fluid_z_factor=z_factor,
        fluid_specific_heat_ratio=specific_heat_ratio,
        direction=request.direction or "forward",
        gas_flow_model=request.gasFlowModel or "isothermal",
        user_specified_fixed_loss=user_fixed_loss,
        pipe_section_type=request.pipeSectionType or "pipeline",
        control_valve=control_valve,
        orifice=orifice,
        erosional_constant=request.erosionalConstant or 100.0,
    )


def _convert_output_to_response(pipe_id: str, output) -> CalculationResponse:
    """Convert calculation output to API response.
    
    Note: Pressure values are returned in Pa because the frontend's
    formatPressure function expects Pa as input and converts to display units.
    """
    if not output.success:
        return CalculationResponse(
            edgeId=pipe_id,
            success=False,
            error=output.error,
        )
    
    # Pressure values stay in Pa (frontend expects Pa and converts to display units)
    pressure_drop = PressureDropResponse(
        fittingK=output.fitting_K,
        pipeLengthK=output.pipe_length_K,
        userK=output.user_K,
        pipingFittingSafetyFactor=output.piping_fitting_safety_factor,
        totalK=output.total_K,
        reynoldsNumber=output.reynolds_number,
        frictionalFactor=output.frictional_factor,
        flowScheme=output.flow_scheme,
        pipeAndFittingPressureDrop=output.pipe_and_fittings_loss,  # Pa
        elevationPressureDrop=output.elevation_loss,  # Pa
        
        controlValvePressureDrop=output.control_valve_pressure_drop,
        controlValveCV=output.control_valve_cv,
        controlValveCg=output.control_valve_cg,
        
        orificePressureDrop=output.orifice_pressure_drop,
        orificeBetaRatio=output.orifice_beta_ratio,
        
        userSpecifiedPressureDrop=output.user_fixed_loss,  # Pa
        totalSegmentPressureDrop=output.total_segment_loss,  # Pa
        normalizedPressureDrop=output.normalized_friction_loss,  # Pa per 100m
        gasFlowCriticalPressure=output.gas_flow_critical_pressure,  # Pa
    )
    
    # Build state points (pressure stays in Pa for consistency)
    inlet_state = StatePointResponse(
        pressure=output.inlet_pressure,  # Pa
        temperature=output.inlet_temperature,  # K
        density=output.inlet_density,
        velocity=output.inlet_velocity,
        machNumber=output.inlet_mach,
        erosionalVelocity=output.erosional_velocity,
        flowMomentum=output.flow_momentum,
    )
    
    outlet_state = StatePointResponse(
        pressure=output.outlet_pressure,  # Pa
        temperature=output.outlet_temperature,  # K
        density=output.outlet_density,
        velocity=output.outlet_velocity,
        machNumber=output.outlet_mach,
        erosionalVelocity=output.erosional_velocity,  # Same for both points
        flowMomentum=output.outlet_flow_momentum,  # Outlet flow momentum
    )
    
    return CalculationResponse(
        edgeId=pipe_id,
        success=True,
        pressureDropResults=pressure_drop,
        resultSummary=ResultSummaryResponse(
            inletState=inlet_state,
            outletState=outlet_state,
        ),
        equivalentLength=output.equivalent_length,
    )


@app.post("/hydraulics/edge/{edge_id}", response_model=CalculationResponse)
async def calculate_edge(edge_id: str, request: PipeSectionRequest):
    """
    Calculate pressure drop for a single pipe section.
    
    This endpoint accepts pipe section properties and returns:
    - K values (fitting, pipe length, total)
    - Reynolds number and friction factor
    - Pressure drop breakdown
    - Inlet/outlet state points
    
    For gas flow, it uses isothermal or adiabatic models based on the
    gasFlowModel parameter.
    """
    logger.info(f"📥 Received calculation request for edge: {edge_id}")
    logger.debug(f"   Pipe: {request.name}, Length: {request.length}m, Diameter: {request.pipeDiameter or request.diameter}mm")
    logger.debug(f"   Flow: {request.massFlowRate} kg/h, Fluid phase: {request.fluid.phase if request.fluid else 'N/A'}")
    
    try:
        # Convert request to calculation input
        calc_input = _convert_units_to_si(request)
        logger.debug(f"   Converted to SI: mass_flow={calc_input.mass_flow_rate:.6f} kg/s, diameter={calc_input.pipe_diameter:.4f} m")
        
        # Run calculation
        output = calculate_single_edge(calc_input)
        
        if output.success:
            logger.info(f"✅ Calculation successful for edge: {edge_id}")
            logger.debug(f"   Results: K_total={output.total_K if output.total_K is not None else 'N/A'}, Re={output.reynolds_number if output.reynolds_number is not None else 'N/A'}, Flow={output.flow_scheme}")
            logger.debug(f"   Pressure drop: {output.total_segment_loss if output.total_segment_loss is not None else 'N/A'} Pa ({(output.total_segment_loss or 0)/1000:.4f} kPa)")
        else:
            logger.warning(f"⚠️ Calculation failed for edge: {edge_id} - {output.error}")
        
        # Convert to response
        response = _convert_output_to_response(edge_id, output)
        
        logger.info(f"📤 Returning response for edge: {edge_id} (success={response.success})")
        return response
        
    except Exception as e:
        logger.error(f"❌ Exception for edge {edge_id}: {str(e)}")
        return CalculationResponse(
            edgeId=edge_id,
            success=False,
            error=str(e),
        )


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "hydraulics-api"}


@app.post("/hydraulics/solve-length")
async def solve_length(request: LengthEstimationRequest):
    """
    Solve for pipe length given a target pressure drop.
    
    Uses Brent's method (scipy.optimize.brentq) for robust root-finding.
    
    This is the inverse of the normal calculation: instead of computing
    pressure drop for a given length, we find the length that produces
    a specific pressure drop.
    """
    from schemas import LengthEstimationRequest, LengthEstimationResponse
    from packages.hydraulics.src.single_edge import (
        solve_length_from_pressure_drop,
        LengthEstimationInput,
    )
    from packages.hydraulics.src.models.pipe_section import Fitting
    from packages.hydraulics.src.utils.units import convert
    
    logger.info(f"📥 Received length estimation request for pipe: {request.id}")
    logger.debug(f"   Target ΔP: {request.targetPressureDrop/1000:.2f} kPa")
    
    try:
        # Convert units
        diameter_unit = request.pipeDiameterUnit or "mm"
        diameter = convert(request.pipeDiameter or 0.0, diameter_unit, "m")
        
        inlet_diameter = None
        if request.inletDiameter:
            inlet_diameter = convert(request.inletDiameter, request.inletDiameterUnit or "mm", "m")
        
        outlet_diameter = None
        if request.outletDiameter:
            outlet_diameter = convert(request.outletDiameter, request.outletDiameterUnit or "mm", "m")
        
        roughness = convert(request.roughness or 0.0457, request.roughnessUnit or "mm", "m")
        
        mass_flow_rate = convert(request.massFlowRate or 0.0, request.massFlowRateUnit or "kg/h", "kg/s")
        
        pressure_unit = request.boundaryPressureUnit or "kPag"
        pressure_pa = convert(request.boundaryPressure or 101.325, pressure_unit.replace("g", ""), "Pa")
        pressure = pressure_pa + 101325  # Absolute
        
        temp_value = request.boundaryTemperature or 25.0
        temp_unit = request.boundaryTemperatureUnit or "C"
        if temp_unit == "K" and temp_value < 200:
            temp_unit = "C"
        temperature = convert(temp_value, temp_unit, "K")
        
        # Fluid
        fluid = request.fluid
        viscosity = 0.001
        if fluid and fluid.viscosity:
            viscosity = convert(fluid.viscosity, fluid.viscosityUnit or "cP", "Pa*s")
        
        density = fluid.density if fluid else None
        molecular_weight = fluid.molecularWeight if fluid else None
        z_factor = fluid.zFactor if fluid else None
        specific_heat_ratio = fluid.specificHeatRatio if fluid else None
        
        # Fittings
        fittings = []
        if request.fittings:
            for f in request.fittings:
                try:
                    fittings.append(Fitting(type=f.type, count=f.count))
                except ValueError:
                    pass
        
        # Create input
        estimation_input = LengthEstimationInput(
            pipe_id=request.id,
            pipe_name=request.name,
            target_pressure_drop=request.targetPressureDrop,
            pipe_diameter=diameter,
            inlet_diameter=inlet_diameter,
            outlet_diameter=outlet_diameter,
            roughness=roughness,
            elevation_change=request.elevation or 0.0,
            fitting_type=request.fittingType or "LR",
            fittings=fittings,
            schedule=request.schedule or "40",
            user_K=request.userK,
            piping_fitting_safety_factor=(request.pipingFittingSafetyFactor or 0) / 100.0,
            mass_flow_rate=mass_flow_rate,
            temperature=temperature,
            pressure=pressure,
            fluid_phase=fluid.phase if fluid and fluid.phase else "liquid",
            fluid_density=density,
            fluid_viscosity=viscosity,
            fluid_molecular_weight=molecular_weight,
            fluid_z_factor=z_factor,
            fluid_specific_heat_ratio=specific_heat_ratio,
            direction=request.direction or "forward",
            gas_flow_model=request.gasFlowModel or "isothermal",
            length_min=request.lengthMin or 0.1,
            length_max=request.lengthMax or 10000.0,
            tolerance=request.tolerance or 10.0,
        )
        
        # Run solver
        output = solve_length_from_pressure_drop(estimation_input)
        
        if output.success:
            logger.info(f"✅ Length estimation successful for pipe: {request.id}")
            logger.debug(f"   Estimated length: {output.estimated_length:.2f}m, converged: {output.converged}")
        else:
            logger.warning(f"⚠️ Length estimation failed for pipe: {request.id} - {output.error}")
        
        return LengthEstimationResponse(
            pipeId=request.id,
            success=output.success,
            estimatedLength=output.estimated_length,
            error=output.error,
            converged=output.converged,
            finalError=output.final_error,
            iterations=output.iterations,
        )
        
    except Exception as e:
        logger.error(f"❌ Exception for length estimation {request.id}: {str(e)}")
        return LengthEstimationResponse(
            pipeId=request.id,
            success=False,
            error=str(e),
        )