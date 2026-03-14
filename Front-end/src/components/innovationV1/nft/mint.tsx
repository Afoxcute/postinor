"use client";
import { useToast } from "@/hooks/use-toast";
import { useInnovationContext } from "@/context/innovation";
import { useAccountsContext } from "@/context/account";
import { web3Enable, web3FromAddress } from "@polkadot/extension-dapp";
import { getSoftlawApi } from "@/utils/softlaw/getApi";
import { storeNFTMetadata, getAndClearPendingMetadata, storePendingMetadata } from "@/utils/nftMetadataStorage";

interface MintResult {
  collectionId: string;
  creator: string;
  owner: string;
  blockHash: string;
}

export default function MintNftButton() {
  const { nftMetadata, setLoading, loading, nftMetadataUrl } = useInnovationContext();

  const { selectedAccount } = useAccountsContext();
  const { toast } = useToast();

  const mintNFT = async () => {
    let api = await getSoftlawApi();
    await web3Enable("softlaw");

    if (!selectedAccount?.address) {
      throw new Error("No selected account");
    }

    const addr = selectedAccount.address;
    const injector = await web3FromAddress(addr);
    api.setSigner(injector.signer as any);

    // Validate and prepare the values
    const name = String(nftMetadata.name || '').trim();
    const description = String(nftMetadata.description || '').trim();
    // Map useDate to filing_date and registryNumber to jurisdiction
    const filingDate = String(nftMetadata.useDate || '').trim();
    const jurisdiction = String(nftMetadata.registryNumber || '').trim();

    // Validate all required fields
    if (!name) {
      throw new Error("Name is required");
    }
    if (!description) {
      throw new Error("Description is required");
    }
    if (!filingDate) {
      throw new Error("First Date Use (Filing Date) is required");
    }
    if (!jurisdiction) {
      throw new Error("Registration Number (Jurisdiction) is required");
    }

    // Log the values being sent for debugging
    console.log("Minting NFT with values:", {
      name,
      description,
      filingDate,
      jurisdiction,
    });

    try {
      const txHash = await api.tx.ipPallet
        .mintNft(
          name,
          description,
          filingDate,
          jurisdiction
        )
        .signAndSend(addr, { signer: injector.signer }, async ({ status, events }) => {
          if (status.isInBlock || status.isFinalized) {
            console.log(
              `Transaction included at blockHash ${status.asInBlock}`
            );
            
            // Extract NFT ID from events and store metadata URL
            let nftId = null;
            console.log('Transaction events:', events);
            events.forEach(({ event }: any) => {
              console.log('Event:', event.section, event.method, event.data);
              if (event.section === 'ipPallet' && event.method === 'NftMinted') {
                nftId = event.data[0].toString();
                console.log(`Found NftMinted event with NFT ID: ${nftId}`);
              }
            });

            // If we didn't get NFT ID from events, query the chain to find the latest NFT
            if (!nftId) {
              console.log('NFT ID not found in events, querying chain...');
              try {
                const allNfts = await api.query.ipPallet.nfts.entries();
                // Find the most recent NFT owned by this address
                let latestNft: any = null;
                let latestId = -1;
                
                allNfts.forEach(([key, value]) => {
                  const id = parseInt(key.args[0].toString());
                  const nftData = value.toJSON() as any;
                  if (nftData.owner === addr && id > latestId) {
                    latestId = id;
                    latestNft = { id: id.toString(), data: nftData };
                  }
                });
                
                if (latestNft) {
                  nftId = latestNft.id;
                  console.log(`Found latest NFT ID from chain query: ${nftId}`);
                }
              } catch (err) {
                console.error('Error querying chain for NFT ID:', err);
              }
            }

            // Get metadata URL from context or pending storage
            const metadataUrlToStore = nftMetadataUrl || getAndClearPendingMetadata();
            
            // Store metadata URL if available
            if (nftId && metadataUrlToStore) {
              console.log(`Storing metadata URL for NFT ${nftId}:`, metadataUrlToStore);
              storeNFTMetadata(nftId, metadataUrlToStore);
              console.log(`Successfully stored metadata URL for NFT ${nftId}`);
            } else {
              console.warn(`Cannot store metadata: nftId=${nftId}, metadataUrl=${metadataUrlToStore}`);
              // If we have metadata URL but no NFT ID, keep it as pending
              if (metadataUrlToStore && !nftId) {
                storePendingMetadata(metadataUrlToStore, addr);
                console.log('Kept metadata URL as pending for later association');
              }
            }
          }
        });

      console.log(`Transaction hash: ${txHash}`);
    } catch (error) {
      console.error("Transaction failed", error);
      throw new Error("Failed to mint NFT");
    }
  };

  const handleMint = async () => {
    try {
      setLoading(true);
      const result = await mintNFT();
      toast({
        title: "Success",
        description: `NFT minted with ID: ${result}`,
        variant: "default",
      });
    } catch (error) {
      console.error("Mint error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to mint NFT",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
        className="bg-[#D0DFE4] min-[2000px]:py-[16px] min-[2000px]:tracking-[1px] min-[2000px]:text-3xl w-[128px] min-[2000px]:w-[200px] items-center text-center rounded-[16px] text-[#1C1A11] px-[22px] py-[8px] flex-shrink-0 hover:bg-[#FACC15]"
      onClick={handleMint}
      disabled={loading}
    >
      {loading ? "Minting..." : "Mint NFT"}
    </button>
  );
}
