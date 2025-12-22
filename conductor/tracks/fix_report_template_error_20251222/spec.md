# Track Spec: Fix Report Template Attribute Error

## Overview
The PDF generation fails with `AttributeError: 'dict' object has no attribute 'sizing_case'` when rendering the template. This suggests that Jinja2 is not resolving dot notation correctly for the `results` dictionary in some context, or the object passed is behaving unexpectedly.

## Goals
- Fix the AttributeError in `psv_report.html`.
- Ensure robust data access for `results` and `sizing_case`.

## Requirements
- Replace dot notation `results.sizing_case` with `results.get('sizing_case')` or `results['sizing_case']` in `psv_report.html`.
- Verify other potentially problematic accesses.
