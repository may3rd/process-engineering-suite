export { createApiClient } from "./client";
export type { EngSuiteApiClient, ApiClientConfig, RequestFn } from "./client";

// Re-export module creators for advanced usage
export { createAuthModule } from "./modules/auth";
export { createHierarchyModule } from "./modules/hierarchy";
export { createPsvModule } from "./modules/psv";
export { createVentingModule } from "./modules/venting";
export { createNetworkModule } from "./modules/network";
export { createDesignAgentsModule } from "./modules/designAgents";
export { createHydraulicsModule } from "./modules/hydraulics";
