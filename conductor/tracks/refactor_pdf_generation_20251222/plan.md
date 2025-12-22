# Track Plan: Refactor PDF Generation to Stateless POST

- [ ] Task: Create `PsvReportRequest` Pydantic model in `apps/api/app/schemas.py` (or new `reports.py` module)
- [ ] Task: Implement `POST /reports/psv` endpoint in a new `reports.py` router
- [ ] Task: Update `apps/api/main.py` to include the new router
- [ ] Task: Update `useReport.ts` to POST data instead of GET
- [ ] Task: Conductor - User Manual Verification 'Refactor PDF Generation' (Protocol in workflow.md)
