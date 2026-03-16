import { Request, Response } from 'express';
import { registerToYakoa } from '../services/yakoascanner';
import { convertBigIntsToStrings } from '../utils/bigIntSerializer';
import { formatFilingDateAsContractAddress, convertSubstrateAddressToEvmAddress } from '../utils/utils';

/**
 * Register a Substrate NFT with Yakoa for infringement detection
 * Uses NFT ID and filing date from the chain
 */
const handleSubstrateNftRegistration = async (req: Request, res: Response) => {
  console.log("🔥 Entered handleSubstrateNftRegistration");
  try {
    const { 
      nftId, 
      filingDate, 
      transactionHash, 
      blockNumber, 
      owner, 
      name, 
      description, 
      jurisdiction,
      metadataUrl 
    } = req.body;

    console.log("📦 Received Substrate NFT registration request:", {
      nftId,
      filingDate,
      transactionHash,
      blockNumber,
      owner,
      name,
      description,
      jurisdiction,
      metadataUrl
    });

    // Validate required parameters
    if (!nftId || !filingDate) {
      return res.status(400).json({
        error: 'Missing required parameters: nftId, filingDate'
      });
    }

    if (!transactionHash || !blockNumber || !owner) {
      return res.status(400).json({
        error: 'Missing required parameters: transactionHash, blockNumber, owner'
      });
    }

    // Parse filing date - it might be in hex format (0x...) or string format
    let parsedFilingDate = filingDate;
    let filingDateHex = filingDate;
    
    if (typeof filingDate === 'string' && filingDate.startsWith('0x')) {
      // Keep the hex version for contract address generation
      filingDateHex = filingDate;
      
      // Decode hex to string for display/metadata
      try {
        const hexString = filingDate.slice(2);
        const bytes = [];
        for (let i = 0; i < hexString.length; i += 2) {
          bytes.push(parseInt(hexString.substr(i, 2), 16));
        }
        parsedFilingDate = String.fromCharCode(...bytes.filter(b => b > 0));
      } catch (e) {
        console.warn('Could not decode hex filing date, using as-is:', e);
      }
    } else {
      // If it's not hex, convert to hex for hashing
      filingDateHex = `0x${Buffer.from(filingDate).toString('hex')}`;
    }

    // Format filing date as a valid EVM contract address
    // This will be used as the contract address in the Yakoa ID format: contractAddress:tokenId
    const contractAddress = formatFilingDateAsContractAddress(filingDateHex, nftId);
    
    // Determine token ID for Yakoa:
    // - If nftId is already numeric (e.g. on-chain IP ID like 0, 1, 2...), use it directly
    // - Otherwise, fall back to "0" to keep the ID compact and human-readable
    const nftIdString = nftId.toString();
    const tokenIdForYakoa = /^\d+$/.test(nftIdString) ? nftIdString : '0';
    
    // Convert Substrate owner address to EVM address (Yakoa requires EVM addresses)
    const evmCreatorAddress = convertSubstrateAddressToEvmAddress(owner);
    
    // Format ID for Yakoa: Use contractAddress:IP_ID format
    // Yakoa requires format: 0x[40-hex-chars]:[numeric-token-id]
    // Here we use the IP ID (numeric nftId when available, otherwise 0) after the colon.
    const yakoaId = `${contractAddress}:${tokenIdForYakoa}`;
    
    console.log("🔍 Generated contract address from filing date:", contractAddress);
    console.log("🔍 Converted Substrate owner to EVM address:", evmCreatorAddress);
    console.log("🔍 Yakoa ID format:", yakoaId);

    // Extract IPFS hash from metadata URL if available
    const extractIPFSHash = (url: string): string | null => {
      if (!url) return null;
      // Handle ipfs:// protocol
      if (url.startsWith('ipfs://')) {
        return url.replace('ipfs://', '');
      }
      // Handle gateway URLs
      const gatewayMatch = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
      if (gatewayMatch) {
        return gatewayMatch[1];
      }
      // Handle direct hash
      if (/^[a-zA-Z0-9]{46,}$/.test(url)) {
        return url;
      }
      return null;
    };

    const ipfsHash = metadataUrl ? extractIPFSHash(metadataUrl) : null;

    // Prepare comprehensive metadata for Yakoa (enhanced for better infringement detection)
    const yakoaMetadata = {
      title: name || `Substrate NFT #${nftId}`,
      description: description || '',
      creator: evmCreatorAddress, // Use EVM address for consistency
      created_at: parsedFilingDate || new Date().toISOString(),
      filing_date: parsedFilingDate,
      jurisdiction: jurisdiction || '',
      nft_id: nftId.toString(),
      contract_address: contractAddress,
      token_id: tokenIdForYakoa, // Use IP ID (or 0) as token ID for Yakoa
      source: 'substrate',
      // Enhanced metadata for better infringement detection
      content_hash: ipfsHash || filingDateHex, // Use IPFS hash or filing date as content hash
      monitoring_enabled: 'true', // Convert boolean to string for Yakoa API
      infringement_alerts: 'true', // Convert boolean to string for Yakoa API
      // Additional metadata fields
      network: 'substrate',
      chain_id: 'substrate',
      original_filename: name || `substrate-nft-${nftId}`,
      upload_timestamp: new Date().toISOString(),
      // License and usage metadata (can be enhanced with actual license data)
      license_type: 'all_rights_reserved',
      commercial_use: 'false', // Convert boolean to string for Yakoa API
      derivatives_allowed: 'false', // Convert boolean to string for Yakoa API
    };

    // Prepare media array with enhanced information
    const yakoaMedia = metadataUrl ? [
      {
        media_id: `substrate-nft-${nftId}`,
        url: metadataUrl,
        type: 'metadata', // Can be enhanced to detect actual media type
        size: 0, // Can be enhanced if file size is available
        metadata: {
          name: name || `Substrate NFT #${nftId}`,
          description: description || '',
          creator: evmCreatorAddress,
          created_at: parsedFilingDate || new Date().toISOString(),
          filing_date: parsedFilingDate,
          jurisdiction: jurisdiction || '',
          nft_id: nftId.toString(),
          contract_address: contractAddress,
          token_id: numericTokenId,
        }
      }
    ] : [];

    // Prepare authorizations for infringement monitoring
    const authorizations = [
      {
        brand_id: null,
        brand_name: null,
        data: {
          type: 'email' as const,
          email_address: process.env.DEFAULT_CREATOR_EMAIL || 'creator@softlaw.com'
        }
      }
    ];

    console.log("📞 Calling registerToYakoa for Substrate NFT...");
    console.log("🔍 Yakoa ID format:", yakoaId);
    console.log("🔍 Contract Address (from filing date):", contractAddress);
    console.log("🔍 Filing Date (decoded):", parsedFilingDate);
    console.log("🔍 Filing Date (hex):", filingDateHex);

    // Convert blockNumber to bigint if it's a string or number
    const blockNumberBigInt = typeof blockNumber === 'bigint' 
      ? blockNumber 
      : BigInt(blockNumber);

    // Register with Yakoa
    const yakoaResponse = await registerToYakoa({
      Id: yakoaId,
      transactionHash: transactionHash as `0x${string}`,
      blockNumber: blockNumberBigInt,
      creatorId: evmCreatorAddress, // Use EVM address instead of Substrate address
      metadata: yakoaMetadata,
      media: yakoaMedia,
      brandId: null,
      brandName: null,
      emailAddress: process.env.DEFAULT_CREATOR_EMAIL || 'creator@softlaw.com',
      licenseParents: [],
      authorizations: authorizations
    });

    const responseData = {
      message: 'Substrate NFT successfully registered with Yakoa for infringement detection',
      nftId,
      filingDate: parsedFilingDate,
      contractAddress, // Include the generated contract address in response
      yakoaId, // Include the Yakoa ID format
      yakoa: yakoaResponse
    };

    return res.status(200).json(convertBigIntsToStrings(responseData));
  } catch (err) {
    console.error('❌ Substrate NFT registration error:', err);
    return res.status(500).json({
      error: 'Failed to register Substrate NFT with Yakoa',
      details: err instanceof Error ? err.message : String(err),
    });
  }
};

export { handleSubstrateNftRegistration };

