"""Design Agents API router for ProcessDesignAgents integration."""

from fastapi import APIRouter

router = APIRouter(prefix="/design-agents", tags=["design-agents"])

@router.get("/health")
async def health_check():
    """Health check for design agents API."""
    return {"status": "ok", "service": "design-agents-api"}