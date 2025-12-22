# Track Spec: Refactor PDF Generation to Stateless POST

## Overview
The current PDF generation relies on the backend fetching data by ID. However, the frontend often operates in "LocalStorage" mode or has unsaved state that the backend mock service doesn't know about. This leads to reports containing stale or missing data.

## Goals
- Decouple PDF generation from backend persistence.
- Allow the frontend to send the *exact* data to be rendered.

## Requirements
- Create `POST /reports/psv` endpoint in the API.
- This endpoint should accept a JSON payload containing all report data (PSV, Scenario, Hierarchy, Results, etc.).
- Update `useReport` hook to aggregate data from `usePsvStore` and send it to the new endpoint.
- Ensure the Pydantic model for the request is flexible (using `dict` or loose schemas) to match the frontend state.
