# TODO

## Active Work
- [ ] Heat transfer calculator — formula fidelity testing against Excel (blocked: file access)
- [ ] Heat transfer calculator — Python calc-engine module (`pes_calc/heat_transfer/`)
- [ ] Heat transfer calculator — save/load via shared `/calculations` API
- [ ] Heat transfer calculator — tank schematic (SchematicCard)
- [ ] Heat transfer calculator — PDF export
- [ ] Heat transfer calculator — expand test coverage (only 2 tests currently)

## Calc-Engine Python (by explicit choice only)
- Hydraulics and vessels use Python calc-engine. Other domains (venting, pump, heat transfer, PSV) use TypeScript per Rule Zero.

## Engineering Objects Migration
1. Run full API DB test suite with `TEST_DATABASE_URL` configured and resolve any regressions.
2. Add API-level integration tests for `/equipment` and `/venting` endpoints to lock compatibility behavior.
3. Migrate app clients from `/equipment` to `/engineering-objects` directly:
   - `apps/vessels-calculation` first
   - `apps/venting-calculation` second
4. Plan and execute legacy cleanup:
   - retire `equipment` table/subtype dependencies
   - remove compatibility shims after cutover
5. Update OpenAPI/types generation so clients expose `properties.design_parameters` contract.
6. Validate deployment matrix and run post-deploy smoke checks:
   - `bun run check:deploy:matrix`
   - `/equipment`, `/engineering-objects`, `/venting`, `/equipment-links`

## Infrastructure
- [ ] Add Docker service for `services/calc-engine` (currently only hydraulics runs in API process)
- [ ] Add missing `.next` volume mounts for newer apps in docker-compose (DONE 2026-05-02)

## Documentation Debt
- [ ] Add missing app-specific CLAUDE.md files (heat-transfer done 2026-05-02; pump, vessels still need review)
- [ ] Update AGENTS.md first repository structure section (stale — references deleted `conductor/` dir)
- [ ] Develop app-level READMEs for pump, venting (vessels, psv, network-editor, web have them)

## Notes
- Canonical design parameters are stored in `engineering_objects.properties.design_parameters`.
- Transitional design columns in `engineering_objects` were removed in phase 2.
- Calc-engine: `pes_calc/vessels/` is fully implemented (20 modules). Other domains need Python parity.
- Frontend tests: venting (10), vessels (13), pump (6), heat-transfer (2). Heat-transfer needs physics tests.
