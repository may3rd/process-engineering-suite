/** @type {import('next').NextConfig} */
const nextConfig = {
    basePath: "/docs",
    async redirects() {
        return [
            {
                source: "/",
                destination: "/docs",
                permanent: false,
                basePath: false,
            },
        ];
    },
};

export default nextConfig;
