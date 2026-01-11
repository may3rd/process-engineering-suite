from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
import os
import json
import pypandoc
from pathlib import Path
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from starlette.concurrency import run_in_threadpool

# Import from the internal service (refactored from multi-agents)
try:
    from apps.api.app.services.process_design_agents.agents.analysts.process_requirements_analyst import create_process_requiruments_analyst
    from apps.api.app.services.process_design_agents.agents.researchers.innovative_researcher import create_innovative_researcher
    from apps.api.app.services.process_design_agents.agents.researchers.detail_concept_researcher import create_concept_detailer
    from apps.api.app.services.process_design_agents.agents.designers.flowsheet_design_agent import create_flowsheet_design_agent
    from apps.api.app.services.process_design_agents.agents.designers.equipment_stream_catalog_agent import create_equipment_stream_catalog_agent
    from apps.api.app.services.process_design_agents.agents.designers.stream_property_estimation_agent import create_stream_property_estimation_agent
    from apps.api.app.services.process_design_agents.agents.designers.equipment_sizing_agent import create_equipment_sizing_agent
    from apps.api.app.services.process_design_agents.agents.analysts.cost_estimator_agent import create_cost_estimator_agent
    from apps.api.app.services.process_design_agents.agents.analysts.safety_risk_analyst import create_safety_risk_analyst
    from apps.api.app.services.process_design_agents.agents.project_manager.project_manager import create_project_manager
    from apps.api.app.services.process_design_agents.agents.utils.agent_states import create_design_state
except ImportError as e:
    # Fallback or error logging if path setup fails
    logging.error(f"Failed to import process_design_agents: {e}")
    create_process_requiruments_analyst = None
    create_innovative_researcher = None
    create_concept_detailer = None
    create_flowsheet_design_agent = None
    create_equipment_stream_catalog_agent = None
    create_stream_property_estimation_agent = None
    create_equipment_sizing_agent = None
    create_cost_estimator_agent = None
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

class ExportRequest(BaseModel):
    markdown_content: str
    template_path: Optional[str] = None

# Default models
DEFAULT_QUICK_MODEL = "x-ai/grok-4.1-fast"
DEFAULT_DEEP_MODEL = "x-ai/grok-4.1-fast"

def get_llm(model_type: str = "deep", config: Dict[str, Any] = None):
    """
    Get the LLM instance with dynamic configuration.
    """
    config = config or {}
    
    # 1. Determine Provider and Base URL
    provider = config.get("provider", "OpenRouter")
    api_key = config.get("apiKey") or os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    # DEBUG: Check if API key is present
    if api_key:
        masked_key = f"{api_key[:4]}...{api_key[-4:]}" if len(api_key) > 8 else "***"
        logger.info(f"Using API Key: {masked_key} for provider {provider}")
    else:
        logger.warning(f"NO API KEY FOUND for provider {provider}. Config apiKey: {bool(config.get('apiKey'))}, Env OPENROUTER: {bool(os.getenv('OPENROUTER_API_KEY'))}")

    base_url = None
    if provider == "OpenRouter":
        base_url = "https://openrouter.ai/api/v1"
    
    if not api_key:
        logger.error(f"API Key missing for provider {provider}")
        raise HTTPException(status_code=401, detail="API KEY is missing")
    
    # 2. Determine Model
    if model_type == "deep":
        model = config.get("deepModel", DEFAULT_DEEP_MODEL)
    else:
        model = config.get("quickModel", DEFAULT_QUICK_MODEL)
    
    # 3. Determine Temperature
    temperature = config.get("temperature", 0.7)
    
    return ChatOpenAI(
        model=model,
        temperature=temperature,
        openai_api_key=api_key,
        base_url=base_url
    )

@router.get("/health")
async def health_check():
    """Health check for the design agents module."""
    imported = create_process_requiruments_analyst is not None
    # Check if either key is present in env
    has_env_key = bool(os.getenv("OPENROUTER_API_KEY")) or bool(os.getenv("OPENAI_API_KEY"))
    return {
        "status": "design-agents-active", 
        "modules_loaded": imported,
        "provider": "openrouter" if os.getenv("OPENROUTER_API_KEY") else "openai",
        "has_env_key": has_env_key
    }

@router.post("/process", response_model=AgentResponse)
async def process_design(request: DesignRequest):
    """
    Trigger a design agent step.
    Supports all 9 agents.
    """
    agent_id = request.context.get("agent_id") or request.context.get("agentId")
    llm_config = request.context.get("llm_config")
    
    if not create_process_requiruments_analyst:
        raise HTTPException(status_code=500, detail="Agent modules not loaded properly.")

    try:
        if agent_id == "requirements_agent":
            llm = get_llm("deep", llm_config)
            agent_func = create_process_requiruments_analyst(llm)
            state = create_design_state(problem_statement=request.prompt)
            result_state = agent_func(state)
            return AgentResponse(status="completed", message="Requirements analysis complete.", data={"output": result_state.get("process_requirements")})

        elif agent_id == "research_agent":
            llm = get_llm("deep", llm_config)
            agent_func = create_innovative_researcher(llm)
            state = create_design_state(process_requirements=request.prompt)
            result_state = agent_func(state)
            raw_concepts = result_state.get("research_concepts")
            try:
                concepts_obj = json.loads(raw_concepts) if isinstance(raw_concepts, str) else raw_concepts
            except Exception:
                concepts_obj = {"concepts": []}
            return AgentResponse(status="completed", message="Research concepts generated.", data={"output": concepts_obj})

        elif agent_id == "synthesis_agent":
            llm = get_llm("deep", llm_config)
            agent_func = create_concept_detailer(llm)
            selected_concept = request.context.get("selected_concept")
            fake_evaluations = json.dumps({"concepts": [selected_concept]})
            state = create_design_state(process_requirements=request.prompt, research_rating_results=fake_evaluations)
            result_state = agent_func(state)
            return AgentResponse(status="completed", message="Detailed design basis generated.", data={"output": result_state.get("selected_concept_details")})

        elif agent_id == "pfd_agent":
            llm = get_llm("deep", llm_config)
            agent_func = create_flowsheet_design_agent(llm)
            state = create_design_state(
                process_requirements=request.context.get("requirements"),
                selected_concept_name=request.context.get("concept_name"),
                selected_concept_details=request.context.get("concept_details"),
                design_basis=request.context.get("concept_details")
            )
            result_state = agent_func(state)
            return AgentResponse(status="completed", message="Flowsheet description generated.", data={"output": result_state.get("flowsheet_description")})

        elif agent_id == "catalog_agent":
            llm = get_llm("deep", llm_config)
            agent_func = create_equipment_stream_catalog_agent(llm)
            state = create_design_state(
                flowsheet_description=request.context.get("flowsheet"),
                design_basis=request.context.get("design_basis"),
                process_requirements=request.context.get("requirements"),
                selected_concept_details=request.context.get("concept_details")
            )
            result_state = agent_func(state)
            return AgentResponse(status="completed", message="Catalog generated.", data={"output": result_state.get("equipment_and_stream_template")})

        elif agent_id == "simulation_agent":
            llm = get_llm("deep", llm_config)
            agent_func = create_stream_property_estimation_agent(llm)
            state = create_design_state(
                flowsheet_description=request.context.get("flowsheet"),
                design_basis=request.context.get("design_basis"),
                equipment_and_stream_template=request.context.get("catalog_template")
            )
            result_state = agent_func(state)
            return AgentResponse(status="completed", message="Simulation complete.", data={"output": result_state.get("stream_list_results"), "full_results": result_state.get("equipment_and_stream_results")})

        elif agent_id == "sizing_agent":
            llm = get_llm("deep", llm_config)
            agent_func = create_equipment_sizing_agent(llm)
            state = create_design_state(
                flowsheet_description=request.context.get("flowsheet"),
                design_basis=request.context.get("design_basis"),
                equipment_and_stream_results=request.context.get("full_simulation_results")
            )
            result_state = agent_func(state)
            return AgentResponse(status="completed", message="Sizing complete.", data={"output": result_state.get("equipment_list_results"), "full_results": result_state.get("equipment_and_stream_results")})

        elif agent_id == "cost_agent":
            llm = get_llm("deep", llm_config)
            agent_func = create_cost_estimator_agent(llm)
            state = create_design_state(
                design_basis=request.context.get("design_basis"),
                flowsheet_description=request.context.get("flowsheet"),
                equipment_list_results=request.context.get("equipment_list"), # Expecting the detailed list from sizing
                equipment_and_stream_results=request.context.get("full_results") # Fallback
            )
            result_state = agent_func(state)
            return AgentResponse(status="completed", message="Cost estimation complete.", data={"output": result_state.get("cost_estimation_report")})

        elif agent_id == "safety_agent":
            llm = get_llm("deep", llm_config)
            agent_func = create_safety_risk_analyst(llm)
            state = create_design_state(
                process_requirements=request.context.get("requirements"),
                design_basis=request.context.get("design_basis"),
                flowsheet_description=request.context.get("flowsheet"),
                equipment_and_stream_results=request.context.get("full_results")
            )
            result_state = agent_func(state)
            return AgentResponse(status="completed", message="Safety analysis complete.", data={"output": result_state.get("safety_risk_analyst_report")})

        elif agent_id == "manager_agent":
            llm = get_llm("deep", llm_config)
            agent_func = create_project_manager(llm)
            state = create_design_state(
                process_requirements=request.context.get("requirements"),
                design_basis=request.context.get("design_basis"),
                flowsheet_description=request.context.get("flowsheet"),
                equipment_and_stream_results=request.context.get("full_results"),
                safety_risk_analyst_report=request.context.get("safety_report")
            )
            result_state = agent_func(state)
            return AgentResponse(status="completed", message="Project review complete.", data={"output": result_state.get("project_manager_report"), "status": result_state.get("project_approval")})

    except Exception as e:
        logger.error(f"Agent execution failed: {e}")
        # Propagate 401 errors
        error_str = str(e)
        if "401" in error_str or "Unauthorized" in error_str or "API KEY is missing" in error_str:
            raise HTTPException(status_code=401, detail="API Error: Please check your API key.")
            
        raise HTTPException(status_code=500, detail=str(e))

    return AgentResponse(status="error", message=f"Unknown agent: {agent_id}")

@router.post("/export/docx")
async def export_to_word(request: ExportRequest):
    """
    Convert Markdown content to a formatted Word document using a reference template.
    """
    try:
        # Locate the template file
        PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent
        # Default template location
        template_path = PROJECT_ROOT / "apps/multi-agents/ProcessDesignAgents/reports/template.docx"
        
        # Override if user provided path (only if it exists)
        if request.template_path:
            custom_path = Path(request.template_path)
            if custom_path.exists():
                template_path = custom_path

        if not template_path.exists():
            raise HTTPException(status_code=404, detail="Word template not found.")

        # Create temporary input/output files
        temp_dir = Path("/tmp")
        input_file = temp_dir / f"input_{os.getpid()}.md"
        output_file = temp_dir / f"design_dossier_{os.getpid()}.docx"

        # Write markdown to file
        input_file.write_text(request.markdown_content, encoding="utf-8")

        # Run pypandoc
        pypandoc.convert_file(
            str(input_file),
            'docx',
            outputfile=str(output_file),
            extra_args=[f"--reference-doc={str(template_path)}"]
        )

        # Read binary
        content = output_file.read_bytes()

        # Cleanup
        input_file.unlink(missing_ok=True)
        output_file.unlink(missing_ok=True)

        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": "attachment; filename=design_dossier.docx"}
        )

    except Exception as e:
        logger.error(f"Word export failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
