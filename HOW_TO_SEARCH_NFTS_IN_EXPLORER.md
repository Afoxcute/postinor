# How to Search for IP NFTs in the Blockchain Explorer

## Method 1: Using Polkadot.js Apps (Recommended)

### Step 1: Connect to Your Chain

1. **Open Polkadot.js Apps**
   - Go to: https://polkadot.js.org/apps
   
2. **Connect to Your Local Chain**
   - Click the network selector (top left, shows "Polkadot" by default)
   - Click "Custom Endpoint" or the "+" button
   - Enter your WebSocket URL:
     - **Local Development**: `ws://127.0.0.1:38901` (check your terminal for the actual port)
     - **Testnet**: `wss://testnet.soft.law/node`
   - Click "Save" and select your custom endpoint

### Step 2: Query NFT Storage

1. **Navigate to Developer > Chain State**
   - Click "Developer" in the top menu
   - Select "Chain state"

2. **Query All NFTs**
   - **Selected state query**: Choose `ipPallet`
   - **Message to send**: Select `nfts`
   - **Parameters**: Leave empty (or enter a specific NFT ID to query one NFT)
   - Click "+" to add the query
   - Click "Query" button
   - This will show all NFTs stored in the chain

3. **Query Specific NFT by ID**
   - **Selected state query**: Choose `ipPallet`
   - **Message to send**: Select `nfts`
   - **Parameters**: Enter the NFT ID (e.g., `0` or `1`)
   - Click "+" to add the query
   - Click "Query" button
   - This will show the specific NFT details

### Step 3: View NFT Details

The query results will show:
- `id`: NFT ID
- `owner`: Current owner's address
- `name`: NFT name (as bytes)
- `description`: NFT description (as bytes)
- `filing_date`: Filing date (as bytes)
- `jurisdiction`: Jurisdiction (as bytes)

### Step 4: Search by Owner

1. **Query All NFTs** (as in Step 2)
2. **Filter Results**: Look through the results to find NFTs owned by a specific address
3. Or use the **Extrinsics** tab to query by owner programmatically

## Method 2: Using Extrinsics Tab

1. **Navigate to Developer > Extrinsics**
   - Click "Developer" in the top menu
   - Select "Extrinsics"

2. **Query NFT Storage via RPC**
   - This method requires using the chain's RPC methods directly
   - You can use the browser console with Polkadot.js API

## Method 3: Using Browser Console (Advanced)

1. **Open Polkadot.js Apps** and connect to your chain
2. **Open Browser Console** (F12 or Right-click > Inspect > Console)
3. **Run this code**:

```javascript
// Get the API instance from Polkadot.js Apps
const api = await window.injectedWeb3['polkadot-js'].enable('polkadot-js-apps');
// Or if using the page's API:
const api = window.api;

// Query all NFTs
const nfts = await api.query.ipPallet.nfts.entries();
console.log('All NFTs:', nfts);

// Query specific NFT by ID
const nftId = 0; // Change to your NFT ID
const nft = await api.query.ipPallet.nfts(nftId);
console.log('NFT', nftId, ':', nft.toHuman());
```

## Method 4: Search by Transaction/Event

1. **Navigate to Network > Explorer**
   - Click "Network" in the top menu
   - Select "Explorer"

2. **Filter by Event**
   - Look for `NftMinted` events
   - Click on a block to see all events in that block
   - Find the `NftMinted` event to see the NFT ID and owner

3. **Search by Block Number**
   - If you know the block number where an NFT was minted
   - Go to "Network > Explorer"
   - Enter the block number in the search
   - View events in that block

## Quick Reference

### Local Chain URL
```
ws://127.0.0.1:38901
```
(Check your terminal output for the actual port - it may vary)

### Testnet URL
```
wss://testnet.soft.law/node
```

### Storage Query Path
```
ipPallet.nfts
```

### Common NFT Fields
- `id`: NFT ID (number)
- `owner`: Account address (string)
- `name`: NFT name (BoundedVec<u8>)
- `description`: NFT description (BoundedVec<u8>)
- `filing_date`: Filing date (BoundedVec<u8>)
- `jurisdiction`: Jurisdiction (BoundedVec<u8>)

## Tips

1. **Decode Bytes**: NFT name, description, etc. are stored as bytes. You may need to decode them:
   ```javascript
   const nameBytes = nft.name; // Array of numbers
   const nameString = String.fromCharCode(...nameBytes);
   ```

2. **Query Multiple NFTs**: Use `entries()` to get all NFTs, then filter in JavaScript

3. **View Contracts**: You can also query `ipPallet.contracts` to see license/purchase contracts associated with NFTs

4. **View Offers**: Query `ipPallet.offers` to see pending license/purchase offers

