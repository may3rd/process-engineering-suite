# TODO

## Priority Next Steps
1. Run full API DB test suite with `TEST_DATABASE_URL` configured and resolve any regressions.
2. Add API-level integration tests for `/equipment` and `/venting` endpoints to lock compatibility behavior.
3. Migrate app clients from `/equipment` to `/engineering-objects` directly:
   - `apps/vessel` first
   - `apps/venting-calculation` second
4. Plan and execute legacy cleanup:
   - retire `equipment` table/subtype dependencies
   - remove compatibility shims after cutover
5. Update OpenAPI/types generation so clients expose `properties.design_parameters` contract.
6. Validate deployment matrix and run post-deploy smoke checks:
   - `bun run check:deploy:matrix`
   - `/equipment`, `/engineering-objects`, `/venting`, `/equipment-links`

## Notes
- Canonical design parameters are stored in `engineering_objects.properties.design_parameters`.
- Transitional design columns in `engineering_objects` were removed in phase 2.
