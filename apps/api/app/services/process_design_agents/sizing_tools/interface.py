from __future__ import annotations

#Import each methods
from .preliminary import (
    prelim_basic_heat_exchanger_sizing,
    prelim_air_cooler_sizing,
    prelim_pump_sizing,
    prelim_compressor_sizing,
    prelim_distillation_column_sizing,
    prelim_absorption_column_sizing,
    prelim_separator_vessel_sizing,
    prelim_pressure_safety_valve_sizing,
    prelim_blowdown_valve_sizing,
    prelim_vent_valve_sizing,
    prelim_storage_tank_sizing,
    prelim_surge_drum_sizing,
    prelim_reactor_vessel_sizing,
    prelim_knockout_drum_sizing,
    prelim_filter_vessel_sizing,
    prelim_dryer_vessel_sizing,
)

#Import configuration
from .config import get_config

# Tools organized by equipment category
SIZING_TOOLS_BY_CATEGORIES = {
    "heat_exchanger": {
        "description": "Size a heat exchanger.",
        "tools": [
            "basic_heat_exchanger_sizing",
            "air_cooler_sizing"
        ]
    },
    "vessel": {
        "description": "Size a vessel.",
        "tools": [
            "separator_vessel_sizing",
            "storage_tank_sizing",
            "surge_drum_sizing",
            "reactor_vessel_sizing",
            "knockout_drum_sizing",
            "filter_vessel_sizing",
            "dryer_vessel_sizing"
        ]
    },
    "pump": {
        "description": "Size a pump.",
        "tools": [
            "pump_sizing",
        ]
    },
    "compressor": {
        "description": "Size a compressor.",
        "tools": [
            "compressor_sizing",
        ]
    },
    "distillation_column": {
        "description": "Size a distillation column.",
        "tools": [
            "distillation_column_sizing",
        ]
    },
    "absorption_column": {
        "description": "Size an absorption column.",
        "tools": [
            "absorption_column_sizing",
        ]
    },
    "valve": {
        "description": "Size a valve.",
        "tools": [
            "pressure_safety_valve_sizing",
            "blowdown_valve_sizing",
            "vent_valve_sizing",
        ]
    }
}

# Mapping of methods to their sizing methods implementation
SIZING_TOOL_METHODS = {
    "basic_heat_exchanger_sizing": {
        "preliminary": prelim_basic_heat_exchanger_sizing
    },
    "air_cooler_sizing": {
        "preliminary": prelim_air_cooler_sizing
    },
    "pump_sizing": {
        "preliminary": prelim_pump_sizing
    },
    "compressor_sizing": {
        "preliminary": prelim_compressor_sizing
    },
    "distillation_column_sizing": {
        "preliminary": prelim_distillation_column_sizing
    },
    "absorption_column_sizing": {
        "preliminary": prelim_absorption_column_sizing
    },
    "separator_vessel_sizing": {
        "preliminary": prelim_separator_vessel_sizing
    },
    "storage_tank_sizing": {
        "preliminary": prelim_storage_tank_sizing
    },
    "surge_drum_sizing": {
        "preliminary": prelim_surge_drum_sizing
    },
    "reactor_vessel_sizing": {
        "preliminary": prelim_reactor_vessel_sizing
    },
    "knockout_drum_sizing": {
        "preliminary": prelim_knockout_drum_sizing
    },
    "filter_vessel_sizing": {
        "preliminary": prelim_filter_vessel_sizing
    },
    "dryer_vessel_sizing": {
        "preliminary": prelim_dryer_vessel_sizing
    },
    "pressure_safety_valve_sizing": {
        "preliminary": prelim_pressure_safety_valve_sizing
    },
    "blowdown_valve_sizing": {
        "preliminary": prelim_blowdown_valve_sizing
    },
    "vent_valve_sizing": {
        "preliminary": prelim_vent_valve_sizing
    }
}

def get_category_for_method(method: str) -> str:
    """Get the category that contains the specified method."""
    for category, info in SIZING_TOOLS_BY_CATEGORIES.items():
        if method in info["tools"]:
            return category
    raise ValueError(f"Method '{method}' not found in any category")

def get_vendor(category: str, method: str = None) -> str:
    """Get the configured vendor for a data category or specific tool method.
    Tool-level configuration takes precedence over category-level.
    """
    config = get_config()
    
    # Check tool-level configuration first (if method provided)
    if method:
        sizing_tool_methods = config.get("sizing_tool_methods", {})
        if method in sizing_tool_methods:
            return sizing_tool_methods[method]

    # Fall back to category-level configuration
    return config.get("category_level_methods", {}).get(category, "default")


def equipment_sizing(method: str, *args, **kwargs) -> str:
    """Route method calls to appropriate sizing implementation with fallback support."""
    if method not in SIZING_TOOL_METHODS:
        raise ValueError(f"Method '{method}' not suppored.")
    else:
        print(f"DEBUG: Calling method '{method}' with args: {args}, kwargs: {kwargs}", flush=True)
        
    category = get_category_for_method(method)
    method_config = get_vendor(category, method)

    primary_methods = [value.strip() for value in method_config.split(",") if value.strip()]
    if not primary_methods:
        primary_methods = list(SIZING_TOOL_METHODS[method].keys())

    available_methods = list(SIZING_TOOL_METHODS[method].keys())
    fallback_vendors = primary_methods + [
        candidate for candidate in available_methods if candidate not in primary_methods
    ]

    primary_str = " → ".join(primary_methods)
    fallback_str = " → ".join(fallback_vendors)
    print(f"DEBUG: {method} - Primary: [{primary_str}], Fallback: [{fallback_str}]")

    results = []
    method_attempt_count = 0

    for vendor_method in fallback_vendors:
        vendor_impl = SIZING_TOOL_METHODS[method].get(vendor_method)
        if vendor_impl is None:
            if vendor_method in primary_methods:
                print(f"INFO: Method '{vendor_method}' not supported for '{method}', trying fallback.")
            continue

        method_attempt_count += 1
        is_primary = vendor_method in primary_methods
        method_label = "PRIMARY" if is_primary else "FALLBACK"
        print(f"DEBUG: Attempting {method_label} method '{vendor_method}' for {method} (attempt #{method_attempt_count})")

        impl_functions = vendor_impl if isinstance(vendor_impl, list) else [vendor_impl]
        if len(impl_functions) > 1:
            print(f"DEBUG: Method '{vendor_method}' exposes {len(impl_functions)} implementations")

        vendor_results = []
        for impl_func in impl_functions:
            try:
                print(f"DEBUG: Calling {impl_func.__name__} via '{vendor_method}'...")
                vendor_results.append(impl_func(*args, **kwargs))
                print(f"SUCCESS: {impl_func.__name__} via '{vendor_method}' completed")
            except Exception as exc:
                print(f"FAILED: {impl_func.__name__} via '{vendor_method}' raised: {exc}")

        if vendor_results:
            results.extend(vendor_results)
            print(f"SUCCESS: Collected {len(vendor_results)} result(s) using '{vendor_method}'")
            if len(primary_methods) == 1:
                print(f"DEBUG: Stopping after successful method '{vendor_method}' (single-vendor config)")
                break
        else:
            print(f"FAILED: No usable results from method '{vendor_method}'")

    if len(results) == 1:
        return results[0]

    return "\n".join(str(result) for result in results)
