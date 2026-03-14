# IPFS Gateway URL Implementation

## Overview
All IPFS content is accessed through HTTPS gateway URLs. The app never loads `ipfs://` directly in the browser. Instead, all IPFS references are converted to Pinata's public gateway URLs (`https://gateway.pinata.cloud/ipfs/<cid>`).

## Implementation

### 1. Core Utility Function: `getIPFSGatewayURL`

**Location**: `src/utils/ipfs.ts`

This function normalizes any IPFS reference to a standardized HTTPS gateway URL:

```typescript
export const getIPFSGatewayURL = (url: string): string => {
  if (!url) return '';
  
  const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud";
  
  // Handle ipfs:// protocol
  if (url.startsWith('ipfs://')) {
    const cid = url.replace('ipfs://', '').trim();
    return `${gateway}/ipfs/${cid}`;
  }
  
  // Handle /ipfs/ path
  if (url.includes('/ipfs/')) {
    const parts = url.split('/ipfs/');
    if (parts.length > 1) {
      const cid = parts[1].split('?')[0].split('#')[0].trim();
      return `${gateway}/ipfs/${cid}`;
    }
  }
  
  // Already a gateway URL or HTTPS URL - return as is
  if (url.includes('gateway.pinata.cloud') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Treat as plain CID
  const cleanCid = url.trim().replace(/^\/+|\/+$/g, '');
  return `${gateway}/ipfs/${cleanCid}`;
};
```

**Handles**:
- ✅ `ipfs://Qm...` → `https://gateway.pinata.cloud/ipfs/Qm...`
- ✅ `https://example.com/ipfs/Qm...` → `https://gateway.pinata.cloud/ipfs/Qm...`
- ✅ `https://gateway.pinata.cloud/ipfs/Qm...` → unchanged
- ✅ Plain CID `Qm...` → `https://gateway.pinata.cloud/ipfs/Qm...`

### 2. Image Display in MyProducts

**Location**: `src/components/Dashboard/MyProducts/MyProducts.tsx`

When fetching metadata and extracting image URLs:

```typescript
// Extract image URL from metadata
if (imageUrl) {
  // Convert IPFS URLs to gateway URLs (handles ipfs://, /ipfs/ paths, etc.)
  const normalizedImageUrl = getIPFSGatewayURL(imageUrl);
  const normalizedAllImages = allImageUrls.map(url => getIPFSGatewayURL(url));
  
  return {
    ...asset,
    imageUrl: normalizedImageUrl,
    images: normalizedAllImages,
  };
}
```

**Result**: All image URLs are normalized to gateway URLs before being used in `<Image>` components.

### 3. Confirmation Modal Preview

**Location**: `src/components/innovationV1/nft/confirmation.tsx`

When displaying thumbnail previews:

```typescript
{nftData?.image?.map((src, index) => {
  const normalizedSrc = getIPFSGatewayURL(src);
  return (
    <img key={index} src={normalizedSrc} alt={`NFT ${index}`} />
  );
})}
```

**Result**: Preview images are normalized to gateway URLs.

## Flow Diagram

```
1. User uploads images
   ↓
2. Images uploaded to IPFS via Pinata
   ↓
3. Image CIDs stored in metadata JSON
   ↓
4. Metadata JSON uploaded to IPFS
   ↓
5. Metadata URL stored in localStorage
   ↓
6. When displaying:
   - Fetch metadata from IPFS (via gateway URL)
   - Extract image URLs from metadata
   - Normalize image URLs with getIPFSGatewayURL()
   - Display using <Image src={normalizedUrl} />
   ↓
7. Browser requests: https://gateway.pinata.cloud/ipfs/<cid>
   ↓
8. Pinata gateway fetches from IPFS and serves over HTTPS
```

## Key Points

1. **No Direct IPFS Access**: The browser never accesses IPFS directly. All content goes through HTTPS gateway URLs.

2. **Normalization at Display Time**: Image URLs are normalized when extracted from metadata, ensuring consistent gateway URLs regardless of how they were stored.

3. **Gateway Preference**: Uses Pinata's public gateway by default (`https://gateway.pinata.cloud`), configurable via `NEXT_PUBLIC_IPFS_GATEWAY` environment variable.

4. **Backward Compatible**: Handles multiple IPFS URL formats:
   - `ipfs://` protocol
   - `/ipfs/` paths
   - Already-normalized gateway URLs
   - Plain CIDs

## Testing

To verify the implementation:

1. **Check metadata storage**: Images should be stored as gateway URLs or CIDs in metadata JSON
2. **Check image display**: All images should load via `https://gateway.pinata.cloud/ipfs/...` URLs
3. **Check browser network tab**: All image requests should go to Pinata gateway, not `ipfs://` protocol

## Environment Variable

Optional: Set `NEXT_PUBLIC_IPFS_GATEWAY` in `.env.local` to use a different gateway:
```
NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.io
```

Default: `https://gateway.pinata.cloud`


