import type { NextConfig } from "next";

const stripTrailingSlash = (url: string) => url.replace(/\/+$/, "");
const isVercel = process.env.VERCEL === "1";

const createProxyTarget = (
  envKey: string,
  productionFallback: string,
  localFallback: string,
) => {
  const configured = process.env[envKey];
  if (configured && configured.trim().length > 0) {
    return stripTrailingSlash(configured.trim());
  }

  if (isVercel) {
    const fallback = stripTrailingSlash(productionFallback);
    console.warn(
      `[dashboard] "${envKey}" not provided. Falling back to "${fallback}".`,
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

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ["@eng-suite/physics", "@eng-suite/ui-kit"],

  // We are forcing Webpack mode in the dev script, but keeping the webpack config safe
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // [Existing Fallbacks here]
    }
    // [Existing experiments config]
    return config;
  },

  // ADD THIS BLOCK: Local Routing for the Monorepo
  async rewrites() {
    return [
      {
        // This is the incoming request path seen by the Dashboard
        source: "/network-editor/:path*",

        // This is the internal destination to the Network Editor app
        // We use a fixed port (3001) for local testing
        destination: `${networkEditorOrigin}/network-editor/:path*`,
      },
      {
        source: "/docs/:path*",
        destination: `${docsAppOrigin}/docs/:path*`,
      },
    ];
  },
};

export default nextConfig;
