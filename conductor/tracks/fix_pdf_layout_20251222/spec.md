# Track Spec: Fix PDF Report Layout Issues

## Overview
The generated PDF report currently has layout issues where content, specifically tables, is overflowing the page width (A4) and being cut off.

## Goals
- Ensure all content fits within the printable area of an A4 page.
- Fix table overflow issues.
- Adjust margins or table styles (`table-layout`, `word-wrap`, font sizes) to accommodate data.

## Requirements
- Modify `apps/api/app/templates/base_report.html`.
- Use CSS properties compatible with WeasyPrint.
- Verify that "Protective System Details" and "Sizing Results" tables are fully visible.
