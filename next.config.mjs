/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed output: 'export' because it conflicts with middleware
  // We'll achieve SPA-like performance through client-side routing and optimized middleware
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig