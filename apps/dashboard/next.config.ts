import type { NextConfig } from "next";

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
        source: '/network-editor/:path*',

        // This is the internal destination to the Network Editor app
        // We use a fixed port (3001) for local testing
        destination: `${process.env.NETWORK_EDITOR_URL || 'http://localhost:3002'}/network-editor/:path*`,
      },
    ];
  },
};

export default nextConfig;
