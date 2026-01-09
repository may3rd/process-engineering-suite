from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

# Import from the multi-agents app (now in sys.path)
try:
    from processdesignagents.agents.analysts.process_requirements_analyst import create_process_requiruments_analyst
    from processdesignagents.agents.utils.agent_states import create_design_state
except ImportError as e:
    # Fallback or error logging if path setup fails
    logging.error(f"Failed to import processdesignagents: {e}")
    create_process_requiruments_analyst = None

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/design-agents",
    tags=["design-agents"],
    responses={404: {"description": "Not found"}},
)

class DesignRequest(BaseModel):
    prompt: str
    context: Optional[Dict[str, Any]] = None

class AgentResponse(BaseModel):
    status: str
    data: Optional[Dict[str, Any]] = None
    message: Optional[str] = None

def get_llm():
    """Get the LLM instance. Assumes OPENAI_API_KEY is set."""
    # In production, this might come from a dependency injection or setting
    if not os.getenv("OPENAI_API_KEY"):
        # For development/demo without key, we might mock or fail
        logger.warning("OPENAI_API_KEY not set. Agents will fail.")
    return ChatOpenAI(model="gpt-4o", temperature=0)

@router.get("/health")
async def health_check():
    """Health check for the design agents module."""
    imported = create_process_requiruments_analyst is not None
    return {"status": "design-agents-active", "modules_loaded": imported}

@router.post("/process", response_model=AgentResponse)
async def process_design(request: DesignRequest):
    """
    Trigger a design agent step.
    Currently supports: 'requirements_agent'
    """
    agent_id = request.context.get("agent_id") or request.context.get("agentId")
    
    if not create_process_requiruments_analyst:
        raise HTTPException(status_code=500, detail="Agent modules not loaded properly.")

    if agent_id == "requirements_agent":
        try:
            llm = get_llm()
            agent_func = create_process_requiruments_analyst(llm)
            
            # Create state
            state = create_design_state(problem_statement=request.prompt)
            
            # Run agent
            logger.info(f"Running requirements agent for: {request.prompt[:50]}...")
            result_state = agent_func(state)
            
            return AgentResponse(
                status="completed",
                message="Requirements analysis complete.",
                data={
                    "output": result_state.get("process_requirements"),
                    "raw_state": {k: str(v) for k,v in result_state.items() if k != "messages"}
                }
            )
            
        except Exception as e:
            logger.error(f"Agent execution failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    return AgentResponse(
        status="error",
        message=f"Unknown or unimplemented agent: {agent_id}"
    )