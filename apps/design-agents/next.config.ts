import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    basePath: "/design-agents",
    transpilePackages: ["@repo/ui", "@eng-suite/ui-kit", "@eng-suite/physics"],
    reactStrictMode: true,
};

export default nextConfig;
