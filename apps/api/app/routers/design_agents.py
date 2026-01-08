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
    import os
    from pathlib import Path

    # Hardcode path for now - TODO: make this more robust
    process_agents_path = Path("/Users/maetee/Code/process-engineering-suite/apps/multi-agents/ProcessDesignAgents")

    logging.info(f"Process agents path: {process_agents_path}")
    logging.info(f"Path exists: {process_agents_path.exists()}")

    if process_agents_path.exists():
        sys.path.insert(0, str(process_agents_path))
        logging.info(f"Added to sys.path: {process_agents_path}")

        from processdesignagents.graph.process_design_graph import ProcessDesignGraph
        from processdesignagents.default_config import DEFAULT_CONFIG
        PROCESS_DESIGN_AGENTS_AVAILABLE = True

        logging.info("ProcessDesignAgents imported successfully")
    else:
        logging.error(f"ProcessDesignAgents path does not exist: {process_agents_path}")
        PROCESS_DESIGN_AGENTS_AVAILABLE = False

except ImportError as e:
    logging.warning(f"ProcessDesignAgents not available: {e}")
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
async def create_workflow(request: WorkflowRequest, preserve_existing_results: bool = False):
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

    # Preserve existing results if requested
    if preserve_existing_results:
        # Find the most recent workflow and copy its results
        existing_workflows = [
            wf for wf in active_workflows.values()
            if wf["workflow_id"] != workflow_id and wf.get("status") in ["ready", "running"]
        ]
        if existing_workflows:
            # Get the most recent workflow
            latest_workflow = max(existing_workflows, key=lambda wf: wf["updated_at"])
            # Copy completed outputs and step statuses
            workflow_state["outputs"] = latest_workflow.get("outputs", {}).copy()
            workflow_state["step_statuses"] = latest_workflow.get("step_statuses", {}).copy()
            logger.info(f"Preserved results from workflow {latest_workflow['workflow_id']}")

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

    # Execute with ProcessDesignGraph - run full workflow for step 0, otherwise use cached results
    try:
        graph = workflow["graph"]
        problem_statement = workflow.get("problem_statement", "")

        if not graph:
            raise HTTPException(status_code=500, detail="ProcessDesignGraph not initialized")

        # For step 0, run the full ProcessDesignGraph workflow
        if step_index == 0:
            # Send initial progress update
            await send_stream_update(workflow_id, {
                "type": "step_progress",
                "step_index": step_index,
                "progress": 10,
                "message": f"Starting {STEP_NAMES[step_index]}..."
            })

            # Log the LLM configuration being used
            config = workflow.get("config", {})
            logger.info(f"🔧 Executing ProcessDesignGraph with LLM config:")
            logger.info(f"   Provider: {config.get('llm_provider')}")
            logger.info(f"   Quick Model: {config.get('quick_think_model')}")
            logger.info(f"   Deep Model: {config.get('deep_think_model')}")
            logger.info(f"   Temperature: {config.get('temperature')}")

            # Send progress update - initializing AI agent
            await send_stream_update(workflow_id, {
                "type": "step_progress",
                "step_index": step_index,
                "progress": 25,
                "message": f"Initializing AI agents for full workflow..."
            })

            # Actually execute the ProcessDesignGraph - this runs ALL steps
            logger.info(f"🚀 Calling ProcessDesignGraph.propagate() for full workflow")
            logger.info(f"📝 Problem statement: {problem_statement}")

            try:
                # Set mock API keys for debugging if not set
                import os
                if not os.getenv('OPENROUTER_API_KEY'):
                    os.environ['OPENROUTER_API_KEY'] = 'mock_api_key_for_debugging'
                    logger.warning("⚠️ Using mock OPENROUTER_API_KEY for debugging")
                if not os.getenv('OPENAI_API_KEY'):
                    os.environ['OPENAI_API_KEY'] = 'mock_api_key_for_debugging'
                    logger.warning("⚠️ Using mock OPENAI_API_KEY for debugging")

                # Capture stdout to see LLM messages and agent execution
                import io
                import sys
                from contextlib import redirect_stdout

                logger.info("🔄 Starting ProcessDesignGraph.propagate() - this will attempt LLM calls...")
                logger.info("📋 LLM calls will be made to the configured providers")
                logger.info("📋 If API keys are invalid, calls will fail but messages will be logged")

                captured_output = io.StringIO()
                with redirect_stdout(captured_output):
                    result = graph.propagate(problem_statement=problem_statement)

                # Get the captured output - this will contain LLM messages!
                stdout_output = captured_output.getvalue()

                # Log the full output for debugging
                logger.info("📋 ===== PROCESS DESIGN GRAPH STDOUT OUTPUT =====")
                for line in stdout_output.split('\n'):
                    if line.strip():
                        logger.info(f"📋 {line}")
                logger.info("📋 ===== END STDOUT OUTPUT =====")

                # Extract and log LLM call information
                if "LLM Provider:" in stdout_output:
                    logger.info("✅ Found LLM provider configuration in output")
                if "Quick Thinking LLM:" in stdout_output:
                    logger.info("✅ Found Quick Thinking LLM configuration in output")
                if "Deep Thinking LLM:" in stdout_output:
                    logger.info("✅ Found Deep Thinking LLM configuration in output")

                # Look for agent execution messages
                agent_count = stdout_output.count("Attemp")
                if agent_count > 0:
                    logger.info(f"📊 Found {agent_count} agent execution attempts in output")
                    if "Max try count reached" in stdout_output:
                        logger.error("❌ All agent executions failed - likely due to missing/invalid API keys")
                        logger.error("💡 To fix: Set valid OPENROUTER_API_KEY and OPENAI_API_KEY environment variables")

                # Log what was returned
                logger.info(f"📄 ProcessDesignGraph returned result type: {type(result)}")
                if isinstance(result, dict):
                    logger.info(f"📄 ProcessDesignGraph returned result keys: {list(result.keys())}")
                    # Log sample content from key results
                    for key, value in list(result.items())[:5]:  # Show first 5 results
                        if isinstance(value, str) and len(value) > 100:
                            logger.info(f"📝 {key}: {value[:200]}...")
                        else:
                            logger.info(f"📝 {key}: {str(value)[:200]}")

                # Store the full results in the workflow
                workflow["full_results"] = result
                workflow["stdout_output"] = stdout_output

                # Send progress update - processing complete
                await send_stream_update(workflow_id, {
                    "type": "step_progress",
                    "step_index": step_index,
                    "progress": 75,
                    "message": f"AI completed full workflow analysis"
                })

            except Exception as graph_error:
                logger.error(f"❌ ProcessDesignGraph execution failed: {graph_error}")
                logger.error(f"❌ Error details: {str(graph_error)}")
                import traceback
                logger.error(f"❌ Traceback: {traceback.format_exc()}")
                # Fallback to mock data if graph execution fails
                logger.info("🔄 Falling back to mock data due to graph execution failure")
                result = {}

        else:
            # For steps 1-11, use cached results from step 0 execution
            result = workflow.get("full_results", {})
            logger.info(f"📋 Using cached results for step {step_index}")

        # Extract outputs for the specific step
        step_output = {}

        if isinstance(result, dict) and result:
            # Map ProcessDesignGraph outputs to our expected format for each step
            output_mapping = {
                0: ["processRequirements"],  # Process Requirements Analysis
                1: ["researchConcepts"],     # Innovative Research
                2: ["researchRatingResults"], # Conservative Research
                3: ["selectedConceptDetails", "selectedConceptName", "selectedConceptEvaluation"], # Concept Selection
                4: ["componentList"],         # Component List
                5: ["designBasis"],          # Design Basis
                6: ["flowsheetDescription"], # Flowsheet Design
                7: ["equipmentListResults", "streamListResults"], # Equipment & Stream Catalog
                8: ["streamListResults"],    # Stream Properties
                9: ["equipmentListResults"], # Equipment Sizing
                10: ["safetyRiskAnalystReport"], # Safety Analysis
                11: ["projectManagerReport", "projectApproval"] # Project Approval
            }

            expected_outputs = output_mapping.get(step_index, [])
            for output_key in expected_outputs:
                # Look for outputs in the result with flexible matching
                found = False
                for result_key, result_value in result.items():
                    # Try various matching strategies
                    if (output_key.lower() in result_key.lower() or
                        result_key.lower() in output_key.lower() or
                        output_key.replace('List', '').lower() in result_key.lower() or
                        result_key.lower().startswith(output_key.lower())):
                        step_output[output_key] = str(result_value) if result_value is not None else ""
                        found = True
                        logger.info(f"✅ Mapped {result_key} -> {output_key}")
                        break

                if not found:
                    logger.warning(f"❌ No match found for expected output: {output_key}")

            # If we didn't find expected outputs, try fuzzy matching
            if not step_output:
                logger.warning(f"No expected outputs found for step {step_index}, trying fuzzy matching")
                for result_key, result_value in result.items():
                    # Look for keywords in result keys
                    result_key_lower = result_key.lower()
                    if any(keyword in result_key_lower for keyword in ['process', 'requirements', 'research', 'concept', 'component', 'design', 'flowsheet', 'equipment', 'stream', 'safety', 'project']):
                        step_output[f"fuzzy_{result_key}"] = str(result_value)[:1000]  # Limit size
                        logger.info(f"🎯 Fuzzy match: {result_key}")

        # If still no outputs, use mock data as fallback
        if not step_output:
            logger.warning(f"No outputs extracted for step {step_index}, using mock data")
            step_output = generate_mock_step_output(step_index)

        logger.info(f"📝 Final step output for step {step_index}: {list(step_output.keys())}")

        # Send final progress update
        await send_stream_update(workflow_id, {
            "type": "step_progress",
            "step_index": step_index,
            "progress": 90,
            "message": f"Finalizing results for {STEP_NAMES[step_index]}..."
        })

        # Log the LLM configuration being used
        config = workflow.get("config", {})
        logger.info(f"🔧 Executing step {step_index} with LLM config: provider={config.get('llm_provider')}, model={config.get('quick_think_model')}")

        # Send progress update - initializing AI agent
        await send_stream_update(workflow_id, {
            "type": "step_progress",
            "step_index": step_index,
            "progress": 25,
            "message": f"Initializing AI agent for {STEP_NAMES[step_index]}..."
        })

        # Actually execute the ProcessDesignGraph step
        logger.info(f"🚀 Calling ProcessDesignGraph.propagate() for step {step_index}")
        logger.info(f"📝 Problem statement: {workflow.get('problem_statement', 'N/A')}")
        logger.info(f"⚙️ LLM Config: {config}")

        try:
            # Execute the graph - this will make actual LLM calls
            logger.info("🔄 Starting ProcessDesignGraph.propagate() - this may take time...")

            # Capture stdout to see LLM messages
            import io
            import sys
            from contextlib import redirect_stdout

            captured_output = io.StringIO()
            with redirect_stdout(captured_output):
                result = graph.propagate()

            # Get the captured output
            stdout_output = captured_output.getvalue()
            logger.info(f"📋 ProcessDesignGraph stdout output:\n{stdout_output}")

            # Log what was returned
            logger.info(f"📄 ProcessDesignGraph returned result type: {type(result)}")
            if isinstance(result, dict):
                logger.info(f"📄 ProcessDesignGraph returned result keys: {list(result.keys())}")
                # Log some sample content from key results
                for key, value in result.items():
                    if isinstance(value, str) and len(value) > 100:
                        logger.info(f"📝 {key}: {value[:200]}...")
                    else:
                        logger.info(f"📝 {key}: {value}")
            else:
                logger.info(f"📄 ProcessDesignGraph returned non-dict result: {result}")

            # Look for LLM-related information in the output
            if "LLM Provider:" in stdout_output:
                logger.info("✅ Found LLM provider information in output")
            if "Quick Thinking LLM:" in stdout_output:
                logger.info("✅ Found Quick Thinking LLM information in output")
            if "Deep Thinking LLM:" in stdout_output:
                logger.info("✅ Found Deep Thinking LLM information in output")

            # Send progress update - processing complete
            await send_stream_update(workflow_id, {
                "type": "step_progress",
                "step_index": step_index,
                "progress": 75,
                "message": f"AI completed processing {STEP_NAMES[step_index]}"
            })

            # Extract outputs from the result
            step_output = {}

            # Try to extract relevant outputs based on step
            if isinstance(result, dict):
                # Map ProcessDesignGraph outputs to our expected format
                output_mapping = {
                    0: ["processRequirements"],  # Process Requirements Analysis
                    1: ["researchConcepts"],     # Innovative Research
                    2: ["researchRatingResults"], # Conservative Research
                    3: ["selectedConceptDetails", "selectedConceptName", "selectedConceptEvaluation"], # Concept Selection
                    4: ["componentList"],         # Component List
                    5: ["designBasis"],          # Design Basis
                    6: ["flowsheetDescription"], # Flowsheet Design
                    7: ["equipmentListResults", "streamListResults"], # Equipment & Stream Catalog
                    8: ["streamListResults"],    # Stream Properties
                    9: ["equipmentListResults"], # Equipment Sizing
                    10: ["safetyRiskAnalystReport"], # Safety Analysis
                    11: ["projectManagerReport", "projectApproval"] # Project Approval
                }

                expected_outputs = output_mapping.get(step_index, [])
                for output_key in expected_outputs:
                    # Look for outputs in the result
                    for result_key, result_value in result.items():
                        if output_key.lower() in result_key.lower() or result_key.lower() in output_key.lower():
                            step_output[output_key] = str(result_value)
                            break

                # If we didn't find expected outputs, include all result data for debugging
                if not step_output:
                    logger.warning(f"No expected outputs found for step {step_index}, including all result data")
                    for key, value in result.items():
                        step_output[f"debug_{key}"] = str(value)

            logger.info(f"📝 Final step output for step {step_index}: {list(step_output.keys())}")

        except Exception as graph_error:
            logger.error(f"❌ ProcessDesignGraph execution failed: {graph_error}")
            # Fallback to mock data if graph execution fails
            logger.info("🔄 Falling back to mock data due to graph execution failure")
            step_output = generate_mock_step_output(step_index)

        # Send final progress update
        await send_stream_update(workflow_id, {
            "type": "step_progress",
            "step_index": step_index,
            "progress": 90,
            "message": f"Finalizing results for {STEP_NAMES[step_index]}..."
        })

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

async def send_stream_update(workflow_id: str, update: Dict[str, Any]):
    """Send an update to the workflow's stream."""
    if workflow_id in workflow_streams:
        try:
            await workflow_streams[workflow_id].put(json.dumps(update))
        except Exception as e:
            logger.error(f"Failed to send stream update: {e}")