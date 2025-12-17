import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    transpilePackages: ["@eng-suite/physics", "@eng-suite/ui-kit", "@eng-suite/vessels"],
    basePath: "/psv",
    async redirects() {
        return [
            {
                source: "/",
                destination: "/psv",
                permanent: false,
                basePath: false,
            },
        ];
    },
};

export default nextConfig;
