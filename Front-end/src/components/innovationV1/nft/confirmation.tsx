"use client";
import React, { useEffect, useState } from "react";
import ReusableHeading from "../../textComponent";
import TypesComponent from "../../TypesProps";
import MintNftUnique from "./mintUnique";
import { useInnovationContext } from "@/context/innovation";
import { ChainSelector } from "./chainSelector";
import { useAccountsContext } from "@/context/account";
import { getSoftlawApi } from "@/utils/softlaw/getApi";
import { web3Enable, web3FromAddress } from "@polkadot/extension-dapp";
import { useToast } from "@/hooks/use-toast";
import { storeNFTMetadata, getAndClearPendingMetadata, storePendingMetadata } from "@/utils/nftMetadataStorage";
import { getIPFSGatewayURL } from "@/utils/ipfs";
// import Footer from "../Footer";

interface ConfirmationModalProps {
  onClose: () => void; // Function to close the modal
  onEditPage: (page: number) => void; // Function to allow editing specific page
}

interface NFTMetadata {
  name: string;
  technicalName: string;
  description: string;
  type: string;
  useDate: string;
  registryNumber: string;
  collectionId: number;
  image: string[];
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  onClose,
  onEditPage,
}) => {
  const { chain, setChain, nftMetadataUrl, nftMetadata } = useInnovationContext();

  const { toast } = useToast();

  const { selectedAccount } = useAccountsContext();
  // Handle both close and edit in one function
  const handleEditPage = (page: number) => {
    const tabKeys = ["collections", "nfts", "contracts"];
    // setActiveTab(tabKeys[page - 1]);
    onEditPage(page); // Open the page to edit
    onClose(); // Close the modal
  };

  const [nftData, setNftData] = useState<NFTMetadata>();

  async function fetchNFTData(url: string | null): Promise<NFTMetadata | null> {
    if (!url) {
      console.error("No URL provided");
      return null;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching NFT data:", error);
      throw error;
    }
  }

  // En el useEffect
  useEffect(() => {
    const loadNFTData = async () => {
      try {
        const data = await fetchNFTData(nftMetadataUrl);
        if (data) {
          setNftData(data);
        }
      } catch (error) {
        console.error("Error loading NFT data:", error);
      }
    };

    loadNFTData();
  }, [nftMetadataUrl]); // Agregar

  const [nftV1, setNftV1] = useState<object>({
    name: 0,
    description: 0,
    fillingDate: 0,
    jurisdiction: 0,
  });

  const mintNFT = async () => {
    // validateMetadata();

    let api = await getSoftlawApi();
    await web3Enable("softlaw");

    if (!selectedAccount?.address) {
      throw new Error("No selected account");
    }

    const addr = selectedAccount.address;
    const injector = await web3FromAddress(addr);
    api.setSigner(injector.signer as any);

    // Validate and prepare the actual values (not placeholder strings!)
    const name = String(nftMetadata.name || '').trim();
    const description = String(nftMetadata.description || '').trim();
    const filingDate = String(nftMetadata.useDate || '').trim();
    const jurisdiction = String(nftMetadata.registryNumber || '').trim();

    // Validate all required fields
    if (!name) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }
    if (!description) {
      toast({
        title: "Error",
        description: "Description is required",
        variant: "destructive",
      });
      return;
    }
    if (!filingDate) {
      toast({
        title: "Error",
        description: "First Date Use is required",
        variant: "destructive",
      });
      return;
    }
    if (!jurisdiction) {
      toast({
        title: "Error",
        description: "Registration Number is required",
        variant: "destructive",
      });
      return;
    }

    // Log the values being sent for debugging
    console.log("Minting NFT with actual values:", {
      name,
      description,
      filingDate,
      jurisdiction,
    });

    try {
      const tx = api.tx.ipPallet
        .mintNft(
          name,              // Actual value, not "nftMetadata.name"
          description,       // Actual value, not "nftMetadata.description"
          filingDate,        // Actual value, not "nftMetadata.useDate"
          jurisdiction       // Actual value, not "nftMetadata.registryNumber"
        );
      
      // Get transaction hash before sending
      const txHash = tx.hash.toHex();
      
      await tx.signAndSend(addr, { signer: injector.signer }, async ({ status, events, dispatchError }: any) => {
          if (dispatchError) {
            console.error("Transaction error:", dispatchError);
            toast({
              title: "Transaction Failed",
              description: dispatchError.toString(),
              variant: "destructive",
            });
            return;
          }

          if (status.isInBlock || status.isFinalized) {
            // Extract block hash and block number
            const blockHash = status.isInBlock ? status.asInBlock.toString() : status.asFinalized.toString();
            
            // Get block number from block hash
            let blockNumber: bigint | null = null;
            try {
              const block = await api.rpc.chain.getBlock(blockHash);
              blockNumber = block.block.header.number.toBigInt();
            } catch (err) {
              console.error('Error getting block number:', err);
              // Fallback: try to get from header
              try {
                const header = await api.rpc.chain.getHeader(blockHash);
                blockNumber = header.number.toBigInt();
              } catch (headerErr) {
                console.error('Error getting block number from header:', headerErr);
              }
            }
            
            console.log('Transaction details:', {
              txHash,
              blockHash,
              blockNumber: blockNumber?.toString() || 'unknown'
            });

            // Extract NFT ID from events
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

            // Register NFT with Yakoa for infringement detection
            if (nftId && blockNumber) {
              try {
                // Convert filingDate to hex format
                // The filingDate is a string, convert it to hex bytes
                const filingDateHex = `0x${Buffer.from(filingDate, 'utf8').toString('hex')}`;
                
                console.log('Registering NFT with Yakoa:', {
                  nftId,
                  filingDateHex,
                  txHash,
                  blockNumber: blockNumber.toString()
                });

                // Get backend API URL from environment or use default
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
                
                const response = await fetch(`${backendUrl}/api/substrate-nft/register`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    nftId,
                    filingDate: filingDateHex,
                    transactionHash: txHash,
                    blockNumber: blockNumber.toString(),
                    owner: addr,
                    name,
                    description,
                    jurisdiction,
                    metadataUrl: metadataUrlToStore || undefined,
                  }),
                });

                if (!response.ok) {
                  const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                  console.error('Failed to register NFT with Yakoa:', errorData);
                  toast({
                    title: "NFT Minted",
                    description: `NFT ${nftId} created successfully, but Yakoa registration failed: ${errorData.error || 'Unknown error'}`,
                    variant: "default",
                    className: "bg-yellow-500 text-black border border-gray-200",
                  });
                } else {
                  const yakoaResponse = await response.json();
                  console.log('Successfully registered NFT with Yakoa:', yakoaResponse);
                  toast({
                    title: "Proof of Innovation Created",
                    description: `Successfully created proof of innovation ID ${nftId} and registered with Yakoa for infringement detection`,
                    variant: "default",
                    className: "bg-white text-black border border-gray-200",
                  });
                }
              } catch (yakoaError) {
                console.error('Error registering NFT with Yakoa:', yakoaError);
                // Don't fail the entire mint if Yakoa registration fails
                toast({
                  title: "Proof of Innovation Created",
                  description: nftId 
                    ? `Successfully created proof of innovation ID ${nftId} (Yakoa registration failed)`
                    : `Successfully created proof of innovation from Substrate Address: ${addr}`,
                  variant: "default",
                  className: "bg-white text-black border border-gray-200",
                });
              }
            } else {
              toast({
                title: "Proof of Innovation Created",
                description: nftId 
                  ? `Successfully created proof of innovation ID ${nftId}`
                  : `Successfully created proof of innovation from Substrate Address: ${addr}`,
                variant: "default",
                className: "bg-white text-black border border-gray-200",
              });
            }
          }
        });
    } catch (e) {
      console.error("Minting error:", e);
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to mint NFT",
        variant: "destructive",
      });
    }
  };
  return (
    <>
      <div className="flex flex-col inset-0 fixed items-center justify-center bg-black bg-opacity-50 z-50 w-full md:max-w-5xl mx-auto max-h-[100vh] ">
        <div className=" bg-[#1C1A11] rounded-md justify-center items-center w-full relative z-50 pt-[120px] px-[100px] overflow-y-auto gap-[60px] scrollable">
          <div className="flex flex-col gap-[60px] items-start w-full">
            <div className="w-full flex flex-col items-center gap-[60px]">
              <div className="flex flex-col items-start gap-[60px] w-full">
                <div>
                  <ReusableHeading text="Confirmation " />
                  <TypesComponent
                    text="Please confirm your details before submitting"
                    className="text-[#8A8A8A]"
                  />
                </div>
                <div className="flex items-start gap-[60px] self-stretch w-full">
                  {/* Left hand starts */}
                  <div className="flex flex-col items-start gap-[60px] w-full">
                    {/* page 1 starts */}
                    <div className="flex w-full items-start self-stretch justify-start gap-[60px]">
                      {/* page 1 starts */}
                      <div className="flex flex-col w-full items-start gap-[60px] self-stretch">
                        <div className="flex flex-col gap-[8px]">
                          <TypesComponent
                            className="font-bold"
                            text="Types of Intellectual Property"
                          />

                          <TypesComponent
                            className="text-[#8A8A8A]"
                            text={`
                          ${nftData?.type || "N/A"}`}
                          />
                        </div>

                        <div className="flex flex-col gap-[8px]">
                          <TypesComponent
                            className="font-bold"
                            text="Reference Number"
                          />

                          {/* <TypesComponent
                              className="text-[#8A8A8A]"
                              text={`
                      ${formData.IpRegistries.ReferenceNumber || "N/A"}`}
                            /> */}

                          {/* <p>
                      Reference Number:{" "}
                      {formData.IpRegistries?.ReferenceNumber || "N/A"}
                    </p> */}
                        </div>

                        <div className="flex flex-col gap-[8px]">
                          <TypesComponent
                            className="font-bold"
                            text="Reference Link"
                          />

                          <TypesComponent
                            className="text-[#8A8A8A]"
                            text={`
                        ${nftData?.registryNumber || "N/A"}
                        `}
                          />
                        </div>
                      </div>
                      {/* page 1 ends */}

                      <button
                        onClick={() => handleEditPage(1)}
                        className="text-[#F6E18B] w-full md:w-[30.02px]"
                      >
                        <img
                          src="/images/EditIcon.svg"
                          className="shrink-0"
                          loading="lazy"
                          alt="Edit"
                        />
                      </button>
                    </div>
                    {/* page 1 starts */}

                    <div className="w-[270px] h-[1px] flex bg-[#8A8A8A]"></div>

                    {/* page 2 starts */}
                    <div className="flex w-full items-start self-stretch justify-start gap-[60px]">
                      <div className="flex flex-col items-start gap-[60px] self-stretch">
                        {/* Types of patent start */}
                        <div className="flex flex-col gap-[8px]">
                          <TypesComponent
                            className="font-bold"
                            text="Types of Patent"
                          />
                          <TypesComponent
                            className="text-[#8A8A8A]"
                            text={`${nftData?.name || "N/A"}`}
                          />
                        </div>
                        {/* Types of patent start */}

                        {/* Patent Title start*/}
                        <div className="flex flex-col gap-[8px]">
                          <TypesComponent
                            className="font-bold"
                            text="Patent Title"
                          />
                          <TypesComponent
                            className="text-[#8A8A8A]"
                            text={`${nftData?.name || "N/A"}`}
                          />
                        </div>
                        {/* Patent Title ends */}

                        {/* Patent Number and Filling date starts */}
                        <div className="flex items-center justify-center w-full gap-[60px] self-stretch">
                          {/* patent number */}
                          <div className="flex flex-col items-start w-full gap-[8px]">
                            <TypesComponent
                              className="font-bold"
                              text="Patent Number"
                            />
                            <TypesComponent
                              className="text-[#8A8A8A]"
                              text={`${nftData?.registryNumber || "N/A"}`}
                            />
                          </div>
                          {/* patent number ends */}

                          {/* filling date starts */}
                          <div className="flex flex-col items-start w-full gap-[8px]">
                            <TypesComponent
                              className="font-bold "
                              text="Filling Date"
                            />
                            <TypesComponent
                              className="text-[#8A8A8A]"
                              text={`${nftData?.useDate || "N/A"}`}
                            />
                          </div>
                          {/* Filling Date ends */}
                        </div>

                        {/* Patent Number and Filling date ends*/}
                      </div>

                      <button
                        onClick={() => handleEditPage(2)}
                        className="text-[#F6E18B]"
                      >
                        <img
                          src="/images/EditIcon.svg"
                          className="shrink-0"
                          loading="lazy"
                          alt="Edit"
                        />
                      </button>
                    </div>
                    {/* page 2 ends */}
                  </div>
                  {/* Left hand ends */}

                  <div className="w-[1px] h-[700px] bg-[#8A8A8A]"></div>

                  {/* right hand starts */}
                  <div className="flex items-start gap-[60px] self-stretch w-full">
                    {/* page 3 starts */}
                    <div className="flex flex-col items-start gap-[60px] self-stretch">
                      <div className="flex flex-col gap-2">
                        <TypesComponent text="Thumbnail Image" />
                        <p>
                          Files Uploaded:{""}{" "}
                          {nftData?.image || "No file uploaded"}
                        </p>
                        <div>
                          {nftData?.image?.map((src, index) => {
                            const normalizedSrc = getIPFSGatewayURL(src);
                            return (
                              <img key={index} src={normalizedSrc} alt={`NFT ${index}`} />
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <TypesComponent text="NFT Name" className="font-bold" />
                        <TypesComponent
                          className="text-[#8A8A8A]"
                          text={`${nftData?.technicalName || "N/A"}`}
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <TypesComponent text="Types of Protection" />
                        <TypesComponent
                          className="text-[#8A8A8A]"
                          text={nftData?.type || "N/A"}
                        />
                      </div>

                      <div className="flex flex-col gap-[8px]">
                        <TypesComponent
                          className="font-bold"
                          text="Description"
                        />

                        <TypesComponent
                          className="text-[#8A8A8A]"
                          text={nftData?.description || "N/A"}
                        />
                      </div>
                    </div>

                    {/* page 3 ends */}
                    <button
                      onClick={() => handleEditPage(3)}
                      className="text-[#F6E18B]"
                    >
                      <img
                        src="/images/EditIcon.svg"
                        className="shrink-0"
                        alt="Edit"
                      />
                    </button>
                  </div>
                  {/* page 3, right hand side ends */}
                </div>
              </div>
            </div>

            <div className="flex mt-8 justify-between w-full ">
              <button
                className="bg-transparent w-[160px] rounded-[16px] px-[20px] py-[8px] flex-shrink-0 border border-[#D0DFE4] text-[#D0DFE4] hover:bg-[#FACC15]  hover:text-[#1C1A11] hover:border-none"
                onClick={onClose}
              >
                Back
              </button>

              <button
                className="bg-[#D0DFE4] min-[2000px]:py-[16px] min-[2000px]:tracking-[1px] min-[2000px]:text-3xl w-[128px] min-[2000px]:w-[200px] items-center text-center rounded-[16px] text-[#1C1A11] px-[22px] py-[8px] flex-shrink-0 hover:bg-[#FACC15]"
                onClick={mintNFT}
              >
                Mint I.P.
              </button>

              {/* <ChainSelector/> */}
              {/* {chain==="softlaw" && <button onClick={mintNFT}>MINT WITH SOFTLAW</button>}
              
              {chain ==="unique" && <MintNftUnique />} */}
            </div>
          </div>

          {/* <Footer width="w-full" className="mt-[120px]" /> */}
        </div>
      </div>
    </>
  );
};

export default ConfirmationModal;
