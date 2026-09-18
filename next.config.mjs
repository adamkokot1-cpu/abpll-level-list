/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'
    },
    middlewareClientMaxBodySize: 50 * 1024 * 1024
  }
};

export default nextConfig;