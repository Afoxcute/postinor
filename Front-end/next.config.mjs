/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      domains: [
        'harlequin-quiet-smelt-978.mypinata.cloud', // Legacy domain (may have 403 issues)
        'gateway.pinata.cloud', // Public Pinata gateway
        'ipfs.io', // Public IPFS gateway
        'cloudflare-ipfs.com', // Cloudflare IPFS gateway
      ],
    },};

export default nextConfig;
