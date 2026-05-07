/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Isso evita que a Vercel trave por causa de imagens ou links
  images: {
    unoptimized: true,
  }
};

export default nextConfig;