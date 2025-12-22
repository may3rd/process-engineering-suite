# Track Spec: Fix CORS issues

## Overview
The user is encountering CORS errors when accessing the API from the frontend applications. The API needs to properly allow requests from all frontend origins.

## Goals
- Ensure the API (localhost:8000) accepts requests from:
    - Dashboard (localhost:3000)
    - Network Editor (localhost:3002)
    - PSV App (localhost:3003)
- Verify `CORSMiddleware` configuration in `apps/api/main.py`.

## Requirements
- Update `allow_origins` to include all relevant ports.
- Consider allowing all origins (`*`) for local development to prevent future friction, or stick to specific ports if strictness is required (but it's local dev).
- Confirm middleware placement.
