"""Design Agents API router for ProcessDesignAgents integration."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime
import uuid
import json
import asyncio
import logging

# Import ProcessDesignAgents if available
try:
    import sys
    from pathlib import Path
    PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
    sys.path.insert(0, str(PROJECT_ROOT / "apps" / "multi-agents" / "ProcessDesignAgents"))
    from processdesignagents.graph.process_design_graph import ProcessDesignGraph
    from processdesignagents.default_config import DEFAULT_CONFIG
    PROCESS_DESIGN_AGENTS_AVAILABLE = True
except ImportError:
    ProcessDesignGraph = None
    DEFAULT_CONFIG = {}
    PROCESS_DESIGN_AGENTS_AVAILABLE = False

logger = logging.getLogger(__name__)

# Pydantic models for API
class WorkflowConfig(BaseModel):
    llm_provider: str = "openrouter"
    quick_think_model: str = "google/gemini-2.5-flash-lite-preview-09-2025"
    deep_think_model: str = "google/gemini-2.5-flash-preview-09-2025"
    temperature: float = 0.7
    resume_from_last: bool = True

class WorkflowRequest(BaseModel):
    problem_statement: str
    config: Optional[WorkflowConfig] = None

class WorkflowResponse(BaseModel):
    workflow_id: str
    status: str
    message: Optional[str] = None

class WorkflowStatus(BaseModel):
    workflow_id: str
    status: str
    current_step: Optional[int]
    step_statuses: Dict[int, str]
    outputs: Dict[str, Any]
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime
    problem_statement: str
    config: Dict[str, Any]

class StepExecutionRequest(BaseModel):
    step_index: int

class StepExecutionResponse(BaseModel):
    success: bool
    step_index: int
    status: str
    message: str
    next_step_available: bool
    error_message: Optional[str] = None

# In-memory storage
active_workflows: Dict[str, Dict[str, Any]] = {}
workflow_streams: Dict[str, asyncio.Queue] = {}

# Step names
STEP_NAMES = [
    "Process Requirements Analysis",
    "Innovative Research",
    "Conservative Research",
    "Concept Selection",
    "Component List Research",
    "Design Basis Analysis",
    "Flowsheet Design",
    "Equipment & Stream Catalog",
    "Stream Property Estimation",
    "Equipment Sizing",
    "Safety & Risk Analysis",
    "Project Approval"
]

router = APIRouter(prefix="/design-agents", tags=["design-agents"])

@router.get("/health")
async def health_check():
    """Health check for design agents API."""
    return {
        "status": "ok",
        "service": "design-agents-api",
        "process_design_agents": "available" if PROCESS_DESIGN_AGENTS_AVAILABLE else "unavailable"
    }

@router.post("/workflows", response_model=WorkflowResponse)
async def create_workflow(request: WorkflowRequest):
    """Create a new design workflow."""
    if not PROCESS_DESIGN_AGENTS_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="ProcessDesignAgents library is not available. Please check installation."
        )

    workflow_id = str(uuid.uuid4())
    workflow_state = {
        "workflow_id": workflow_id,
        "status": "pending",
        "current_step": 0,
        "step_statuses": {i: "pending" for i in range(12)},
        "outputs": {},
        "error_message": None,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "problem_statement": request.problem_statement,
        "config": request.config.dict() if request.config else {},
        "graph": None,
    }

    active_workflows[workflow_id] = workflow_state
    workflow_streams[workflow_id] = asyncio.Queue()

    # Initialize graph
    try:
        config = DEFAULT_CONFIG.copy()
        config.update(workflow_state["config"])
        graph = ProcessDesignGraph(
            debug=False,
            config=config,
            delay_time=0.1,
            save_graph_image=False
        )
        workflow_state["graph"] = graph
        workflow_state["status"] = "ready"
        workflow_state["updated_at"] = datetime.now()
    except Exception as e:
        logger.error(f"Failed to initialize workflow {workflow_id}: {e}")
        workflow_state["status"] = "error"
        workflow_state["error_message"] = str(e)

    return WorkflowResponse(
        workflow_id=workflow_id,
        status=workflow_state["status"],
        message="Workflow created successfully" if workflow_state["status"] == "ready" else f"Workflow creation failed: {workflow_state.get('error_message', 'Unknown error')}"
    )

@router.get("/workflows/{workflow_id}", response_model=WorkflowStatus)
async def get_workflow_status(workflow_id: str):
    """Get the current status of a workflow."""
    if workflow_id not in active_workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")

    workflow = active_workflows[workflow_id]
    return WorkflowStatus(**workflow)

@router.post("/workflows/{workflow_id}/execute/{step_index}", response_model=StepExecutionResponse)
async def execute_workflow_step(workflow_id: str, step_index: int, request: StepExecutionRequest):
    """Execute a specific step in the workflow."""
    if workflow_id not in active_workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")

    if request.step_index != step_index:
        raise HTTPException(status_code=400, detail="Step index mismatch")

    workflow = active_workflows[workflow_id]

    if workflow["status"] not in ["ready", "running"]:
        raise HTTPException(
            status_code=409,
            detail=f"Workflow is in {workflow['status']} state. Cannot execute step."
        )

    if step_index < 0 or step_index > 11:
        raise HTTPException(status_code=400, detail="Invalid step index")

    # Check prerequisites
    if step_index > 0 and workflow["step_statuses"][step_index - 1] != "completed":
        raise HTTPException(
            status_code=409,
            detail=f"Previous step {step_index - 1} must be completed first"
        )

    # Update status and execute
    workflow["status"] = "running"
    workflow["current_step"] = step_index
    workflow["updated_at"] = datetime.now()

    # Simulate step execution (TODO: replace with actual ProcessDesignGraph execution)
    try:
        await asyncio.sleep(2)  # Simulate processing time
        step_output = generate_mock_step_output(step_index)

        workflow["outputs"].update(step_output)
        workflow["step_statuses"][step_index] = "completed"
        workflow["status"] = "ready"
        workflow["updated_at"] = datetime.now()

        return StepExecutionResponse(
            success=True,
            step_index=step_index,
            status="completed",
            message=f"Successfully completed step {step_index}: {STEP_NAMES[step_index]}",
            next_step_available=step_index < 11,
        )
    except Exception as e:
        workflow["status"] = "error"
        workflow["step_statuses"][step_index] = "error"
        workflow["error_message"] = str(e)

        return StepExecutionResponse(
            success=False,
            step_index=step_index,
            status="error",
            message=f"Failed to execute step {step_index}: {STEP_NAMES[step_index]}",
            next_step_available=False,
            error_message=str(e)
        )

@router.get("/workflows/{workflow_id}/stream")
async def stream_workflow_updates(workflow_id: str):
    """Stream real-time updates for a workflow."""
    if workflow_id not in workflow_streams:
        raise HTTPException(status_code=404, detail="Workflow stream not found")

    async def event_generator():
        queue = workflow_streams[workflow_id]
        try:
            while True:
                try:
                    update = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {update}\n\n"
                except asyncio.TimeoutError:
                    yield "data: {\"type\": \"heartbeat\", \"timestamp\": \"" + datetime.now().isoformat() + "\"}\n\n"
        except Exception as e:
            logger.error(f"Stream error for workflow {workflow_id}: {e}")
            yield f"data: {{\"type\": \"error\", \"message\": \"{str(e)}\"}}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

@router.delete("/workflows/{workflow_id}")
async def delete_workflow(workflow_id: str):
    """Delete a workflow and clean up resources."""
    if workflow_id in active_workflows:
        del active_workflows[workflow_id]
    if workflow_id in workflow_streams:
        del workflow_streams[workflow_id]

    return {"message": "Workflow deleted successfully"}

def generate_mock_step_output(step_index: int) -> Dict[str, Any]:
    """Generate mock output for a step (for development/testing)."""
    mock_outputs = {
        0: {"processRequirements": "# Process Requirements\n\nAnalyzed successfully"},
        1: {"researchConcepts": '[{"title": "ATR", "feasibility_score": 8.5}]'},
        2: {"researchRatingResults": '[{"concept": "ATR", "score": 8.0}]'},
        3: {"selectedConceptName": "ATR", "selectedConceptDetails": "# ATR Process", "selectedConceptEvaluation": "Selected"},
        4: {"componentList": "# Components\n- Methane\n- Water"},
        5: {"designBasis": "# Design Basis\n- Conditions defined"},
        6: {"flowsheetDescription": "# Flowsheet\n- Process steps"},
        7: {"equipmentListTemplate": "Template", "streamListTemplate": "Template"},
        8: {"streamListResults": '[{"id": "S001", "name": "Feed"}]'},
        9: {"equipmentListResults": '[{"id": "R001", "name": "Reactor"}]'},
        10: {"safetyRiskAnalystReport": "# Safety Analysis\n- Risks identified"},
        11: {"projectManagerReport": "# Final Report", "projectApproval": "Approved"}
    }
    return mock_outputs.get(step_index, {})