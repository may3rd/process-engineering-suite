import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field

from ..dependencies import REPORT_SERVICE

router = APIRouter(prefix="/reports", tags=["reports"])
logger = logging.getLogger(__name__)

class PsvReportRequest(BaseModel):
    """Request model for PSV report generation."""
    model_config = ConfigDict(extra='ignore')
    
    psv: Dict[str, Any]
    scenario: Dict[str, Any] = {}
    results: Dict[str, Any] = {}
    hierarchy: Dict[str, Any] = {}
    project_name: Optional[str] = Field(default=None, alias="projectName")
    current_date: Optional[str] = Field(default=None, alias="currentDate")
    inlet_network: Optional[Dict[str, Any]] = Field(default=None, alias="inletNetwork")
    outlet_network: Optional[Dict[str, Any]] = Field(default=None, alias="outletNetwork")
    warnings: Optional[list[str]] = []

@router.post("/psv", response_class=StreamingResponse)
async def generate_psv_report(
    request: PsvReportRequest,
    report_service: REPORT_SERVICE
):
    """Generate a PSV report PDF from provided data."""
    logger.info(f"DEBUG: Received report request for tag: {request.psv.get('tag')}")
    logger.debug(f"DEBUG: Full Request Data: {request.model_dump()}")
    try:
        # Render HTML
        html_content = report_service.render_psv_report(
            psv=request.psv,
            scenario=request.scenario,
            results=request.results,
            hierarchy=request.hierarchy,
            project_name=request.project_name,
            current_date=request.current_date,
            inlet_network=request.inlet_network,
            outlet_network=request.outlet_network,
            warnings=request.warnings
        )
        
        # Generate PDF
        pdf_buffer = report_service.generate_pdf(html_content)
        
        # Return as StreamingResponse
        tag = request.psv.get('tag') or request.psv.get('tagName') or "Unknown"
        filename = f"PSV_Report_{tag}.pdf"
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        import traceback
        logger.error(f"Error generating PDF report: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF report: {str(e)}")
