import { Address, parseEther, zeroAddress, keccak256, hexToBytes, concat, toHex } from 'viem'
import dotenv from 'dotenv'
import { networkInfo, NATIVE_TOKEN_ADDRESS } from './config'

dotenv.config()

// Use native FLOW token as WIP_TOKEN_ADDRESS
export const WIP_TOKEN_ADDRESS: Address = NATIVE_TOKEN_ADDRESS

// Export contract addresses with appropriate defaults based on network
// Default: ImiteIP on Flow EVM Testnet (chain 545)
const DEFAULT_NFT_CONTRACT_ADDRESS = '0xDa5E551070dB21890Be1fa17721DD549D3b6Ed31' as Address
export const NFTContractAddress: Address =
    (process.env.NFT_CONTRACT_ADDRESS as Address) || DEFAULT_NFT_CONTRACT_ADDRESS

// License terms for Flow EVM IP management
export interface LicenseTerms {
    transferable: boolean
    royaltyPolicy: Address
    defaultMintingFee: bigint
    expiration: bigint
    commercialUse: boolean
    commercialAttribution: boolean
    commercializerChecker: Address
    commercializerCheckerData: string
    commercialRevShare: number
    commercialRevCeiling: bigint
    derivativesAllowed: boolean
    derivativesAttribution: boolean
    derivativesApproval: boolean
    derivativesReciprocal: boolean
    derivativeRevCeiling: bigint
    currency: Address
    uri: string
}

// Non-commercial social remixing terms
export const NonCommercialSocialRemixingTermsId = '1'
export const NonCommercialSocialRemixingTerms: LicenseTerms = {
    transferable: true,
    royaltyPolicy: zeroAddress,
    defaultMintingFee: 0n,
    expiration: 0n,
    commercialUse: false,
    commercialAttribution: false,
    commercializerChecker: zeroAddress,
    commercializerCheckerData: '0x',
    commercialRevShare: 0,
    commercialRevCeiling: 0n,
    derivativesAllowed: true,
    derivativesAttribution: true,
    derivativesApproval: false,
    derivativesReciprocal: true,
    derivativeRevCeiling: 0n,
    currency: WIP_TOKEN_ADDRESS,
    uri: 'https://github.com/piplabs/pil-document/blob/998c13e6ee1d04eb817aefd1fe16dfe8be3cd7a2/off-chain-terms/NCSR.json',
}

// Royalty policy addresses for Flow
export const RoyaltyPolicyLAP: Address = '0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E'
export const RoyaltyPolicyLRP: Address = '0x9156e603C949481883B1d3355c6f1132D191fC41'

// Commercial remix terms for Flow
export function createCommercialRemixTerms(terms: { commercialRevShare: number; defaultMintingFee: number }): LicenseTerms {
    return {
        transferable: true,
        royaltyPolicy: RoyaltyPolicyLAP,
        defaultMintingFee: parseEther(terms.defaultMintingFee.toString()),
        expiration: BigInt(0),
        commercialUse: true,
        commercialAttribution: true,
        commercializerChecker: zeroAddress,
        commercializerCheckerData: '0x',
        commercialRevShare: terms.commercialRevShare,
        commercialRevCeiling: BigInt(0),
        derivativesAllowed: true,
        derivativesAttribution: true,
        derivativesApproval: false,
        derivativesReciprocal: true,
        derivativeRevCeiling: BigInt(0),
        currency: WIP_TOKEN_ADDRESS,
        uri: 'https://github.com/piplabs/pil-document/blob/ad67bb632a310d2557f8abcccd428e4c9c798db1/off-chain-terms/CommercialRemix.json',
    }
}

// Licensing configuration for Flow
export interface LicensingConfig {
    mintingFee: bigint
    isSet: boolean
    disabled: boolean
    commercialRevShare: number
    expectGroupRewardPool: Address
    expectMinimumGroupRewardShare: number
    licensingHook: Address
    hookData: string
}

export const defaultLicensingConfig: LicensingConfig = {
    mintingFee: 0n,
    isSet: false,
    disabled: false,
    commercialRevShare: 0,
    expectGroupRewardPool: zeroAddress,
    expectMinimumGroupRewardShare: 0,
    licensingHook: zeroAddress,
    hookData: '0x',
}

export function convertRoyaltyPercentToTokens(royaltyPercent: number): number {
    // there are 100,000,000 tokens total (100, but 6 decimals)
    return royaltyPercent * 1_000_000
}

// Flow-specific utility functions
export function getFlowExplorerUrl(txHash: string): string {
    return `${networkInfo.blockExplorer}/tx/${txHash}`
}

export function getFlowAddressExplorerUrl(address: string): string {
    return `${networkInfo.blockExplorer}/address/${address}`
}

/**
 * Convert Substrate address to a valid EVM address
 * Yakoa requires EVM addresses (0x + 40 hex characters)
 * @param substrateAddress - Substrate address string
 * @returns Valid EVM contract address (0x + 40 hex characters)
 */
export function convertSubstrateAddressToEvmAddress(substrateAddress: string): Address {
  // Convert Substrate address to bytes
  const addressBytes = typeof Buffer !== 'undefined' 
    ? new Uint8Array(Buffer.from(substrateAddress, 'utf8'))
    : new TextEncoder().encode(substrateAddress);
  
  const addressHex = toHex(addressBytes);
  
  // Hash using Keccak256
  const hash = keccak256(addressHex);
  
  // Take first 40 characters (20 bytes) after 0x prefix
  // This gives us a valid EVM address format (0x + 40 hex chars = 42 total)
  const address = `0x${hash.slice(2, 42)}` as Address;
  
  return address;
}

/**
 * Convert Substrate address or NFT ID to a numeric token ID for Yakoa
 * Yakoa requires numeric token IDs (digits only)
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
  const nftIdBytes = typeof Buffer !== 'undefined' 
    ? new Uint8Array(Buffer.from(nftIdString, 'utf8'))
    : new TextEncoder().encode(nftIdString);
  
  const nftIdHex = toHex(nftIdBytes);
  const hash = keccak256(nftIdHex);
  
  // Convert hash to BigInt and then to string (this gives us a large numeric value)
  // Take first 16 bytes (32 hex chars) to avoid exceeding JavaScript number limits
  const numericValue = BigInt(`0x${hash.slice(2, 34)}`);
  
  return numericValue.toString();
}

/**
 * Format filing date (hex-encoded bytes) as a valid EVM contract address
 * Uses Keccak256 hash to generate a deterministic 40-character hex address
 * @param filingDateHex - Hex-encoded filing date (e.g., "0x323030392d31322d31322028426c6f636b3a20383529")
 * @param nftId - NFT ID to include in the hash for uniqueness
 * @returns Valid EVM contract address (0x + 40 hex characters)
 */
export function formatFilingDateAsContractAddress(filingDateHex: string, nftId: string | number): Address {
  // Ensure filing date has 0x prefix
  const normalizedFilingDate = filingDateHex.startsWith('0x') ? filingDateHex : `0x${filingDateHex}`;
  
  // Convert NFT ID string to bytes (without size constraint)
  // NFT ID can be a number or a Substrate address string
  const nftIdString = nftId.toString();
  // Convert string to bytes using Buffer (Node.js) or TextEncoder
  const nftIdBytes = typeof Buffer !== 'undefined' 
    ? new Uint8Array(Buffer.from(nftIdString, 'utf8'))
    : new TextEncoder().encode(nftIdString);
  
  // Get filing date bytes
  const filingDateBytes = hexToBytes(normalizedFilingDate as `0x${string}`);
  
  // Concatenate filing date bytes with NFT ID bytes
  const combinedBytes = concat([filingDateBytes, nftIdBytes]);
  
  // Convert back to hex for hashing
  const combinedHex = toHex(combinedBytes);
  
  // Hash using Keccak256
  const hash = keccak256(combinedHex);
  
  // Take first 40 characters (20 bytes) after 0x prefix
  // This gives us a valid EVM address format (0x + 40 hex chars = 42 total)
  const address = `0x${hash.slice(2, 42)}` as Address;
  
  return address;
}
