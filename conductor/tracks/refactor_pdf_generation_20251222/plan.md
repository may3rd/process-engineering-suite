# Track Plan: Refactor PDF Generation to Stateless POST

- [x] Task: Create `PsvReportRequest` Pydantic model in `apps/api/app/schemas.py` (or new `reports.py` module)
- [x] Task: Implement `POST /reports/psv` endpoint in a new `reports.py` router
- [x] Task: Update `apps/api/main.py` to include the new router
- [x] Task: Update `useReport.ts` to POST data instead of GET [commit: 3170e47]
- [~] Task: Conductor - User Manual Verification 'Refactor PDF Generation' (Protocol in workflow.md)
