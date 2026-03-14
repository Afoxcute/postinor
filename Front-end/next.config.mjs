/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      domains: [
        'harlequin-quiet-smelt-978.mypinata.cloud', // Legacy domain (may have 403 issues)
        'gateway.pinata.cloud', // Public Pinata gateway
        'ipfs.io', // Public IPFS gateway
        'cloudflare-ipfs.com', // Cloudflare IPFS gateway
      ],
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'gateway.pinata.cloud',
          pathname: '/ipfs/**',
        },
        {
          protocol: 'https',
          hostname: '*.mypinata.cloud',
          pathname: '/ipfs/**',
        },
        {
          protocol: 'https',
          hostname: 'ipfs.io',
          pathname: '/ipfs/**',
        },
        {
          protocol: 'https',
          hostname: 'cloudflare-ipfs.com',
          pathname: '/ipfs/**',
        },
      ],
    },
};

export default nextConfig;
