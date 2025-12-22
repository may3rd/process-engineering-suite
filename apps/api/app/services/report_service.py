import os
from jinja2 import Environment, FileSystemLoader, select_autoescape
from datetime import datetime
from weasyprint import HTML, CSS
from io import BytesIO

class ReportService:
    def __init__(self):
        # Path to templates directory relative to this file
        template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
        self.env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=select_autoescape(['html', 'xml'])
        )

    def render_psv_report(self, psv, scenario, results, project_name=None, current_date=None, warnings=None, hierarchy=None):
        if not current_date:
            current_date = datetime.now().strftime("%Y-%m-%d")
            
        template = self.env.get_template("psv_report.html")
        return template.render(
            psv=psv,
            scenario=scenario,
            results=results,
            project_name=project_name,
            current_date=current_date,
            warnings=warnings,
            hierarchy=hierarchy
        )

    def generate_pdf(self, html_content: str) -> BytesIO:
        """Convert HTML content to a professional PDF using WeasyPrint."""
        pdf_buffer = BytesIO()
        # Create HTML object from string
        html = HTML(string=html_content)
        # Generate PDF into the buffer
        html.write_pdf(pdf_buffer)
        pdf_buffer.seek(0)
        return pdf_buffer
