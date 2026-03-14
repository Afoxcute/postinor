/**
 * Utility functions for storing and retrieving NFT metadata URLs
 * Maps NFT ID to IPFS metadata URL for image retrieval
 */

const STORAGE_KEY = 'softlaw_nft_metadata';
const PENDING_METADATA_KEY = 'softlaw_pending_metadata';

interface NFTMetadataMap {
  [nftId: string]: {
    metadataUrl: string;
    timestamp: number;
  };
}

interface PendingMetadata {
  metadataUrl: string;
  timestamp: number;
  accountAddress?: string;
}

/**
 * Store metadata URL for an NFT
 */
export const storeNFTMetadata = (nftId: string, metadataUrl: string): void => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const metadataMap: NFTMetadataMap = stored ? JSON.parse(stored) : {};
    
    metadataMap[nftId] = {
      metadataUrl,
      timestamp: Date.now(),
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metadataMap));
    console.log(`Stored metadata URL for NFT ${nftId}:`, metadataUrl);
  } catch (error) {
    console.error('Error storing NFT metadata:', error);
  }
};

/**
 * Retrieve metadata URL for an NFT
 */
export const getNFTMetadataUrl = (nftId: string): string | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const metadataMap: NFTMetadataMap = JSON.parse(stored);
    return metadataMap[nftId]?.metadataUrl || null;
  } catch (error) {
    console.error('Error retrieving NFT metadata:', error);
    return null;
  }
};

/**
 * Retrieve metadata URLs for multiple NFTs
 */
export const getNFTMetadataUrls = (nftIds: string[]): Record<string, string> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    
    const metadataMap: NFTMetadataMap = JSON.parse(stored);
    const result: Record<string, string> = {};
    
    nftIds.forEach((id) => {
      if (metadataMap[id]?.metadataUrl) {
        result[id] = metadataMap[id].metadataUrl;
      }
    });
    
    return result;
  } catch (error) {
    console.error('Error retrieving NFT metadata URLs:', error);
    return {};
  }
};

/**
 * Fetch NFT metadata from IPFS
 */
export const fetchNFTMetadata = async (metadataUrl: string): Promise<{
  image?: string[] | string;
  imageUrls?: string[];
  images?: string[];
  name?: string;
  description?: string;
} | null> => {
  try {
    console.log('Fetching metadata from:', metadataUrl);
    const response = await fetch(metadataUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Fetched metadata:', data);
    return data;
  } catch (error) {
    console.error('Error fetching NFT metadata from IPFS:', error, 'URL:', metadataUrl);
    return null;
  }
};

/**
 * Store pending metadata URL (before NFT is minted)
 */
export const storePendingMetadata = (metadataUrl: string, accountAddress?: string): void => {
  try {
    const pending: PendingMetadata = {
      metadataUrl,
      timestamp: Date.now(),
      accountAddress,
    };
    localStorage.setItem(PENDING_METADATA_KEY, JSON.stringify(pending));
    console.log('Stored pending metadata URL:', metadataUrl);
  } catch (error) {
    console.error('Error storing pending metadata:', error);
  }
};

/**
 * Get and clear pending metadata URL
 */
export const getAndClearPendingMetadata = (): string | null => {
  try {
    const stored = localStorage.getItem(PENDING_METADATA_KEY);
    if (!stored) return null;
    
    const pending: PendingMetadata = JSON.parse(stored);
    localStorage.removeItem(PENDING_METADATA_KEY);
    console.log('Retrieved and cleared pending metadata URL:', pending.metadataUrl);
    return pending.metadataUrl;
  } catch (error) {
    console.error('Error retrieving pending metadata:', error);
    return null;
  }
};

/**
 * Get all stored metadata URLs (for debugging)
 */
export const getAllStoredMetadata = (): NFTMetadataMap => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error retrieving all stored metadata:', error);
    return {};
  }
};


