# Track Plan: PSV PDF Report Generation

This plan outlines the steps to implement PDF report generation for PSV sizing cases.

## Phase 1: Backend Infrastructure & Template [checkpoint: cacae7b]
Focus on setting up the PDF generation engine and creating the report layout.

- [x] Task: Research and select a PDF generation library for the FastAPI backend (e.g., WeasyPrint or ReportLab) [commit: 6c74226]
- [x] Task: Create a base PDF template following the professional design guidelines [commit: 1af65b8]
- [x] Task: Implement a data fetching service to aggregate PSV data for the report [commit: 959a087]
- [x] Task: Create a basic PDF generation endpoint `GET /psv/{psv_id}/report` [commit: e0efa5f]
- [x] Task: Conductor - User Manual Verification 'Phase 1: Backend Infrastructure & Template' (Protocol in workflow.md) [commit: cacae7b]

## Phase 2: Detailed Report Sections [checkpoint: d09f329]
Implement the actual content of the report.

- [x] Task: Implement the "Process Data & Scenario" section in the PDF [commit: c7788d1]
- [x] Task: Implement the "Sizing Calculations" section (API 520 results) [commit: 91414b2]
- [x] Task: Implement the "Hydraulic Results" section (Inlet/Outlet pressure drops) [commit: fe7e834]
- [x] Task: Add branding (logo) and professional styling to the PDF [commit: f47abc3]
- [x] Task: Conductor - User Manual Verification 'Phase 2: Detailed Report Sections' (Protocol in workflow.md) [commit: d09f329]

## Phase 3: Frontend Integration
Connect the UI to the backend endpoint.

- [~] Task: Create a `useReport` hook for handling report generation state
- [ ] Task: Add the "Download Report" button to the `SummaryTab` in the PSV application
- [ ] Task: Implement error handling and loading indicators for the download process
- [ ] Task: Perform final verification of data consistency between UI and PDF
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Frontend Integration' (Protocol in workflow.md)
