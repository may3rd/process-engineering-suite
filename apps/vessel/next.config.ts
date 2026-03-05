import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@eng-suite/physics", "@eng-suite/engineering-units"],
  basePath: "/vessel",
  env: {
    NEXT_PUBLIC_BASE_PATH: "/vessel",
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/vessel",
        permanent: false,
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
