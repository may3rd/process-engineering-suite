"""Pydantic schemas for the FastAPI hydraulics calculation API."""
from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


class FittingRequest(BaseModel):
    """Single fitting with type and count."""
    type: str
    count: int = 1
    k_each: Optional[float] = None
    k_total: Optional[float] = None


class ControlValveRequest(BaseModel):
    """Control valve parameters."""
    cv: Optional[float] = None
    pressureDrop: Optional[float] = None
    pressureDropUnit: Optional[str] = None
    inputMode: Optional[str] = None  # "cv" | "pressure_drop"
    cg: Optional[float] = None
    xT: Optional[float] = None
    C1: Optional[float] = None


class OrificeRequest(BaseModel):
    """Orifice parameters."""
    diameter: Optional[float] = None
    pressureDrop: Optional[float] = None
    pressureDropUnit: Optional[str] = None
    inputMode: Optional[str] = None  # "diameter" | "pressure_drop" | "beta_ratio"
    betaRatio: Optional[float] = None


class FluidRequest(BaseModel):
    """Fluid properties matching TypeScript Fluid interface."""
    name: Optional[str] = None
    phase: Optional[str] = None  # "liquid" | "gas"
    density: Optional[float] = None
    densityUnit: Optional[str] = None
    viscosity: Optional[float] = None
    viscosityUnit: Optional[str] = None
    molecularWeight: Optional[float] = None
    zFactor: Optional[float] = None
    specificHeatRatio: Optional[float] = None


class PipeSectionRequest(BaseModel):
    """Pipe section input data matching TypeScript PipeProps interface."""
    id: str
    name: str
    startNodeId: Optional[str] = None
    endNodeId: Optional[str] = None
    direction: Optional[str] = "forward"  # "forward" | "backward"
    
    # Dimensions
    length: Optional[float] = None
    lengthUnit: Optional[str] = "m"
    diameter: Optional[float] = None
    pipeDiameter: Optional[float] = None
    diameterUnit: Optional[str] = "mm"
    pipeDiameterUnit: Optional[str] = "mm"
    inletDiameter: Optional[float] = None
    inletDiameterUnit: Optional[str] = "mm"
    outletDiameter: Optional[float] = None
    outletDiameterUnit: Optional[str] = "mm"
    roughness: Optional[float] = None
    roughnessUnit: Optional[str] = "mm"
    elevation: Optional[float] = None
    elevationUnit: Optional[str] = "m"
    
    # Flow properties
    massFlowRate: Optional[float] = None
    massFlowRateUnit: Optional[str] = "kg/h"
    designMassFlowRate: Optional[float] = None
    designMassFlowRateUnit: Optional[str] = "kg/h"
    designMargin: Optional[float] = None
    
    # Boundary conditions
    boundaryPressure: Optional[float] = None
    boundaryPressureUnit: Optional[str] = "kPa"
    boundaryTemperature: Optional[float] = None
    boundaryTemperatureUnit: Optional[str] = "K"
    
    # Pipe configuration
    pipeSectionType: Optional[str] = None
    fittingType: Optional[str] = "LR"
    fittings: Optional[List[FittingRequest]] = None
    schedule: Optional[str] = "40"
    
    # K values
    fittingK: Optional[float] = None
    pipeLengthK: Optional[float] = None
    userK: Optional[float] = None
    totalK: Optional[float] = None
    pipingFittingSafetyFactor: Optional[float] = None
    
    # Equipment
    controlValve: Optional[ControlValveRequest] = None
    orifice: Optional[OrificeRequest] = None
    
    # Other
    erosionalConstant: Optional[float] = 100.0
    gasFlowModel: Optional[str] = "isothermal"  # "isothermal" | "adiabatic"
    userSpecifiedPressureLoss: Optional[float] = None
    userSpecifiedPressureLossUnit: Optional[str] = None
    
    # Fluid
    fluid: Optional[FluidRequest] = None


class FittingBreakdownResponse(BaseModel):
    """Breakdown of K value per fitting type."""
    type: str
    count: int
    k_each: float
    k_total: float


class PressureDropResponse(BaseModel):
    """Pressure drop calculation results."""
    fittingK: Optional[float] = None
    pipeLengthK: Optional[float] = None
    userK: Optional[float] = None
    pipingFittingSafetyFactor: Optional[float] = None
    totalK: Optional[float] = None
    fittingBreakdown: Optional[List[FittingBreakdownResponse]] = None
    reynoldsNumber: Optional[float] = None
    frictionalFactor: Optional[float] = None
    flowScheme: Optional[str] = None
    pipeAndFittingPressureDrop: Optional[float] = None
    elevationPressureDrop: Optional[float] = None
    controlValvePressureDrop: Optional[float] = None
    controlValveCV: Optional[float] = None
    controlValveCg: Optional[float] = None
    orificePressureDrop: Optional[float] = None
    orificeBetaRatio: Optional[float] = None
    userSpecifiedPressureDrop: Optional[float] = None
    totalSegmentPressureDrop: Optional[float] = None
    normalizedPressureDrop: Optional[float] = None
    gasFlowCriticalPressure: Optional[float] = None


class StatePointResponse(BaseModel):
    """State at a specific point (inlet/outlet)."""
    pressure: Optional[float] = None
    temperature: Optional[float] = None
    density: Optional[float] = None
    machNumber: Optional[float] = None
    velocity: Optional[float] = None
    pipeVelocity: Optional[float] = None
    erosionalVelocity: Optional[float] = None
    flowMomentum: Optional[float] = None
    remarks: Optional[str] = None


class ResultSummaryResponse(BaseModel):
    """Summary of inlet/outlet states."""
    inletState: Optional[StatePointResponse] = None
    outletState: Optional[StatePointResponse] = None


class CalculationResponse(BaseModel):
    """Complete calculation response."""
    edgeId: str
    success: bool
    error: Optional[str] = None
    pressureDropResults: Optional[PressureDropResponse] = None
    resultSummary: Optional[ResultSummaryResponse] = None
    equivalentLength: Optional[float] = None


# --- Length Estimation Schemas ---

class LengthEstimationRequest(BaseModel):
    """Request for solving pipe length from target pressure drop."""
    id: str
    name: str
    
    # Target pressure drop
    targetPressureDrop: float  # Pa
    
    # Pipe dimensions (SI)
    pipeDiameter: Optional[float] = None  # mm
    pipeDiameterUnit: Optional[str] = "mm"
    inletDiameter: Optional[float] = None
    inletDiameterUnit: Optional[str] = "mm"
    outletDiameter: Optional[float] = None
    outletDiameterUnit: Optional[str] = "mm"
    roughness: Optional[float] = None  # mm
    roughnessUnit: Optional[str] = "mm"
    elevation: Optional[float] = None  # m
    elevationUnit: Optional[str] = "m"
    
    # Flow
    massFlowRate: Optional[float] = None  # kg/h
    massFlowRateUnit: Optional[str] = "kg/h"
    boundaryPressure: Optional[float] = None  # kPag
    boundaryPressureUnit: Optional[str] = "kPag"
    boundaryTemperature: Optional[float] = None  # C or K
    boundaryTemperatureUnit: Optional[str] = "C"
    
    # Fittings
    fittingType: Optional[str] = "LR"
    fittings: Optional[List[FittingRequest]] = None
    schedule: Optional[str] = "40"
    userK: Optional[float] = None
    pipingFittingSafetyFactor: Optional[float] = None
    
    # Fluid
    fluid: Optional[FluidRequest] = None
    
    # Direction
    direction: Optional[str] = "forward"
    gasFlowModel: Optional[str] = "isothermal"
    
    # Solver bounds
    lengthMin: Optional[float] = 0.1  # meters
    lengthMax: Optional[float] = 10000.0  # meters
    tolerance: Optional[float] = 10.0  # Pa


class LengthEstimationResponse(BaseModel):
    """Response from length estimation."""
    pipeId: str
    success: bool
    estimatedLength: Optional[float] = None  # meters
    error: Optional[str] = None
    converged: bool = False
    finalError: Optional[float] = None  # Pa
    iterations: int = 0
