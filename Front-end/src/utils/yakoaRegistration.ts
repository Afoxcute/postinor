/**
 * Utility functions for Yakoa registration
 * Ensures proper metadata structure for Yakoa infringement detection
 */

export interface YakoaMetadata {
  name: string;
  description: string;
  image: string;
  creator: string;
  created_at: string;
  filing_date?: string; // Optional filing date for better tracking
  // Additional metadata for better infringement detection
  content_type?: string;
  file_size?: number;
  mime_type?: string;
  tags?: string[];
  category?: string;
  license_type?: string;
  commercial_use?: boolean;
  derivatives_allowed?: boolean;
  creator_email?: string;
  // File-specific metadata
  file_name?: string;
  file_extension?: string;
  upload_timestamp?: string;
  // Blockchain metadata
  network?: string;
  chain_id?: string;
  contract_address?: string;
  // Infringement detection metadata
  monitoring_enabled?: boolean;
  infringement_alerts?: boolean;
  content_hash?: string;
  original_filename?: string;
}

/**
 * Creates comprehensive metadata for Yakoa registration
 * @param params - Parameters for creating metadata
 * @returns Complete metadata object for Yakoa
 */
export function createYakoaMetadata(params: {
  ipHash: string;
  name: string;
  description: string;
  creator: string;
  file?: File | null;
  filingDate?: string; // Optional filing date (defaults to current date)
  creatorEmail?: string;
  isEncrypted?: boolean;
  contractAddress?: string;
  network?: string;
  chainId?: string;
}): YakoaMetadata {
  const {
    ipHash,
    name,
    description,
    creator,
    file,
    filingDate,
    creatorEmail,
    isEncrypted = false,
    contractAddress,
    network = 'creditcoin',
    chainId = '102031',
  } = params;

  // Use filing date if provided, otherwise use current date
  const registrationDate = filingDate || new Date().toISOString();
  const uploadTimestamp = new Date().toISOString();

  // Determine content type and MIME type from file
  const contentType = file?.type || 'unknown';
  const mimeType = file?.type || 'unknown';
  const fileSize = file?.size || 0;
  const fileName = file?.name || 'unknown';
  const fileExtension = fileName.split('.').pop() || 'unknown';

  // Extract IPFS hash (remove ipfs:// prefix if present)
  const ipfsHash = ipHash.startsWith('ipfs://') 
    ? ipHash.replace('ipfs://', '') 
    : ipHash;

  // Create metadata URL (use Pinata gateway for better reliability)
  const metadataImageUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

  const metadata: YakoaMetadata = {
    name: name || `IP Asset #${Date.now()}`,
    description: description || 'No description provided',
    image: metadataImageUrl,
    creator: creator.toLowerCase(), // Ensure lowercase for consistency
    created_at: registrationDate,
    filing_date: registrationDate, // Use registration date as filing date
    // File-specific metadata
    content_type: contentType,
    file_size: fileSize,
    mime_type: mimeType,
    file_name: fileName,
    file_extension: fileExtension,
    upload_timestamp: uploadTimestamp,
    // Blockchain metadata
    network: network,
    chain_id: chainId,
    contract_address: contractAddress,
    // IPFS metadata
    content_hash: ipfsHash,
    original_filename: fileName,
    // License and usage metadata
    license_type: 'all_rights_reserved',
    commercial_use: false,
    derivatives_allowed: false,
    // Infringement detection metadata
    monitoring_enabled: true,
    infringement_alerts: true,
    // Optional fields
    tags: [],
    category: 'general',
    creator_email: creatorEmail || 'creator@fufu.com',
  };

  return metadata;
}

/**
 * Validates metadata before sending to backend
 * @param metadata - Metadata to validate
 * @returns Validation result with errors if any
 */
export function validateYakoaMetadata(metadata: YakoaMetadata): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!metadata.name || metadata.name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (!metadata.creator || !metadata.creator.match(/^0x[a-fA-F0-9]{40}$/)) {
    errors.push('Creator must be a valid Ethereum address (0x...)');
  }

  if (!metadata.image || !metadata.image.startsWith('http')) {
    errors.push('Image must be a valid HTTP/HTTPS URL');
  }

  if (!metadata.created_at) {
    errors.push('Created date is required');
  }

  if (metadata.creator_email && !metadata.creator_email.includes('@')) {
    errors.push('Creator email must be a valid email address');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Formats metadata for backend API
 * @param metadata - Yakoa metadata object
 * @returns Stringified metadata for backend
 */
export function formatMetadataForBackend(metadata: YakoaMetadata): string {
  return JSON.stringify(metadata);
}

