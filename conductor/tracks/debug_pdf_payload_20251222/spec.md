# Track Spec: Debug PDF Payload

## Overview
PDF reports are generating but missing data. We need to inspect the payload being sent from the frontend and received by the backend to identify key mismatches.

## Goals
- Add logging to frontend (`useReport.ts`) and backend (`reports.py`).
- Identify why fields like `serviceFluid` or `hierarchy` are not populating the template.

## Requirements
- `console.log` payload in frontend.
- `logger.info` payload in backend.
