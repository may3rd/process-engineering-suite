"""Helpers for serializing and comparing solver results in regression tests."""
from __future__ import annotations

from typing import Any, Dict, Optional

from network_hydraulic.models.results import (
    NetworkResult,
    PressureDropDetails,
    SectionResult,
    StatePoint,
)
from network_hydraulic.models.network_system import NetworkSystemResult, NetworkResultBundle


def _round_value(value: Optional[float], precision: int = 9) -> Optional[float]:
    if value is None:
        return None
    return round(float(value), precision)


def serialize_state(state: StatePoint) -> Dict[str, Optional[float]]:
    return {
        "pressure": _round_value(state.pressure),
        "temperature": _round_value(state.temperature),
        "density": _round_value(state.density),
        "mach_number": _round_value(state.mach_number),
        "velocity": _round_value(state.velocity),
        "pipe_velocity": _round_value(state.pipe_velocity),
        "erosional_velocity": _round_value(state.erosional_velocity),
        "flow_momentum": _round_value(state.flow_momentum),
    }


def serialize_pressure_drop(details: PressureDropDetails) -> Dict[str, Optional[float]]:
    return {
        "pipe_and_fittings": _round_value(details.pipe_and_fittings),
        "elevation_change": _round_value(details.elevation_change),
        "control_valve_pressure_drop": _round_value(details.control_valve_pressure_drop),
        "orifice_pressure_drop": _round_value(details.orifice_pressure_drop),
        "user_specified_fixed_loss": _round_value(details.user_specified_fixed_loss),
        "total_segment_loss": _round_value(details.total_segment_loss),
        "normalized_friction_loss": _round_value(details.normalized_friction_loss),
        "reynolds_number": _round_value(details.reynolds_number),
        "frictional_factor": _round_value(details.frictional_factor),
        "critical_pressure": _round_value(details.gas_flow_critical_pressure),
    }


def serialize_section(section: SectionResult) -> Dict[str, Any]:
    return {
        "section_id": section.section_id,
        "pressure_drop": serialize_pressure_drop(section.calculation.pressure_drop),
        "summary": {
            "inlet": serialize_state(section.summary.inlet),
            "outlet": serialize_state(section.summary.outlet),
        },
    }


def serialize_result(result: NetworkResult) -> Dict[str, Any]:
    return {
        "aggregate": serialize_pressure_drop(result.aggregate.pressure_drop),
        "summary": {
            "inlet": serialize_state(result.summary.inlet),
            "outlet": serialize_state(result.summary.outlet),
        },
        "sections": [serialize_section(section) for section in result.sections],
    }


def snapshot_payload(
    *,
    network_name: str,
    config_path: str,
    result: NetworkResult,
) -> Dict[str, Any]:
    """Build the JSON-ready payload used by regression fixtures."""
    return {
        "network": network_name,
        "config": config_path,
        "result": serialize_result(result),
    }


def system_snapshot_payload(
    *,
    config_path: str,
    result: NetworkSystemResult,
) -> Dict[str, Any]:
    """Build payload for multi-network snapshots."""
    return {
        "config": config_path,
        "bundles": [
            {
                "id": bundle.bundle_id,
                "network": bundle.network.name,
                "result": serialize_result(bundle.result),
            }
            for bundle in result.bundles
        ],
        "shared_nodes": {node: _round_value(pressure) for node, pressure in result.shared_node_pressures.items()},
    }
