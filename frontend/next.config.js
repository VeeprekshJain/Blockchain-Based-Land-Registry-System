/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Allow consumption of shared workspace package
  transpilePackages: ['@land-registry/shared'],

  // Environment variable exposure to client
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
    NEXT_PUBLIC_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
  },

  // Image optimisation domains (add CDN / IPFS gateways as needed)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ipfs.io',
      },
    ],
  },

  // Custom headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
