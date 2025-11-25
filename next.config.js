const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')

    config.resolve.alias['@react-native-async-storage/async-storage'] = path.resolve(
      __dirname,
      'stubs/asyncStorage.ts'
    )

    return config
  },
}

module.exports = nextConfig
