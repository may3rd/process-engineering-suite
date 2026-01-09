from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
import os
import json
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

# Import from the multi-agents app (now in sys.path)
try:
    from processdesignagents.agents.analysts.process_requirements_analyst import create_process_requiruments_analyst
    from processdesignagents.agents.researchers.innovative_researcher import create_innovative_researcher
    from processdesignagents.agents.researchers.detail_concept_researcher import create_concept_detailer
    from processdesignagents.agents.designers.flowsheet_design_agent import create_flowsheet_design_agent
    from processdesignagents.agents.designers.equipment_stream_catalog_agent import create_equipment_stream_catalog_agent
    from processdesignagents.agents.designers.stream_property_estimation_agent import create_stream_property_estimation_agent
    from processdesignagents.agents.designers.equipment_sizing_agent import create_equipment_sizing_agent
    from processdesignagents.agents.analysts.safety_risk_analyst import create_safety_risk_analyst
    from processdesignagents.agents.project_manager.project_manager import create_project_manager
    from processdesignagents.agents.utils.agent_states import create_design_state
except ImportError as e:
    # Fallback or error logging if path setup fails
    logging.error(f"Failed to import processdesignagents: {e}")
    create_process_requiruments_analyst = None
    create_innovative_researcher = None
    create_concept_detailer = None
    create_flowsheet_design_agent = None
    create_equipment_stream_catalog_agent = None
    create_stream_property_estimation_agent = None
    create_equipment_sizing_agent = None
    create_safety_risk_analyst = None
    create_project_manager = None

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

# Default models from user feedback
DEFAULT_QUICK_MODEL = "google/gemini-2.5-flash-lite-preview-09-2025"
DEFAULT_DEEP_MODEL = "google/gemini-2.5-flash-preview-09-2025"

def get_llm(model_type: str = "deep"):
    """
    Get the LLM instance using OpenRouter.
    """
    api_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY")
    base_url = "https://openrouter.ai/api/v1" if os.getenv("OPENROUTER_API_KEY") else None
    
    if not api_key:
        logger.warning("Neither OPENROUTER_API_KEY nor OPENAI_API_KEY set. Agents will fail.")
    
    model = DEFAULT_DEEP_MODEL if model_type == "deep" else DEFAULT_QUICK_MODEL
    
    return ChatOpenAI(
        model=model,
        temperature=0.7,
        openai_api_key=api_key,
        base_url=base_url
    )

@router.get("/health")
async def health_check():
    """Health check for the design agents module."""
    imported = create_process_requiruments_analyst is not None
    return {
        "status": "design-agents-active", 
        "modules_loaded": imported,
        "provider": "openrouter" if os.getenv("OPENROUTER_API_KEY") else "openai"
    }

@router.post("/process", response_model=AgentResponse)
async def process_design(request: DesignRequest):
    """
    Trigger a design agent step.
    Supports: 'requirements_agent', 'research_agent'
    """
    agent_id = request.context.get("agent_id") or request.context.get("agentId")
    
    if not create_process_requiruments_analyst:
        raise HTTPException(status_code=500, detail="Agent modules not loaded properly.")

    try:
        if agent_id == "requirements_agent":
            # Requirements analysis (Deep)
            llm = get_llm(model_type="deep")
            agent_func = create_process_requiruments_analyst(llm)
            
            state = create_design_state(problem_statement=request.prompt)
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

        elif agent_id == "research_agent":
            # Concept Generation (Deep)
            # The prompt here is actually the "Process Requirements" from the previous step
            llm = get_llm(model_type="deep")
            agent_func = create_innovative_researcher(llm)
            
            # We initialize state with the REQUIREMENTS, not the problem statement
            state = create_design_state(process_requirements=request.prompt)
            logger.info(f"Running research agent with requirements length: {len(request.prompt)}")
            
            result_state = agent_func(state)
            
            # The agent returns a JSON string in 'research_concepts'
            raw_concepts = result_state.get("research_concepts")
            
            # Ensure it's valid JSON before sending
            try:
                concepts_obj = json.loads(raw_concepts) if isinstance(raw_concepts, str) else raw_concepts
            except Exception:
                concepts_obj = {"concepts": []} # Fallback
                
            return AgentResponse(
                status="completed",
                message="Research concepts generated.",
                data={
                    "output": concepts_obj, # Send as object, frontend can handle it
                    "raw_state": {k: str(v) for k,v in result_state.items() if k != "messages"}
                }
            )

        elif agent_id == "synthesis_agent":
            # Detailed Design Basis Generation (Deep)
            llm = get_llm(model_type="deep")
            agent_func = create_concept_detailer(llm)
            
            # This agent expects 'research_rating_results' containing the selected concept in a list
            selected_concept = request.context.get("selected_concept")
            requirements = request.prompt # Passed from frontend as prompt
            
            # The agent expects a JSON string of concepts to pick from
            # Since we already picked it in the UI, we'll wrap it in the format it expects
            fake_evaluations = json.dumps({
                "concepts": [selected_concept]
            })
            
            state = create_design_state(
                process_requirements=requirements,
                research_rating_results=fake_evaluations
            )
            
            logger.info(f"Running synthesis agent for concept: {selected_concept.get('name')}")
            result_state = agent_func(state)
            
            return AgentResponse(
                status="completed",
                message="Detailed design basis generated.",
                data={
                    "output": result_state.get("selected_concept_details"),
                    "raw_state": {k: str(v) for k,v in result_state.items() if k != "messages"}
                }
            )

        elif agent_id == "pfd_agent":
            # PFD Generation (Deep)
            llm = get_llm(model_type="deep")
            agent_func = create_flowsheet_design_agent(llm)
            
            # Construct state with inputs
            state = create_design_state(
                process_requirements=request.context.get("requirements"),
                selected_concept_name=request.context.get("concept_name"),
                selected_concept_details=request.context.get("concept_details"),
                design_basis=request.context.get("concept_details") # Using details as basis if explicit basis not separate
            )
            
            logger.info(f"Running PFD agent for concept: {request.context.get('concept_name')}")
            result_state = agent_func(state)
            
            return AgentResponse(
                status="completed",
                message="Flowsheet description generated.",
                data={
                    "output": result_state.get("flowsheet_description"),
                    "raw_state": {k: str(v) for k,v in result_state.items() if k != "messages"}
                }
            )

        elif agent_id == "catalog_agent":
            # Equipment & Stream Catalog (Deep)
            llm = get_llm(model_type="deep")
            agent_func = create_equipment_stream_catalog_agent(llm)
            
            state = create_design_state(
                flowsheet_description=request.context.get("flowsheet"),
                design_basis=request.context.get("design_basis"),
                process_requirements=request.context.get("requirements"),
                selected_concept_details=request.context.get("concept_details")
            )
            
            logger.info("Running catalog agent...")
            result_state = agent_func(state)
            
            return AgentResponse(
                status="completed",
                message="Equipment and stream catalog generated.",
                data={
                    "output": result_state.get("equipment_and_stream_template"), # JSON string
                    "raw_state": {k: str(v) for k,v in result_state.items() if k != "messages"}
                }
            )

        elif agent_id == "simulation_agent":
            # Stream Property Estimation (Deep)
            llm = get_llm(model_type="deep")
            agent_func = create_stream_property_estimation_agent(llm)
            
            # This agent needs the Template from the previous step
            state = create_design_state(
                flowsheet_description=request.context.get("flowsheet"),
                design_basis=request.context.get("design_basis"),
                equipment_and_stream_template=request.context.get("catalog_template")
            )
            
            logger.info("Running simulation (property estimation) agent...")
            result_state = agent_func(state)
            
            return AgentResponse(
                status="completed",
                message="Stream properties estimated.",
                data={
                    "output": result_state.get("stream_list_results"), # JSON string
                    "full_results": result_state.get("equipment_and_stream_results"),
                    "raw_state": {k: str(v) for k,v in result_state.items() if k != "messages"}
                }
            )

        elif agent_id == "sizing_agent":
            # Equipment Sizing (Deep)
            llm = get_llm(model_type="deep")
            agent_func = create_equipment_sizing_agent(llm)
            
            # This agent needs the Full Results from Step 5 (Populated streams)
            state = create_design_state(
                flowsheet_description=request.context.get("flowsheet"),
                design_basis=request.context.get("design_basis"),
                equipment_and_stream_results=request.context.get("full_simulation_results")
            )
            
            logger.info("Running equipment sizing agent...")
            result_state = agent_func(state)
            
            return AgentResponse(
                status="completed",
                message="Equipment sizing complete.",
                data={
                    "output": result_state.get("equipment_list_results"), # JSON string
                    "full_results": result_state.get("equipment_and_stream_results"),
                    "raw_state": {k: str(v) for k,v in result_state.items() if k != "messages"}
                }
            )

        elif agent_id == "safety_agent":
            # Safety & Risk Assessment (Deep)
            llm = get_llm(model_type="deep")
            agent_func = create_safety_risk_analyst(llm)
            
            state = create_design_state(
                process_requirements=request.context.get("requirements"),
                design_basis=request.context.get("design_basis"),
                flowsheet_description=request.context.get("flowsheet"),
                equipment_and_stream_results=request.context.get("full_results")
            )
            
            logger.info("Running safety risk analyst...")
            result_state = agent_func(state)
            
            return AgentResponse(
                status="completed",
                message="Safety assessment complete.",
                data={
                    "output": result_state.get("safety_risk_analyst_report"),
                    "raw_state": {k: str(v) for k,v in result_state.items() if k != "messages"}
                }
            )

        elif agent_id == "manager_agent":
            # Project Review & Costing (Deep)
            llm = get_llm(model_type="deep")
            agent_func = create_project_manager(llm)
            
            state = create_design_state(
                process_requirements=request.context.get("requirements"),
                design_basis=request.context.get("design_basis"),
                flowsheet_description=request.context.get("flowsheet"),
                equipment_and_stream_results=request.context.get("full_results"),
                safety_risk_analyst_report=request.context.get("safety_report")
            )
            
            logger.info("Running project manager review agent...")
            result_state = agent_func(state)
            
            return AgentResponse(
                status="completed",
                message="Project review complete.",
                data={
                    "output": result_state.get("project_manager_report"),
                    "status": result_state.get("project_approval"),
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