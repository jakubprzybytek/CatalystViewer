/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    // Force all packages (including those in root node_modules) to use the
    // same React instance as the web app, avoiding dual-React issues in monorepos.
    resolveAlias: {
      'react': './node_modules/react',
      'react-dom': './node_modules/react-dom',
    },
  },
}

module.exports = nextConfig
