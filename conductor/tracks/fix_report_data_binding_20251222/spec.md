# Track Spec: Fix Report Data Binding

## Overview
The generated PDF report has the correct layout but is missing data (blank fields). This is likely due to key mismatches between the `MockService` (camelCase) / `DatabaseService` (snake_case) return values and the Jinja2 template accessors.

## Goals
- Ensure all fields in the PDF report are populated with data.
- Support both snake_case and camelCase keys in the template for robustness.

## Requirements
- Update `apps/api/app/templates/psv_report.html` to handle property access robustly.
- Verify `PsvDataService` logic for hierarchy traversal with mock data.
