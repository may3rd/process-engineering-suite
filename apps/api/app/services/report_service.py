import os
from jinja2 import Environment, FileSystemLoader, select_autoescape
from datetime import datetime

class ReportService:
    def __init__(self):
        # Path to templates directory relative to this file
        template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
        self.env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=select_autoescape(['html', 'xml'])
        )

    def render_psv_report(self, psv, scenario, results, project_name=None, current_date=None, warnings=None):
        if not current_date:
            current_date = datetime.now().strftime("%Y-%m-%d")
            
        template = self.env.get_template("psv_report.html")
        return template.render(
            psv=psv,
            scenario=scenario,
            results=results,
            project_name=project_name,
            current_date=current_date,
            warnings=warnings
        )
