/**
 * Utility functions for infringement detection
 * These functions replicate the backend logic for formatting Yakoa IDs using ethers
 */

import { keccak256, toUtf8Bytes, concat, getBytes } from 'ethers';

/**
 * Convert NFT ID to numeric token ID (same logic as backend)
 * @param nftId - NFT ID (can be number, string, or Substrate address)
 * @returns Numeric token ID as string
 */
export function convertNftIdToNumericTokenId(nftId: string | number): string {
  // If it's already a number, return it as string
  if (typeof nftId === 'number') {
    return nftId.toString();
  }
  
  // If it's a numeric string, return as-is
  if (/^\d+$/.test(nftId)) {
    return nftId;
  }
  
  // For Substrate addresses or other strings, hash them to get a numeric value
  const nftIdString = nftId.toString();
  const nftIdBytes = toUtf8Bytes(nftIdString);
  // Convert bytes to hex string manually (ethers v6 doesn't have direct bytes-to-hex)
  const nftIdHex = '0x' + Array.from(nftIdBytes).map((b: number) => b.toString(16).padStart(2, '0')).join('');
  const hash = keccak256(nftIdHex);
  
  // Convert hash to BigInt and then to string (this gives us a large numeric value)
  // Take first 16 bytes (32 hex chars) to avoid exceeding JavaScript number limits
  // Match backend logic: BigInt(`0x${hash.slice(2, 34)}`)
  const numericValue = BigInt(`0x${hash.slice(2, 34)}`);
  
  return numericValue.toString();
}

/**
 * Format filing date as contract address (same logic as backend)
 * Uses Keccak256 hash to generate a deterministic 40-character hex address
 * @param filingDateHex - Hex-encoded filing date (e.g., "0x323030392d31322d31322028426c6f636b3a20383529")
 * @param nftId - NFT ID to include in the hash for uniqueness
 * @returns Valid EVM contract address (0x + 40 hex characters)
 */
export function formatFilingDateAsContractAddress(filingDateHex: string, nftId: string | number): string {
  // Ensure filing date has 0x prefix
  const normalizedFilingDate = filingDateHex.startsWith('0x') ? filingDateHex : `0x${filingDateHex}`;
  
  // Convert NFT ID string to bytes
  const nftIdString = nftId.toString();
  const nftIdBytes = toUtf8Bytes(nftIdString);
  
  // Get filing date bytes
  const filingDateBytes = getBytes(normalizedFilingDate);
  
  // Concatenate filing date bytes with NFT ID bytes
  // Manually concatenate the two Uint8Arrays
  const combinedLength = filingDateBytes.length + nftIdBytes.length;
  const combinedBytes = new Uint8Array(combinedLength);
  combinedBytes.set(filingDateBytes, 0);
  combinedBytes.set(nftIdBytes, filingDateBytes.length);
  
  // Convert back to hex for hashing
  const combinedHex = '0x' + Array.from(combinedBytes).map((b: number) => b.toString(16).padStart(2, '0')).join('');
  
  // Hash using Keccak256
  const hash = keccak256(combinedHex);
  
  // Take first 40 characters (20 bytes) after 0x prefix
  // This gives us a valid EVM address format (0x + 40 hex chars = 42 total)
  const address = `0x${hash.slice(2, 42)}`;
  
  return address;
}

/**
 * Get Yakoa ID from NFT data (contractAddress:tokenId format)
 * @param filingDate - Filing date string (will be converted to hex if not already)
 * @param nftId - NFT ID
 * @returns Yakoa ID in format "0x[contractAddress]:[tokenId]"
 */
export function getYakoaId(filingDate: string, nftId: string | number): string {
  // Convert filing date to hex if it's not already
  let filingDateHex: string;
  if (filingDate.startsWith('0x')) {
    filingDateHex = filingDate;
  } else {
    // Convert string to hex bytes
    const bytes = toUtf8Bytes(filingDate);
    filingDateHex = '0x' + Array.from(bytes).map((b: number) => b.toString(16).padStart(2, '0')).join('');
  }
  
  const contractAddress = formatFilingDateAsContractAddress(filingDateHex, nftId);
  
  // Determine token ID for Yakoa (match backend logic):
  // - If nftId is already numeric (e.g. on-chain IP ID like 0, 1, 2...), use it directly
  // - Otherwise, fall back to "0" to keep the ID compact and human-readable
  const nftIdString = nftId.toString();
  const tokenIdForYakoa = /^\d+$/.test(nftIdString) ? nftIdString : '0';
  
  return `${contractAddress}:${tokenIdForYakoa}`;
}

/**
 * Fetch infringement status from backend
 * @param yakoaId - Yakoa ID in format "contractAddress:tokenId"
 * @returns Infringement status data
 */
export async function fetchInfringementStatus(yakoaId: string) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
  
  try {
    const response = await fetch(`${backendUrl}/api/infringement/status/${encodeURIComponent(yakoaId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      // Handle 404 as "not registered" rather than an error
      if (response.status === 404) {
        console.log(`Frontend: Yakoa ID ${yakoaId} returned 404 (not registered)`);
        return {
          id: yakoaId,
          status: 'not_registered',
          result: 'not_found',
          inNetworkInfringements: [],
          externalInfringements: [],
          totalInfringements: 0,
          hasInfringementsAgainstThisAsset: false,
          displaySummary: 'not_registered' as const,
          lastChecked: null,
          severity: 'low' as const,
        };
      }
      
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const status = data.data; // The infringement status is in data.data
    
    // Trust the backend response completely - it has all the correct fields
    // including result, displaySummary, severity, etc.
    console.log(`Frontend: Received infringement status for ${yakoaId}:`, {
      status: status.status,
      result: status.result,
      displaySummary: status.displaySummary,
      totalInfringements: status.totalInfringements,
    });
    
    return status;
  } catch (error) {
    console.error('Error fetching infringement status:', error);
    // Return a "not registered" status instead of throwing
    return {
      id: yakoaId,
      status: 'error',
      result: 'error',
      inNetworkInfringements: [],
      externalInfringements: [],
      totalInfringements: 0,
      hasInfringementsAgainstThisAsset: false,
      displaySummary: 'not_registered' as const,
      lastChecked: null,
      severity: 'low' as const,
    };
  }
}

/**
 * Fetch infringement status using contract address and token ID
 * @param contractAddress - Contract address (0x...)
 * @param tokenId - Token ID (numeric string)
 * @returns Infringement status data
 */
export async function fetchInfringementStatusByContract(
  contractAddress: string,
  tokenId: string
) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
  
  try {
    const response = await fetch(
      `${backendUrl}/api/infringement/status/${encodeURIComponent(contractAddress)}/${encodeURIComponent(tokenId)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data.data; // The infringement status is in data.data
  } catch (error) {
    console.error('Error fetching infringement status:', error);
    throw error;
  }
}

