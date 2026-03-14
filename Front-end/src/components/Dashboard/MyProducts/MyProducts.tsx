"use client";
import React, { useEffect, useState } from "react";
import MaxWidthWrapper from "@/components/MaxWidhWrapper";
import { useContext } from "react";
import Footer from "../../Footer";
import Image from "next/image";
import Link from "next/link";
import { FormDataContext } from "@/components/FormDataContext";
import { useDashboardContext } from "@/context/dashboard";
import TypesComponent from "@/components/TypesProps";
import { useInnovationContext } from "@/context/innovation";
import { useAccountsContext } from "@/context/account";
import { getSoftlawApi } from "@/utils/softlaw/getApi";
import { getNFTMetadataUrls, fetchNFTMetadata, getAndClearPendingMetadata, storePendingMetadata, storeNFTMetadata } from "@/utils/nftMetadataStorage";
import { getIPFSGatewayURL } from "@/utils/ipfs";

interface MyProductsProps {
  onDataChange: (data: any) => void;
}

interface IPAsset {
  id: string;
  owner: string;
  name: string;
  description: string;
  filingDate: string;
  jurisdiction: string;
  imageUrl?: string; // IPFS URL for the first image
  images?: string[]; // All image URLs
}

export default function MyProducts({ onDataChange }: MyProductsProps) {
  const { selectedTabDashboard, setSelectedTabDashboard } =
    useDashboardContext();

  const { chain, setChain, nftMetadataUrl } = useInnovationContext();
  const { selectedAccount } = useAccountsContext();

  const { formData, updateFormData } = useContext(FormDataContext);

  const [ipAssets, setIpAssets] = useState<IPAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState<Record<string, boolean>>({});

  // Helper function to convert BoundedVec<u8> to string
  const bytesToString = (bytes: any): string => {
    if (!bytes) return '';
    
    // If it's already a string
    if (typeof bytes === 'string') {
      // Check if it's a hex string (starts with 0x)
      if (bytes.startsWith('0x')) {
        try {
          // Remove 0x prefix and convert hex to bytes
          const hex = bytes.slice(2);
          const byteArray = new Uint8Array(hex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
          // Decode bytes to string
          const decoded = new TextDecoder().decode(byteArray);
          return decoded;
        } catch (e) {
          console.warn("Error decoding hex string:", e, bytes);
          // If decoding fails, return the hex string as-is
          return bytes;
        }
      }
      // If it's a regular string, return it
      return bytes;
    }
    
    // If it's an array of numbers (bytes)
    if (Array.isArray(bytes)) {
      try {
        // Filter out any non-number values and convert
        const validBytes = bytes.filter(b => typeof b === 'number' && b >= 0 && b <= 255);
        if (validBytes.length > 0) {
          return new TextDecoder().decode(new Uint8Array(validBytes));
        }
        // If array contains strings, join them
        if (bytes.some(b => typeof b === 'string')) {
          return bytes.join('');
        }
      } catch (e) {
        console.warn("Error decoding bytes array:", e, bytes);
      }
    }
    
    // Try to convert to string
    try {
      return String(bytes);
    } catch {
      return '';
    }
  };

  // Fetch all IP assets from the chain
  useEffect(() => {
    let isMounted = true; // Track if component is still mounted
    let intervalId: NodeJS.Timeout | null = null;
    let hasInitialLoad = false; // Track if we've done initial load

    const fetchIPAssets = async () => {
      // Don't fetch if component is unmounted
      if (!isMounted) return;

      try {
        // Only show loading on initial load, not on refreshes
        if (!hasInitialLoad) {
          setLoading(true);
        }
        setError(null);
        
        const api = await getSoftlawApi();
        await api.isReady;

        // Query all NFTs from the ipPallet
        const rawNfts = await api.query.ipPallet.nfts.entries();
        
        console.log("Raw NFTs from chain:", rawNfts.length, "entries");
        
        // Only update state if component is still mounted
        if (!isMounted) return;

        if (rawNfts.length === 0) {
          console.log("No NFTs found in storage");
          // Only clear if this is initial load, otherwise keep existing data
          if (!hasInitialLoad) {
            setIpAssets([]);
          }
          setLoading(false);
          hasInitialLoad = true;
          return;
        }

        // Parse the results
        const parsedAssets: IPAsset[] = rawNfts.map(([key, value]) => {
          const nftId = key.args[0].toString();
          
          // Get the raw value and convert to JSON
          const nftData = value.toJSON() as any;
          
          // Try different possible field names
          // Note: The Rust struct uses snake_case (filing_date, jurisdiction)
          // but JSON might convert to camelCase (filingDate)
          const owner = nftData.owner || nftData.Owner || '';
          const name = bytesToString(nftData.name || nftData.Name || []);
          const description = bytesToString(nftData.description || nftData.Description || []);
          
          // Check both snake_case and camelCase variants
          const filingDateRaw = 
            nftData.filing_date || 
            nftData.filingDate || 
            nftData.FilingDate ||
            nftData['filing_date'] ||
            [];
          const filingDate = bytesToString(filingDateRaw);
          
          const jurisdictionRaw = 
            nftData.jurisdiction || 
            nftData.Jurisdiction ||
            nftData['jurisdiction'] ||
            [];
          const jurisdiction = bytesToString(jurisdictionRaw);

          return {
            id: nftId,
            owner: owner,
            name: name,
            description: description,
            filingDate: filingDate,
            jurisdiction: jurisdiction,
          };
        });

        // Optionally filter by current user's account
        let filteredAssets = parsedAssets;
        if (selectedAccount?.address) {
          filteredAssets = parsedAssets.filter(
            (asset) => asset.owner === selectedAccount.address
          );
          console.log(`Filtered to ${filteredAssets.length} assets for account ${selectedAccount.address}`);
        }

        // Fetch metadata URLs and images for all assets
        if (isMounted && filteredAssets.length > 0) {
          // Get all metadata URLs at once
          const nftIds = filteredAssets.map(asset => asset.id);
          let metadataUrls = getNFTMetadataUrls(nftIds);
          
          // Check if there's a pending metadata URL that we can associate with an NFT
          const pendingMetadataUrl = getAndClearPendingMetadata();
          if (pendingMetadataUrl && nftIds.length > 0) {
            // Try to associate pending metadata with the most recent NFT that doesn't have metadata
            const nftWithoutMetadata = nftIds.find(id => !metadataUrls[id]);
            if (nftWithoutMetadata) {
              console.log(`Associating pending metadata with NFT ${nftWithoutMetadata}`);
              storeNFTMetadata(nftWithoutMetadata, pendingMetadataUrl);
              metadataUrls[nftWithoutMetadata] = pendingMetadataUrl;
            } else {
              // Keep it as pending if all NFTs already have metadata
              storePendingMetadata(pendingMetadataUrl, selectedAccount?.address);
            }
          }
          
          console.log(`Found ${Object.keys(metadataUrls).length} metadata URLs for ${nftIds.length} NFTs:`, metadataUrls);
          
          // Fetch images for each asset
          const assetsWithImages = await Promise.all(
            filteredAssets.map(async (asset) => {
              const metadataUrl = metadataUrls[asset.id];
              if (!metadataUrl) {
                console.log(`No metadata URL found for NFT ${asset.id} in localStorage`);
                return asset; // Return asset without image if no metadata URL
              }

              try {
                setImageLoading(prev => ({ ...prev, [asset.id]: true }));
                console.log(`Fetching metadata for NFT ${asset.id} from:`, metadataUrl);
                const metadata = await fetchNFTMetadata(metadataUrl);
                console.log(`Metadata for NFT ${asset.id}:`, metadata);
                
                // Handle different metadata structures
                let imageUrl: string | undefined;
                let allImageUrls: string[] = [];
                
                if (metadata) {
                  // Try different possible field names and structures
                  if (metadata.image) {
                    if (Array.isArray(metadata.image) && metadata.image.length > 0) {
                      imageUrl = metadata.image[0];
                      allImageUrls = metadata.image;
                    } else if (typeof metadata.image === 'string' && metadata.image.length > 0) {
                      imageUrl = metadata.image;
                      allImageUrls = [metadata.image];
                    }
                  } else if ((metadata as any).imageUrls && Array.isArray((metadata as any).imageUrls) && (metadata as any).imageUrls.length > 0) {
                    // Handle case where images are stored as imageUrls
                    imageUrl = (metadata as any).imageUrls[0];
                    allImageUrls = (metadata as any).imageUrls;
                  } else if ((metadata as any).images && Array.isArray((metadata as any).images) && (metadata as any).images.length > 0) {
                    // Handle case where images are stored as images
                    imageUrl = (metadata as any).images[0];
                    allImageUrls = (metadata as any).images;
                  }
                }
                
                if (imageUrl) {
                  // Convert IPFS URLs to gateway URLs (handles ipfs://, /ipfs/ paths, etc.)
                  const normalizedImageUrl = getIPFSGatewayURL(imageUrl);
                  const normalizedAllImages = allImageUrls.map(url => getIPFSGatewayURL(url));
                  
                  console.log(`Found image URL for NFT ${asset.id}:`, imageUrl, '→ normalized:', normalizedImageUrl);
                  return {
                    ...asset,
                    imageUrl: normalizedImageUrl,
                    images: normalizedAllImages,
                  };
                } else {
                  console.warn(`No image found in metadata for NFT ${asset.id}`);
                }
              } catch (err) {
                console.error(`Error fetching image for NFT ${asset.id}:`, err);
              } finally {
                setImageLoading(prev => ({ ...prev, [asset.id]: false }));
              }
              
              return asset;
            })
          );

          setIpAssets(assetsWithImages);
          console.log("Final IP assets to display:", assetsWithImages.length, "assets");
          hasInitialLoad = true;
        } else if (isMounted) {
          setIpAssets(filteredAssets);
          hasInitialLoad = true;
        }
      } catch (err) {
        console.error("Error fetching IP assets:", err);
        // Don't clear existing assets on error - keep showing what we have
        // Only set error if we don't have any assets yet
        if (!hasInitialLoad) {
          setError(err instanceof Error ? err.message : "Failed to fetch IP assets");
        } else {
          // Log error but don't show it to user if we have cached data
          console.warn("Error refreshing IP assets, keeping existing data:", err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          hasInitialLoad = true;
        }
      }
    };

    // Initial fetch
    fetchIPAssets();

    // Set up interval for refreshing (only if component is mounted)
    intervalId = setInterval(() => {
      if (isMounted) {
        fetchIPAssets();
      }
    }, 15000); // Refresh every 15 seconds (increased from 10 to reduce load)

    // Cleanup function
    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [selectedAccount?.address]); // Only re-run when account changes

  const formatAddress = (address: string): string => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  return (
    <>
      <div className="bg-[#1C1A11] flex flex-col w-full justify-center items-start text-white min-[2000px]:w-[3000px] pb-[120px]">
        <div className="flex flex-col self-stretch min-[2000px]:min-h-screen py-[40px] justify-center items-start ml-[25px]">
          <div className="pb-[8px]">
            <TypesComponent className="min-[2000px]:text-3xl " text="All IPs" />
          </div>
          <div className="border h-[1px] w-[1000px] border-[#8A8A8A]" />
          
          {/* my products section */}
          <div className="flex mr-10 w-full">
            <div className="pt-[40px] flex items-start content-start gap-[60px] self-stretch flex-wrap">
              <Link
                className="flex items-center h-[403px] min-w-[320px] px-[16px] py-[8px] flex-col justify-center gap-[10px] rounded-[16px] bg-[#27251C] hover:bg-[#3a3828] transition-colors"
                href={"/innovation"}
              >
                <Image
                  width={40}
                  height={40}
                  src={"/images/PlusSign.svg"}
                  alt="upload icon"
                  className="min-[2000px]:w-[60px] min-[2000px]:h-[60px]"
                />
                <h1 className="text-[#EFF4F6] min-[2000px]:text-2xl text-[20px] font-[400] leading-[145%] tracking-[0.4px]">
                  Upload <span className="block">New IP</span>
                </h1>
              </Link>

              {/* Loading state */}
              {loading && (
                <div className="flex items-center justify-center h-[403px] min-w-[320px] px-[16px] py-[8px]">
                  <p className="text-[#EFF4F6]">Loading IP assets...</p>
                </div>
              )}

              {/* Error state */}
              {error && (
                <div className="flex items-center justify-center h-[403px] min-w-[320px] px-[16px] py-[8px] bg-red-900/20 rounded-[16px] border border-red-500">
                  <p className="text-red-400">Error: {error}</p>
                </div>
              )}

              {/* IP Assets List */}
              {!loading && !error && ipAssets.length > 0 && (
                <>
                  <div className="border m-10 h-[1px] w-full border-[#8A8A8A]" />
                  <div className="pt-[40px] flex items-start content-start gap-[60px] self-stretch flex-wrap w-full">
                    {ipAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className="flex flex-col h-auto min-w-[320px] px-[16px] py-[16px] gap-[16px] rounded-[16px] bg-[#27251C] border border-[#373737] hover:border-yellow-500 transition-colors"
                      >
                        {/* Image */}
                        {asset.imageUrl ? (
                          <div className="w-full h-[200px] rounded-[12px] overflow-hidden bg-[#1C1A11] flex items-center justify-center border border-[#373737]">
                            {imageLoading[asset.id] ? (
                              <div className="text-[#8A8A8A] text-sm animate-pulse">Loading image...</div>
                            ) : (
                              <Image
                                src={asset.imageUrl}
                                alt={asset.name || `IP Asset ${asset.id}`}
                                width={320}
                                height={200}
                                className="w-full h-full object-cover"
                                unoptimized={true}
                                onError={(e) => {
                                  console.error(`Failed to load image for NFT ${asset.id}:`, asset.imageUrl);
                                  // Show error message on error
                                  const target = e.currentTarget;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = '<div class="text-[#8A8A8A] text-sm">Image failed to load</div>';
                                  }
                                }}
                              />
                            )}
                          </div>
                        ) : (
                          <div className="w-full h-[50px] rounded-[12px] bg-[#1C1A11] flex items-center justify-center border border-[#373737]">
                            <span className="text-[#8A8A8A] text-sm">No image metadata available</span>
                          </div>
                        )}

                        {/* NFT ID */}
                        <div className="flex justify-between items-center">
                          <span className="text-[#8A8A8A] text-sm">IP ID:</span>
                          <span className="text-[#EFF4F6] font-semibold">#{asset.id}</span>
                        </div>

                        {/* Name */}
                        <div className="flex flex-col gap-[4px]">
                          <span className="text-[#8A8A8A] text-sm">Name:</span>
                          <h3 className="text-[#EFF4F6] text-lg font-semibold">
                            {asset.name || <span className="text-[#8A8A8A] italic">Not available</span>}
                          </h3>
                        </div>

                        {/* Description */}
                        <div className="flex flex-col gap-[4px]">
                          <span className="text-[#8A8A8A] text-sm">Description:</span>
                          <p className="text-[#EFF4F6] text-sm line-clamp-3">
                            {asset.description || <span className="text-[#8A8A8A] italic">Not available</span>}
                          </p>
                        </div>

                        {/* Filing Date */}
                        <div className="flex justify-between items-center">
                          <span className="text-[#8A8A8A] text-sm">Filing Date:</span>
                          <span className="text-[#EFF4F6] text-sm">
                            {asset.filingDate || <span className="text-[#8A8A8A] italic">Not available</span>}
                          </span>
                        </div>

                        {/* Jurisdiction */}
                        <div className="flex justify-between items-center">
                          <span className="text-[#8A8A8A] text-sm">Jurisdiction:</span>
                          <span className="text-[#EFF4F6] text-sm">
                            {asset.jurisdiction || <span className="text-[#8A8A8A] italic">Not available</span>}
                          </span>
                        </div>

                        {/* Owner */}
                        <div className="flex justify-between items-center pt-[8px] border-t border-[#373737]">
                          <span className="text-[#8A8A8A] text-sm">Owner:</span>
                          <span className="text-[#EFF4F6] text-xs font-mono">{formatAddress(asset.owner)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Empty state */}
              {!loading && !error && ipAssets.length === 0 && (
                <>
                  <div className="border m-10 h-[1px] w-full border-[#8A8A8A]" />
                  <div className="pt-[40px] flex items-center justify-center min-w-[320px] px-[16px] py-[16px]">
                    <p className="text-[#8A8A8A] text-lg">
                      {selectedAccount 
                        ? "No IP assets found for your account. Mint your first IP asset!"
                        : "Connect your wallet to view your IP assets, or mint a new one."}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer className="w-full" />
    </>
  );
}
