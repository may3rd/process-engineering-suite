from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

# Dynamically resolve the project root (ProcessDesignAgents/) and reports subdirectory
PROJECT_ROOT = Path(__file__).parent.parent.parent  # From utils/ -> apps.api.app.services.process_design_agents/ -> root
REPORTS_DIR = PROJECT_ROOT / "reports"

def ensure_reports_dir():
    """Create reports directory if it does not exist."""
    REPORTS_DIR.mkdir(exist_ok=True)

def save_agent_report(agent_name: str, state_update: Dict[str, Any], summary: str = ""):
    """Save an agent's report as JSON and append to Markdown summary."""
    ensure_reports_dir()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_{agent_name}.json"
    filepath = REPORTS_DIR / filename
    
    report = {
        "timestamp": timestamp,
        "agent": agent_name,
        "state_update": state_update,
        "summary": summary
    }
    
    with open(filepath, "w") as f:
        json.dump(report, f, indent=2, default=str)  # default=str handles non-serializable types like np.bool_
    
    print(f"Saved report: {filepath}", flush=True)
    
    # Append to overall Markdown log
    md_filepath = REPORTS_DIR / "design_session.md"
    with open(md_filepath, "a") as f:
        f.write(f"\n## {agent_name} Report ({timestamp})\n")
        f.write(f"**Summary:** {summary}\n\n")
        f.write(f"**State Update:** {json.dumps(state_update, indent=2, default=str)}\n\n")

def save_final_report(final_state: Dict[str, Any], session_id: str = None):
    """Save the complete final state as a comprehensive report."""
    ensure_reports_dir()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_final_report.json" if not session_id else f"{session_id}_final_report.json"
    filepath = REPORTS_DIR / filename
    
    with open(filepath, "w") as f:
        json.dump(final_state, f, indent=2, default=str)
    
    print(f"Saved final report: {filepath}", flush=True)
