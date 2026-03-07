"use client";
import { useToast } from "@/hooks/use-toast";
import { useInnovationContext } from "@/context/innovation";
import { useAccountsContext } from "@/context/account";
import { web3Enable, web3FromAddress } from "@polkadot/extension-dapp";
import { getSoftlawApi } from "@/utils/softlaw/getApi";

interface MintResult {
  collectionId: string;
  creator: string;
  owner: string;
  blockHash: string;
}

export default function MintNftButton() {
  const { nftMetadata, setLoading, loading } = useInnovationContext();

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

    if (
      !nftMetadata.name ||
      !nftMetadata.description ||
      !nftMetadata.useDate ||
      !nftMetadata.registryNumber
    ) {
      throw new Error("Missing NFT metadata");
    }

    try {
      const txHash = await api.tx.ipPallet
        .mintNft(
          nftMetadata.name,
          nftMetadata.description,
          nftMetadata.useDate,
          nftMetadata.registryNumber
        )
        .signAndSend(addr, { signer: injector.signer }, (result) => {
          if (result.status.isInBlock || result.status.isFinalized) {
            console.log(
              `Transaction included at blockHash ${result.status.asInBlock}`
            );
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
