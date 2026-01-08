"""Design Agents API router for ProcessDesignAgents integration."""

import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from pathlib import Path
import sys
import uuid
import json

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import uvicorn

# Add ProcessDesignAgents to path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "apps" / "multi-agents" / "ProcessDesignAgents"))

try:
    from processdesignagents.graph.process_design_graph import ProcessDesignGraph
    from processdesignagents.default_config import DEFAULT_CONFIG
    PROCESS_DESIGN_AGENTS_AVAILABLE = True
except ImportError as e:
    logging.warning(f"ProcessDesignAgents not available: {e}")
    ProcessDesignGraph = None
    DEFAULT_CONFIG = {}
    PROCESS_DESIGN_AGENTS_AVAILABLE = False

logger = logging.getLogger(__name__)

# Pydantic models for API
class WorkflowConfig(BaseModel):
    """Configuration for workflow execution."""
    llm_provider: str = Field(default="openrouter", description="LLM provider to use")
    quick_think_model: str = Field(default="google/gemini-2.5-flash-lite-preview-09-2025", description="Quick thinking model")
    deep_think_model: str = Field(default="google/gemini-2.5-flash-preview-09-2025", description="Deep thinking model")
    temperature: float = Field(default=0.7, ge=0.0, le=1.0, description="Temperature for generation")
    resume_from_last: bool = Field(default=True, description="Resume from last checkpoint")

class WorkflowRequest(BaseModel):
    """Request to start a new workflow."""
    problem_statement: str = Field(..., description="The design problem to solve")
    config: WorkflowConfig = Field(default_factory=WorkflowConfig, description="Workflow configuration")

class WorkflowResponse(BaseModel):
    """Response for workflow operations."""
    workflow_id: str
    status: str
