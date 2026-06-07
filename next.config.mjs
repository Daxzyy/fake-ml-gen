/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['fake-ml', 'skia-canvas'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'skia-canvas', 'fake-ml']
    }
    return config
  },
}

export default nextConfig
