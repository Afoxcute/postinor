"use client";
import React, { useEffect, useState } from "react";
import MaxWidthWrapper from "@/components/MaxWidhWrapper";
import { useContext } from "react";
// import { FormDataContext } from "../../ProofOfInnovation/FormDataContext";
// import { useDashboardTapContext } from "@/context/dashboard";
import Footer from "../../Footer";
import Image from "next/image";
import Link from "next/link";
import { FormDataContext } from "@/components/FormDataContext";
import { useDashboardContext } from "@/context/dashboard";
import TypesComponent from "@/components/TypesProps";
import { useInnovationContext } from "@/context/innovation";

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

export default function MyProducts({ onDataChange }: MyProductsProps) {
  const { selectedTabDashboard, setSelectedTabDashboard } =
    useDashboardContext();

  const { chain, setChain, nftMetadataUrl } = useInnovationContext();

  const { formData, updateFormData } = useContext(FormDataContext);

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
                  />
                  <p>Name: Solar Panel</p>
                  <p>Proof Of Innovation</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer className="w-full" />
    </>
  );
}
