import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@eng-suite/physics", "@eng-suite/ui-kit", "@eng-suite/api-client"],
  basePath: "/[your-app-name]",
  env: {
    NEXT_PUBLIC_BASE_PATH: "/[your-app-name]",
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/[your-app-name]",
        permanent: false,
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
