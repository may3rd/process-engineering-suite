from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class Quantity(BaseModel):
    """Physical quantity with a numeric value and units."""

    value: float = Field(..., description="Numeric value of the quantity.")
    unit: Optional[str] = Field(None, description="Engineering unit for the quantity (e.g., 'kg/h').")


class SizingParameter(BaseModel):
    """Placeholder for downstream sizing inputs."""

    name: str = Field(..., description="Name of the sizing parameter (e.g., 'Area').")
    quantity: Quantity = Field(..., description="Numerical value and unit for the sizing parameter.")


class Equipment(BaseModel):
    """Equipment entry matching the equipment_and_stream_results JSON contract."""

    id: str = Field(..., description="Unique equipment identifier (e.g., 'E-101').")
    name: str = Field(..., description="Descriptive equipment name.")
    service: str = Field(..., description="Narrative of the equipment duty or role.")
    type: str = Field(..., description="Equipment type classification (e.g., 'Shell-and-tube exchanger').")
    category: str = Field(..., description="Equipment category (Pump, Heat Exchanger, Reactor, etc.).")
    streams_in: List[str] = Field(
        default_factory=list,
        description="List of inlet stream IDs connected to this equipment.",
    )
    streams_out: List[str] = Field(
        default_factory=list,
        description="List of outlet stream IDs connected to this equipment.",
    )
    design_criteria: str = Field(
        ...,
        description="Design targets or constraints for the equipment.",
    )
    sizing_parameters: List[SizingParameter] = Field(
        default_factory=list,
        description="Sizing parameters passed to downstream sizing tools.",
    )
    notes: Optional[str] = Field(
        None,
        description="Special considerations, constraints, or implementation notes.",
    )


class CompositionEntry(BaseModel):
    """Component molar fraction entry."""

    value: Optional[float] = Field(
        None,
        description="Molar fraction (0.0 to 1.0) or null if unknown.",
    )
    unit: str = Field(
        "molar fraction",
        description="Unit for the composition entry; defaults to molar fraction.",
    )


class Stream(BaseModel):
    """Stream entry matching the equipment_and_stream_results JSON contract."""

    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., description="Unique stream identifier (e.g., '1001').")
    name: str = Field(..., description="Descriptive stream name.")
    description: str = Field(..., description="Purpose and location of the stream in the process.")
    source: str = Field(..., alias="from", description="Source equipment ID or external inlet.")
    destination: str = Field(..., alias="to", description="Destination equipment ID or external outlet.")
    phase: str = Field(..., description="Physical phase (Liquid, Vapor, Two-Phase, etc.).")
    properties: Dict[str, Quantity] = Field(
        default_factory=dict,
        description="Key process properties keyed by property name, each with value and unit.",
    )
    compositions: Dict[str, CompositionEntry] = Field(
        default_factory=dict,
        description="Component molar fractions keyed by component name.",
    )
    notes: Optional[str] = Field(
        None,
        description="Stream-specific design considerations or assumptions.",
    )

class EquipmentAndStreamList(BaseModel):
    """Canonical equipment and stream list produced by the LangGraph pipeline."""

    model_config = ConfigDict(populate_by_name=True)

    equipments: List[Equipment] = Field(
        default_factory=list,
        description="All equipment units captured in the process flow diagram.",
    )
    streams: List[Stream] = Field(
        default_factory=list,
        description="All process, utility, recycle, bypass, and vent streams.",
    )
    notes_and_assumptions: List[str] = Field(
        default_factory=list,
        description="Outstanding assumptions, TBD items, or design caveats.",
    )
