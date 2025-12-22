# Track Spec: PSV PDF Report Generation

## Overview
This track focuses on implementing a professional PDF report generation feature for the PSV Sizing application. The report should summarize the PSV sizing case, including process data, sizing results, and hydraulic network details.

## Goals
- Allow users to download a formal PDF report for any PSV sizing case.
- Ensure the report follows a clean, professional layout suitable for engineering documentation.
- Include all critical data: Customer/Plant/Unit info, Overpressure Scenario, Sizing Results (API 520), and Hydraulic Results.

## Requirements

### Backend (Python/FastAPI)
- Create an endpoint `GET /psv/{psv_id}/report` to generate the PDF.
- Use a robust PDF generation library (e.g., `ReportLab` or `WeasyPrint`).
- Support templates for consistent branding.
- Include logic to fetch all necessary data from the database/mock files.

### Frontend (Next.js/React)
- Add a "Download Report" button to the PSV Detail view (Summary tab).
- Show a loading state during generation.
- Handle file download in the browser.

### Data to Include
- **Header:** Project Info, Customer, Plant, Unit, Area.
- **PSV Info:** Tag Number, Service, Type, Manufacturer, Model.
- **Scenario Info:** Selected governing case, fluid properties, flow rates.
- **Sizing Results:** Required area, selected orifice, calculated capacity.
- **Hydraulics:** Inlet/Outlet pressure drop results, Mach numbers, and warnings.

## Design
- Use a standard A4 portrait layout.
- Include the project logo if available.
- Use tables for structured data.
- Professional typography (e.g., Helvetica or Arial).

## Success Criteria
- Users can click a button and receive a correctly formatted PDF.
- All sizing data matches the UI display.
- High code coverage (>80%) for the generation logic.
