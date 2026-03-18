/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ignored: ['**/node_modules', '**/.git', 'C:/*'],
      };
    }
    return config;
  },
  optimizePackageImports: ['lucide-react', 'date-fns', 'recharts', 'framer-motion'],
  // Removing standalone output to avoid dev filesystem issues on Windows
};

export default nextConfig;
