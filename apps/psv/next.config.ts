import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    transpilePackages: ["@eng-suite/ui-kit", "@repo/ui"],
};

export default nextConfig;
