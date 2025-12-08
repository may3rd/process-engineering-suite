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
)
from packages.hydraulics.src.single_edge import (
    calculate_single_edge,
    EdgeCalculationInput,
)
from packages.hydraulics.src.models.pipe_section import Fitting


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
    Convert request units to SI units for calculation.
    
    Frontend units:
    - length: m (already SI)
    - diameter: mm → m
    - roughness: mm → m
    - massFlowRate: kg/h → kg/s
    - pressure: kPag/kPa → Pa (absolute)
    - temperature: C → K
    - viscosity: cP → Pa·s
    - density: kg/m³ (already SI)
    
    Note: The frontend stores temperature in Celsius even though unit says K.
    """
    # Convert diameters from mm to m
    diameter = (request.pipeDiameter or request.diameter or 0.0) / 1000
    inlet_diameter = (request.inletDiameter / 1000) if request.inletDiameter else None
    outlet_diameter = (request.outletDiameter / 1000) if request.outletDiameter else None
    
    # Convert roughness from mm to m
    roughness = (request.roughness or 0.0457) / 1000
    
    # Convert mass flow rate from kg/h to kg/s
    mass_flow_rate = (request.massFlowRate or 0.0) / 3600
    
    # Convert pressure to Pa (absolute)
    # Frontend sends kPag (gauge) or kPa
    pressure_value = request.boundaryPressure or 101.325
    pressure_unit = request.boundaryPressureUnit or "kPa"
    
    if pressure_unit in ("kPag", "kPa"):
        # Assume gauge pressure, add atmospheric
        pressure = pressure_value * 1000 + 101325  # kPa → Pa + atmospheric
    elif pressure_unit == "Pa":
        pressure = pressure_value + 101325
    elif pressure_unit == "bar":
        pressure = pressure_value * 100000 + 101325
    elif pressure_unit == "psi":
        pressure = pressure_value * 6894.76 + 101325
    else:
        pressure = pressure_value * 1000 + 101325  # Default kPa gauge
    
    # Convert temperature from Celsius to Kelvin
    # The frontend stores temperature in C even if unit says K
    temp_value = request.boundaryTemperature or 25.0
    temp_unit = request.boundaryTemperatureUnit or "C"
    
    if temp_unit in ("C", "°C", "degC"):
        temperature = temp_value + 273.15
    elif temp_unit == "K":
        # Frontend likely sends C even when unit says K, so check the value range
        if temp_value < 200:  # More likely to be Celsius
            temperature = temp_value + 273.15
        else:
            temperature = temp_value
    elif temp_unit in ("F", "°F", "degF"):
        temperature = (temp_value - 32) * 5/9 + 273.15
    else:
        temperature = temp_value + 273.15  # Default assume Celsius
    
    # Convert viscosity from cP to Pa·s (if provided in cP)
    fluid = request.fluid
    viscosity = 0.001  # default 1 cP = 0.001 Pa·s
    if fluid and fluid.viscosity:
        viscosity_unit = fluid.viscosityUnit or "cP"
        if viscosity_unit in ("cP", "cp", "centipoise"):
            viscosity = fluid.viscosity / 1000
        elif viscosity_unit in ("Pa.s", "Pa·s", "Pas"):
            viscosity = fluid.viscosity
        else:
            viscosity = fluid.viscosity / 1000  # Default cP
    
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
    
    # User specified pressure loss conversion
    user_fixed_loss = None
    if request.userSpecifiedPressureLoss:
        user_loss_unit = request.userSpecifiedPressureLossUnit or "kPa"
        if user_loss_unit == "kPa":
            user_fixed_loss = request.userSpecifiedPressureLoss * 1000
        elif user_loss_unit == "Pa":
            user_fixed_loss = request.userSpecifiedPressureLoss
        elif user_loss_unit == "bar":
            user_fixed_loss = request.userSpecifiedPressureLoss * 100000
        elif user_loss_unit == "psi":
            user_fixed_loss = request.userSpecifiedPressureLoss * 6894.76
        else:
            user_fixed_loss = request.userSpecifiedPressureLoss * 1000
    
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
        userSpecifiedPressureDrop=output.user_fixed_loss,  # Pa
        totalSegmentPressureDrop=output.total_segment_loss,  # Pa
        gasFlowCriticalPressure=output.gas_flow_critical_pressure,  # Pa
    )
    
    # Build state points (pressure stays in Pa for consistency)
    inlet_state = StatePointResponse(
        pressure=output.inlet_pressure,  # Pa
        temperature=output.inlet_temperature,  # K
        density=output.inlet_density,
        velocity=output.inlet_velocity,
        machNumber=output.inlet_mach,
    )
    
    outlet_state = StatePointResponse(
        pressure=output.outlet_pressure,  # Pa
        temperature=output.outlet_temperature,  # K
        density=output.outlet_density,
        velocity=output.outlet_velocity,
        machNumber=output.outlet_mach,
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
            logger.debug(f"   Results: K_total={output.total_K:.4f}, Re={output.reynolds_number:.1f}, Flow={output.flow_scheme}")
            logger.debug(f"   Pressure drop: {output.total_segment_loss:.2f} Pa ({(output.total_segment_loss or 0)/1000:.4f} kPa)")
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