/**
 * Get IPFS URL for a given CID (Content Identifier)
 * Uses public IPFS gateway - either Pinata's public gateway or ipfs.io
 * @deprecated Use getIPFSGatewayURL instead for better IPFS URL handling
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
 * Convert any IPFS reference to a normalized HTTPS gateway URL
 * Handles:
 * - ipfs:// protocol (ipfs://Qm...)
 * - /ipfs/ paths (https://example.com/ipfs/Qm...)
 * - Already valid gateway URLs (returns as-is)
 * - Plain CIDs (Qm...)
 * 
 * @param url - IPFS URL, CID, or gateway URL
 * @returns Normalized HTTPS gateway URL
 */
export const getIPFSGatewayURL = (url: string): string => {
  if (!url) return '';
  
  // Use preferred gateway
  const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud";
  
  // Handle ipfs:// protocol
  if (url.startsWith('ipfs://')) {
    const cid = url.replace('ipfs://', '').trim();
    return `${gateway}/ipfs/${cid}`;
  }
  
  // Handle /ipfs/ path (extract CID from any URL containing /ipfs/)
  if (url.includes('/ipfs/')) {
    const parts = url.split('/ipfs/');
    if (parts.length > 1) {
      // Extract CID (may have query params or fragments, so split on those)
      const cid = parts[1].split('?')[0].split('#')[0].trim();
      return `${gateway}/ipfs/${cid}`;
    }
  }
  
  // If it's already a gateway URL (contains gateway domain), return as is
  if (url.includes('gateway.pinata.cloud') || url.includes('ipfs.io') || url.includes('cloudflare-ipfs.com')) {
    return url;
  }
  
  // If it's already a valid HTTPS URL, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Otherwise, treat it as a plain CID
  const cleanCid = url.trim().replace(/^\/+|\/+$/g, '');
  return `${gateway}/ipfs/${cleanCid}`;
};

/**
 * Extract CID from an IPFS URL
 */
export const extractCidFromUrl = (url: string): string | null => {
  try {
    // Handle ipfs:// protocol
    if (url.startsWith('ipfs://')) {
      return url.replace('ipfs://', '').trim();
    }
    
    // Handle /ipfs/ path
    const match = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};




