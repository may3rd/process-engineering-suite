from __future__ import annotations

import os

def load_config():
    return {
        "deep_think_llm": "google/gemini-2.5-flash-lite",  # Retain for future; requires OpenAI
        "quick_think_llm": "google/gemini-2.5-flash-lite",
        "deep_think_temperature": 0.0,
        "quick_think_temperature": 0.0,
        "backend_url": "https://openrouter.ai/api/v1",
        "llm_provider": "openrouter",
        "online_tools": True,
        "data_dir": "/Users/maetee/Documents/Code/ScAI/FR1-data",
        "data_cache_dir": "./sizing_tools/data_cache",
        "results_dir": "./results",
        "save_dir": "./reports",
        "max_debate_rounds": 3,
        "property_data_source": "pubchem",
        "simulator": "dwsim"
    }
    
DEFAULT_CONFIG = {
    "project_dir": os.path.abspath(os.path.join(os.path.dirname(__file__), ".")),
    "results_dir": os.getenv("RESULTS_DIR", "./results"),
    "data_dir": "/Users/maetee/Documents/Code/ScAI/FR1-data",
    "data_cache_dir": os.path.join(
        os.path.abspath(os.path.join(os.path.dirname(__file__), ".")),
        "sizing_tools/data_cache",
    ),
    # LLM settings
    "llm_provider": "openrouter",
    "deep_think_llm": "google/gemini-2.5-flash-lite-preview-09-2025",
    "quick_think_llm": "google/gemini-2.5-flash-lite-preview-09-2025",
    "backend_url": "https://openrouter.ai/api/v1",
    "deep_think_temperature": 0.7,
    "quick_think_temperature": 0.7,
    # Project Directory
    "data_dir": "/Users/maetee/Documents/Code/Temp",
    "data_cache_dir": "./sizing_tools/data_cache",
    "results_dir": "./results",
    "save_dir": "./reports",
    # Debate and discussion settings
    "max_debate_rounds": 1,
    "max_risk_discuss_rounds": 1,
    "max_recur_limit": 100,
    "max_agent_call": 10,
    # Tool settings
    "online_tools": True,
    "property_data_source": "pubchem",
    "simulator": "dwsim",
    # Category-level configuration (default for all tools in category)
    "category_level_methods": {
        "heat_exchanger": "preliminary",
        "pressurized_vessel": "preliminary",
        "pump": "preliminary",
        "compressor": "preliminary",
        "tank": "preliminary",
        "vertical_pressurized_vessel": "preliminary",
        "horizontal_pressurized_vessel": "preliminary",
    },
    # Tool-level configuration (takes precedence over category-level)
    "sizing_tool_methods": {
        "basic_heat_exchanger_sizing": "preliminary",
        "basic_pressurized_vessel_sizing": "preliminary",
    },
}