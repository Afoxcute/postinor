/**
 * Get IPFS URL for a given CID (Content Identifier)
 * Uses public IPFS gateway - either Pinata's public gateway or ipfs.io
 */
export const getIpfsUrl = (cid: string): string => {
  // Use public Pinata gateway or fallback to ipfs.io
  const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud";
  
  // Ensure CID doesn't have leading/trailing slashes
  const cleanCid = cid.trim().replace(/^\/+|\/+$/g, '');
  
  // Construct URL
  return `${gateway}/ipfs/${cleanCid}`;
};

/**
 * Extract CID from an IPFS URL
 */
export const extractCidFromUrl = (url: string): string | null => {
  try {
    const match = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};


