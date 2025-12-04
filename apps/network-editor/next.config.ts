import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ["@eng-suite/physics", "@eng-suite/ui-kit"],
  basePath: '/network-editor',
};

export default nextConfig;
