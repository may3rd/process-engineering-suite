# Track Spec: Fix API Response Validation Errors

## Overview
The API is returning 500 errors because of Pydantic validation failures. The `MockService` returns data with camelCase keys (e.g., `ownerId`), but the Pydantic response models expect snake_case keys (e.g., `owner_id`), causing `Field required` errors during serialization.

## Goals
- Fix `GET /hierarchy/customers` 500 error.
- Ensure all hierarchy endpoints (Plants, Units, Areas, Projects) handle mock data (camelCase) correctly.

## Requirements
- Update Pydantic models in `apps/api/app/routers/hierarchy.py` to accept camelCase inputs using `alias` or `validation_alias`.
- Alternatively, ensure `MockService` converts keys, but updating models is likely more robust for both DB (snake) and Mock (camel) if configured correctly.
