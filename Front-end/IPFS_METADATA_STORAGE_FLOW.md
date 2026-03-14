# IPFS Metadata Image Storage Flow - Complete Documentation

## Overview
This document explains how IPFS metadata (including images) for IP assets is stored and retrieved in the application.

## Storage Locations

### 1. **IPFS (Decentralized Storage)**
   - **Location**: Pinata IPFS network
   - **What's stored**: 
     - Individual image files (uploaded separately)
     - Complete NFT metadata JSON (includes image URLs array)
   - **Persistence**: Permanent (as long as Pinata maintains the files)

### 2. **React Context State** (`InnovationContext`)
   - **Location**: In-memory React state
   - **What's stored**: 
     - `nftMetadataUrl`: The IPFS URL of the metadata JSON
     - `nftMetadata`: The metadata object (includes `image: string[]`)
   - **Persistence**: Temporary - lost on page refresh or navigation

### 3. **localStorage (Browser Storage)**
   - **Location**: Browser's localStorage
   - **Keys**:
     - `softlaw_pending_metadata`: Stores metadata URL before NFT is minted
     - `softlaw_nft_metadata`: Maps NFT ID → metadata URL after minting
   - **Persistence**: Persistent across page refreshes (until cleared)

## Complete Flow

### Step 1: Image Upload (`ipDetails.tsx` - `uploadImagesToIPFS`)
```
User selects images
  ↓
Images uploaded to IPFS via Pinata
  ↓
Image URLs created (e.g., https://gateway.pinata.cloud/ipfs/QmXXX...)
  ↓
Image URLs stored in:
  - React context: `imagesLinks` state
  - React context: `nftMetadata.image` array
  ↓
Full metadata JSON (with image URLs) uploaded to IPFS
  ↓
Metadata URL stored in:
  - React context: `nftMetadataUrl` state
  - localStorage: `softlaw_pending_metadata` (NEW - just added)
```

### Step 2: Final Metadata Upload (`ipDetails.tsx` - `handleUploadFinalMetadata`)
```
User clicks "Upload Metadata" button
  ↓
Metadata JSON uploaded to IPFS
  ↓
Metadata URL stored in:
  - React context: `nftMetadataUrl` state
  - localStorage: `softlaw_pending_metadata`
```

### Step 3: NFT Minting (`confirmation.tsx` or `mint.tsx`)
```
User clicks "Mint NFT"
  ↓
Transaction sent to blockchain
  ↓
NFT ID extracted from transaction events
  ↓
Metadata URL retrieved from:
  - React context: `nftMetadataUrl` OR
  - localStorage: `softlaw_pending_metadata` (fallback)
  ↓
Association stored in localStorage:
  - Key: `softlaw_nft_metadata`
  - Value: `{ [nftId]: { metadataUrl: "...", timestamp: ... } }`
  ↓
Pending metadata cleared from localStorage
```

### Step 4: Displaying IP Assets (`MyProducts.tsx`)
```
Component loads
  ↓
Fetch all NFTs from blockchain
  ↓
Get metadata URLs from localStorage: `softlaw_nft_metadata`
  ↓
For each NFT:
  - If metadata URL exists → Fetch metadata from IPFS
  - Extract image URLs from metadata
  - Display images in card
  ↓
Fallback: Check for pending metadata and associate with NFTs without metadata
```

## Storage Functions

### `storePendingMetadata(metadataUrl, accountAddress?)`
- **Purpose**: Store metadata URL before NFT is minted
- **Location**: `utils/nftMetadataStorage.ts`
- **Storage**: localStorage key `softlaw_pending_metadata`
- **Called from**:
  - `ipDetails.tsx` - `uploadImagesToIPFS()` (when images uploaded)
  - `ipDetails.tsx` - `handleUploadFinalMetadata()` (when metadata uploaded)
  - `confirmation.tsx` - `mintNFT()` (fallback if NFT ID not found)

### `storeNFTMetadata(nftId, metadataUrl)`
- **Purpose**: Store metadata URL associated with NFT ID
- **Location**: `utils/nftMetadataStorage.ts`
- **Storage**: localStorage key `softlaw_nft_metadata`
- **Called from**:
  - `confirmation.tsx` - `mintNFT()` (after successful mint)
  - `mint.tsx` - `mintNFT()` (after successful mint)
  - `MyProducts.tsx` - `fetchIPAssets()` (fallback association)

### `getNFTMetadataUrls(nftIds)`
- **Purpose**: Retrieve metadata URLs for multiple NFTs
- **Location**: `utils/nftMetadataStorage.ts`
- **Storage**: Reads from localStorage key `softlaw_nft_metadata`
- **Called from**: `MyProducts.tsx` - `fetchIPAssets()`

### `fetchNFTMetadata(metadataUrl)`
- **Purpose**: Fetch metadata JSON from IPFS
- **Location**: `utils/nftMetadataStorage.ts`
- **Storage**: Fetches from IPFS gateway (Pinata)
- **Called from**: `MyProducts.tsx` - `fetchIPAssets()`

## Metadata JSON Structure

The metadata stored on IPFS has this structure:
```json
{
  "name": "IP Asset Name",
  "technicalName": "Technical Name",
  "description": "Description",
  "type": "Patent/Trademark/etc",
  "useDate": "2024-01-01",
  "registryNumber": "REG123",
  "collectionId": 0,
  "image": [
    "https://gateway.pinata.cloud/ipfs/QmImage1...",
    "https://gateway.pinata.cloud/ipfs/QmImage2...",
    ...
  ]
}
```

## Current Status

✅ **Images are uploaded to IPFS** - Individual image files stored on Pinata
✅ **Metadata JSON is uploaded to IPFS** - Complete metadata with image URLs stored on Pinata
✅ **Metadata URL stored in React context** - Available during session
✅ **Metadata URL stored in localStorage (pending)** - Persists before minting
✅ **Metadata URL stored in localStorage (associated)** - Persists after minting with NFT ID
✅ **Metadata retrieved from IPFS** - Fetched when displaying IP assets
✅ **Images extracted and displayed** - Images shown in MyProducts cards

## Debugging

To check what's stored in localStorage:
```javascript
// In browser console:
JSON.parse(localStorage.getItem('softlaw_pending_metadata'))
JSON.parse(localStorage.getItem('softlaw_nft_metadata'))
```

## Recent Fixes

1. **Added `storePendingMetadata` to `uploadImagesToIPFS`** - Now metadata URL is stored when images are uploaded, not just when explicitly clicking upload button
2. **Added fallback chain query** - If NFT ID not found in events, queries chain to find latest NFT
3. **Added pending metadata association** - MyProducts component can associate pending metadata with NFTs that don't have metadata yet


