# Track Spec: Debug PDF Content

## Overview
The PDF report fields are blank despite data being sent. We need to inspect the data available in the Jinja2 template context.

## Goals
- Dump the `psv` and `hierarchy` dictionaries into the PDF body.
- Identify the exact keys present in the data.

## Requirements
- Add `<pre>{{ psv | tojson(indent=2) }}</pre>` to `psv_report.html`.
