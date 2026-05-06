/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Ignora os erros chatos de tipagem do TypeScript na hora de publicar
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignora os avisos de formatação na hora de publicar
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;