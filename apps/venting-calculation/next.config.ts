import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@eng-suite/physics", "@eng-suite/ui-kit"],
  basePath: "/venting-calculation",
  env: {
    NEXT_PUBLIC_BASE_PATH: "/venting-calculation",
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/venting-calculation",
        permanent: false,
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
