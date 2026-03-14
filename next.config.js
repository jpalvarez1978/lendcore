const { PHASE_DEVELOPMENT_SERVER } = require('next/constants')

module.exports = (phase) => {
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    reactStrictMode: true,
    // Evita que next dev y next build compitan por la misma carpeta .next
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
    images: {
      domains: ['localhost'],
      formats: ['image/avif', 'image/webp'],
    },
    experimental: {
      serverActions: {
        bodySizeLimit: '2mb',
      },
    },
  }

  return nextConfig
}
