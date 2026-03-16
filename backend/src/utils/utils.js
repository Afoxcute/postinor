"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertSubstrateAddressToEvmAddress = exports.convertNftIdToNumericTokenId = exports.formatFilingDateAsContractAddress = exports.defaultLicensingConfig = exports.RoyaltyPolicyLRP = exports.RoyaltyPolicyLAP = exports.NonCommercialSocialRemixingTerms = exports.NonCommercialSocialRemixingTermsId = exports.NFTContractAddress = exports.WIP_TOKEN_ADDRESS = void 0;
exports.createCommercialRemixTerms = createCommercialRemixTerms;
exports.convertRoyaltyPercentToTokens = convertRoyaltyPercentToTokens;
exports.getFlowExplorerUrl = getFlowExplorerUrl;
exports.getFlowAddressExplorerUrl = getFlowAddressExplorerUrl;
const viem_1 = require("viem");
const dotenv_1 = __importDefault(require("dotenv"));
const config_1 = require("./config");
dotenv_1.default.config();
// Use native FLOW token as WIP_TOKEN_ADDRESS
exports.WIP_TOKEN_ADDRESS = config_1.NATIVE_TOKEN_ADDRESS;
// Export contract addresses with appropriate defaults based on network (Flow EVM Testnet)
const DEFAULT_NFT_CONTRACT_ADDRESS = '0xDa5E551070dB21890Be1fa17721DD549D3b6Ed31';
exports.NFTContractAddress = process.env.NFT_CONTRACT_ADDRESS || DEFAULT_NFT_CONTRACT_ADDRESS;
// Non-commercial social remixing terms
exports.NonCommercialSocialRemixingTermsId = '1';
exports.NonCommercialSocialRemixingTerms = {
    transferable: true,
    royaltyPolicy: viem_1.zeroAddress,
    defaultMintingFee: 0n,
    expiration: 0n,
    commercialUse: false,
    commercialAttribution: false,
    commercializerChecker: viem_1.zeroAddress,
    commercializerCheckerData: '0x',
    commercialRevShare: 0,
    commercialRevCeiling: 0n,
    derivativesAllowed: true,
    derivativesAttribution: true,
    derivativesApproval: false,
    derivativesReciprocal: true,
    derivativeRevCeiling: 0n,
    currency: exports.WIP_TOKEN_ADDRESS,
    uri: 'https://github.com/piplabs/pil-document/blob/998c13e6ee1d04eb817aefd1fe16dfe8be3cd7a2/off-chain-terms/NCSR.json',
};
// Royalty policy addresses for Flow
exports.RoyaltyPolicyLAP = '0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E';
exports.RoyaltyPolicyLRP = '0x9156e603C949481883B1d3355c6f1132D191fC41';
// Commercial remix terms for Flow
function createCommercialRemixTerms(terms) {
    return {
        transferable: true,
        royaltyPolicy: exports.RoyaltyPolicyLAP,
        defaultMintingFee: (0, viem_1.parseEther)(terms.defaultMintingFee.toString()),
        expiration: BigInt(0),
        commercialUse: true,
        commercialAttribution: true,
        commercializerChecker: viem_1.zeroAddress,
        commercializerCheckerData: '0x',
        commercialRevShare: terms.commercialRevShare,
        commercialRevCeiling: BigInt(0),
        derivativesAllowed: true,
        derivativesAttribution: true,
        derivativesApproval: false,
        derivativesReciprocal: true,
        derivativeRevCeiling: BigInt(0),
        currency: exports.WIP_TOKEN_ADDRESS,
        uri: 'https://github.com/piplabs/pil-document/blob/ad67bb632a310d2557f8abcccd428e4c9c798db1/off-chain-terms/CommercialRemix.json',
    };
}
exports.defaultLicensingConfig = {
    mintingFee: 0n,
    isSet: false,
    disabled: false,
    commercialRevShare: 0,
    expectGroupRewardPool: viem_1.zeroAddress,
    expectMinimumGroupRewardShare: 0,
    licensingHook: viem_1.zeroAddress,
    hookData: '0x',
};
function convertRoyaltyPercentToTokens(royaltyPercent) {
    // there are 100,000,000 tokens total (100, but 6 decimals)
    return royaltyPercent * 1000000;
}
// Flow-specific utility functions
function getFlowExplorerUrl(txHash) {
    return `${config_1.networkInfo.blockExplorer}/tx/${txHash}`;
}
function getFlowAddressExplorerUrl(address) {
    return `${config_1.networkInfo.blockExplorer}/address/${address}`;
}
/**
 * Format filing date (hex-encoded bytes) as a valid EVM contract address
 * Uses Keccak256 hash to generate a deterministic 40-character hex address
 * @param filingDateHex - Hex-encoded filing date (e.g., "0x323030392d31322d31322028426c6f636b3a20383529")
 * @param nftId - NFT ID to include in the hash for uniqueness
 * @returns Valid EVM contract address (0x + 40 hex characters)
 */
/**
 * Convert Substrate address to a valid EVM address
 * Yakoa requires EVM addresses (0x + 40 hex characters)
 */
function convertSubstrateAddressToEvmAddress(substrateAddress) {
    // Convert Substrate address to bytes
    const addressBytes = Buffer.from(substrateAddress, 'utf8');
    const addressHex = viem_1.toHex(addressBytes);
    // Hash using Keccak256
    const hash = viem_1.keccak256(addressHex);
    // Take first 40 characters (20 bytes) after 0x prefix
    // This gives us a valid EVM address format (0x + 40 hex chars = 42 total)
    const address = `0x${hash.slice(2, 42)}`;
    return address;
}
exports.convertSubstrateAddressToEvmAddress = convertSubstrateAddressToEvmAddress;
/**
 * Convert Substrate address or NFT ID to a numeric token ID for Yakoa
 * Yakoa requires numeric token IDs (digits only)
 */
function convertNftIdToNumericTokenId(nftId) {
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
    const nftIdBytes = Buffer.from(nftIdString, 'utf8');
    const nftIdHex = viem_1.toHex(nftIdBytes);
    const hash = viem_1.keccak256(nftIdHex);
    // Convert hash to BigInt and then to string (this gives us a large numeric value)
    // Take first 16 bytes (32 hex chars) to avoid exceeding JavaScript number limits
    const numericValue = BigInt(`0x${hash.slice(2, 34)}`);
    return numericValue.toString();
}
exports.convertNftIdToNumericTokenId = convertNftIdToNumericTokenId;
function formatFilingDateAsContractAddress(filingDateHex, nftId) {
    // Ensure filing date has 0x prefix
    const normalizedFilingDate = filingDateHex.startsWith('0x') ? filingDateHex : `0x${filingDateHex}`;
    // Convert NFT ID string to bytes (without size constraint)
    // NFT ID can be a number or a Substrate address string
    const nftIdString = nftId.toString();
    const nftIdBytes = Buffer.from(nftIdString, 'utf8');
    const nftIdHex = viem_1.toHex(nftIdBytes);
    // Get filing date bytes
    const filingDateBytes = viem_1.hexToBytes(normalizedFilingDate);
    // Concatenate filing date bytes with NFT ID bytes
    const combinedBytes = viem_1.concat([filingDateBytes, nftIdBytes]);
    // Convert back to hex for hashing
    const combinedHex = viem_1.toHex(combinedBytes);
    // Hash using Keccak256
    const hash = viem_1.keccak256(combinedHex);
    // Take first 40 characters (20 bytes) after 0x prefix
    // This gives us a valid EVM address format (0x + 40 hex chars = 42 total)
    const address = `0x${hash.slice(2, 42)}`;
    return address;
}
exports.formatFilingDateAsContractAddress = formatFilingDateAsContractAddress;
