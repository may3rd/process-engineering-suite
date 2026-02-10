import type { NextConfig } from "next";

const stripTrailingSlash = (url: string) => url.replace(/\/+$/, "");
const isVercel = process.env.VERCEL === "1";
const deployTarget = (process.env.DEPLOY_TARGET || (isVercel ? "vercel" : "local")).toLowerCase();

const createProxyTarget = (
  envKey: string,
  productionFallback: string,
  localFallback: string,
) => {
  const configured = process.env[envKey];
  if (configured && configured.trim().length > 0) {
    return stripTrailingSlash(configured.trim());
  }

  if (deployTarget === "vercel") {
    const fallback = stripTrailingSlash(productionFallback);
    console.warn(
      `[web] "${envKey}" not provided. Falling back to "${fallback}".`,
    );
    return fallback;
  }

  return stripTrailingSlash(localFallback);
};

const docsAppOrigin = createProxyTarget(
  "DOCS_URL",
  "https://process-engineering-suite-docs.vercel.app",
  "http://localhost:3001",
);
const networkEditorOrigin = createProxyTarget(
  "NETWORK_EDITOR_URL",
  "https://process-engineering-suite-network-e.vercel.app",
  "http://localhost:3002",
);
const psvOrigin = createProxyTarget(
  "PSV_URL",
  "https://process-engineering-suite-psv.vercel.app",
  "http://localhost:3003",
);
const designAgentsOrigin = createProxyTarget(
  "DESIGN_AGENTS_URL",
  "https://process-engineering-suite-design-agents.vercel.app",
  "http://localhost:3004",
);

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ["@eng-suite/physics", "@eng-suite/ui-kit"],



  // ADD THIS BLOCK: Local Routing for the Monorepo
  async rewrites() {
    return [
      {
        source: "/docs/:path*",
        destination: `${docsAppOrigin}/docs/:path*`,
      },
      {
        source: "/network-editor/:path*",
        destination: `${networkEditorOrigin}/network-editor/:path*`,
      },
      {
        source: "/psv/:path*",
        destination: `${psvOrigin}/psv/:path*`,
      },
      {
        source: "/design-agents",
        destination: `${designAgentsOrigin}/design-agents/index.html`,
      },
      {
        source: "/design-agents/:path*",
        destination: `${designAgentsOrigin}/design-agents/:path*`,
      },
    ];
  },
};

export default nextConfig;
