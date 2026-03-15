import { Address, parseEther, zeroAddress } from 'viem'
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
