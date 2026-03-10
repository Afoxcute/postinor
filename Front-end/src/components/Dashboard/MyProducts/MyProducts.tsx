"use client";
import React, { useEffect, useState, useContext } from "react";
import MaxWidthWrapper from "@/components/MaxWidhWrapper";
// import { FormDataContext } from "../../ProofOfInnovation/FormDataContext";
// import { useDashboardTapContext } from "@/context/dashboard";
import Footer from "../../Footer";
import Image from "next/image";
import Link from "next/link";
import { FormDataContext } from "@/components/FormDataContext";
import { useDashboardContext } from "@/context/dashboard";
import TypesComponent from "@/components/TypesProps";
import { useInnovationContext } from "@/context/innovation";
import { useAccountsContext } from "@/context/account";
import { getSoftlawApi } from "@/utils/softlaw/getApi";

interface MyProductsProps {
  onDataChange: (data: any) => void;
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

interface ChainNft {
  id: string;
  owner: string;
  name: string;
  description: string;
  filingDate: string;
  jurisdiction: string;
}

export default function MyProducts({ onDataChange }: MyProductsProps) {
  const { selectedTabDashboard, setSelectedTabDashboard } =
    useDashboardContext();

  const { chain, setChain, nftMetadataUrl } = useInnovationContext();

  const { formData, updateFormData } = useContext(FormDataContext);

  const [nftData, setNftData] = useState<NFTMetadata>();
  const { selectedAccount } = useAccountsContext();
  const [chainNfts, setChainNfts] = useState<ChainNft[]>([]);
  const [loadingChainNfts, setLoadingChainNfts] = useState(false);
  const [chainNftsError, setChainNftsError] = useState<string | null>(null);

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

  // Load on-chain IP NFTs owned by the connected account
  useEffect(() => {
    const loadChainNfts = async () => {
      if (!selectedAccount?.address) {
        setChainNfts([]);
        return;
      }

      setLoadingChainNfts(true);
      setChainNftsError(null);

      try {
        const api = await getSoftlawApi();

        // Fetch all NFTs from ip_pallet storage
        const entries = await (api.query as any).ipPallet.nfts.entries();

        const ownedNfts: ChainNft[] = entries
          .map(([key, value]: any): ChainNft | null => {
            try {
              const id = key.args[0].toString();
              const human = value.toHuman() as any;

              const owner = (human?.owner as string) || "";

              if (owner !== selectedAccount.address) {
                return null;
              }

              const name =
                (human?.name as string) ||
                (Array.isArray(human?.name) ? human.name.join("") : "");
              const description =
                (human?.description as string) ||
                (Array.isArray(human?.description)
                  ? human.description.join("")
                  : "");
              const filingDate =
                (human?.filing_date as string) ||
                (human?.filingDate as string) ||
                "";
              const jurisdiction =
                (human?.jurisdiction as string) ||
                (Array.isArray(human?.jurisdiction)
                  ? human.jurisdiction.join("")
                  : "");

              return {
                id,
                owner,
                name,
                description,
                filingDate,
                jurisdiction,
              } as ChainNft;
            } catch (e) {
              console.error("Error parsing NFT entry:", e);
              return null;
            }
          })
          .filter((nft: ChainNft | null): nft is ChainNft => nft !== null);

        setChainNfts(ownedNfts);
      } catch (error) {
        console.error("Error loading on-chain IP NFTs:", error);
        setChainNftsError(
          error instanceof Error
            ? error.message
            : "Failed to load on-chain IP assets"
        );
      } finally {
        setLoadingChainNfts(false);
      }
    };

    loadChainNfts();
  }, [selectedAccount]);

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
            <div className="pt-[40px] flex  items-start content-start gap-[60px] self-stretch flex-wrap ">
              <Link
                className="flex items-center h-[403px] min-w-[320px] px-[16px] py-[8px] flex-col justify-center gap-[10px] rounded-[16px] bg-[#27251C]"
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
            </div>

            {nftMetadataUrl && (
              <div className="border m-10 h-[1px] h-[450px] border-[#8A8A8A]" />
            )}

            {nftMetadataUrl && (
              <div className="pt-[40px] flex  items-start content-start gap-[60px] self-stretch flex-wrap ">
                <div className="flex items-center h-[403px] min-w-[320px] px-[16px] py-[8px] flex-col justify-center gap-[10px] rounded-[16px] bg-[#27251C]">
                  <img
                    src={"/images/solarPanel.png"}
                    width={400}
                    height={400}
                    alt="Last minted IP"
                  />
                  <p>Name: Last minted IP (current session)</p>
                  <p>Proof Of Innovation</p>
                </div>
              </div>
            )}
          </div>

          {/* On-chain IP NFTs section */}
          <div className="mt-10 w-full mr-10">
            <TypesComponent
              className="min-[2000px]:text-2xl "
              text="On-chain IP Assets (Softlaw Chain)"
            />
            <div className="border h-[1px] w-[1000px] border-[#8A8A8A] mt-2" />

            {loadingChainNfts && (
              <p className="mt-4 text-sm text-gray-400">
                Loading your on-chain IP assets...
              </p>
            )}

            {chainNftsError && (
              <p className="mt-4 text-sm text-red-400">{chainNftsError}</p>
            )}

            {!loadingChainNfts &&
              !chainNftsError &&
              chainNfts.length === 0 && (
                <p className="mt-4 text-sm text-gray-400">
                  No on-chain IP assets found for your connected account yet.
                </p>
              )}

            {chainNfts.length > 0 && (
              <div className="pt-[24px] flex flex-wrap gap-[24px]">
                {chainNfts.map((nft) => (
                  <div
                    key={nft.id}
                    className="flex flex-col justify-between h-[260px] w-[320px] px-[16px] py-[16px] rounded-[16px] bg-[#27251C] border border-[#373737]"
                  >
                    <div>
                      <p className="text-xs text-gray-400 mb-1">
                        ID: {nft.id}
                      </p>
                      <h2 className="text-lg font-semibold mb-2">
                        {nft.name || "Untitled IP"}
                      </h2>
                      <p className="text-sm text-gray-300 line-clamp-3 mb-2">
                        {nft.description || "No description"}
                      </p>
                    </div>
                    <div className="mt-2 text-xs text-gray-400 space-y-1">
                      <p>
                        <span className="font-semibold">Filing date:</span>{" "}
                        {nft.filingDate || "N/A"}
                      </p>
                      <p>
                        <span className="font-semibold">Jurisdiction:</span>{" "}
                        {nft.jurisdiction || "N/A"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer className="w-full" />
    </>
  );
}
