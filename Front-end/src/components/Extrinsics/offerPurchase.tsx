"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getSoftlawApi } from "@/utils/softlaw/getApi";
import { useAccountsContext } from "@/context/account";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import OfferPurchaseButton, { PaymentTerms, PaymentType } from "@/components/Dashboard/Manage/ActionButtons/purchase/offer";

interface IPAsset {
  id: string;
  owner: string;
  name: string;
  description: string;
  filingDate: string;
  jurisdiction: string;
  imageUrl?: string;
}

export default function OfferPurchasePage() {
  const [nfts, setNfts] = useState<IPAsset[]>([]);
  const [selectedNft, setSelectedNft] = useState<IPAsset | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>({
    type: PaymentType.OneTime,
    amount: 0,
  });
  const { selectedAccount } = useAccountsContext();

  // Helper function to convert BoundedVec<u8> to string
  const bytesToString = (bytes: any): string => {
    if (!bytes) return "";
    if (typeof bytes === "string") return bytes;
    if (Array.isArray(bytes)) {
      return new TextDecoder().decode(new Uint8Array(bytes));
    }
    return String(bytes);
  };

  // Fetch NFTs owned by user
  useEffect(() => {
    const fetchNFTs = async () => {
      try {
        setLoading(true);
        const api = await getSoftlawApi();
        await api.isReady;

        if (!selectedAccount?.address) {
          setNfts([]);
          return;
        }

        // Query all NFTs
        const rawNfts = await api.query.ipPallet.nfts.entries();

        // Parse the results
        const parsedAssets: IPAsset[] = rawNfts
          .map(([key, value]) => {
            const nftId = key.args[0].toString();
            const nftData = value.toJSON() as any;

            const owner = nftData.owner || nftData.Owner || "";
            const name = bytesToString(nftData.name || nftData.Name || []);
            const description = bytesToString(
              nftData.description || nftData.Description || []
            );
            const filingDate = bytesToString(
              nftData.filing_date ||
                nftData.filingDate ||
                nftData.FilingDate ||
                []
            );
            const jurisdiction = bytesToString(
              nftData.jurisdiction ||
                nftData.Jurisdiction ||
                nftData["jurisdiction"] ||
                []
            );

            return {
              id: nftId,
              owner: owner,
              name: name,
              description: description,
              filingDate: filingDate,
              jurisdiction: jurisdiction,
            };
          })
          .filter((asset) => asset.owner === selectedAccount.address);

        setNfts(parsedAssets);
      } catch (error) {
        console.error("Error fetching NFTs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNFTs();
  }, [selectedAccount?.address]);

  const handleNftClick = (nft: IPAsset) => {
    setSelectedNft(nft);
    setPaymentTerms({
      type: PaymentType.OneTime,
      amount: 0,
    });
    setIsModalOpen(true);
  };

  const handlePaymentTypeChange = (type: PaymentType) => {
    setPaymentTerms({
      ...paymentTerms,
      type,
      period: type === PaymentType.Periodic ? paymentTerms.period || 0 : undefined,
      totalPayments:
        type === PaymentType.Periodic ? paymentTerms.totalPayments || 0 : undefined,
    });
  };

  const formatAddress = (address: string): string => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-white">Offer Purchase</h1>
      <p className="text-gray-400 mb-4">
        Select an NFT you own to create a purchase offer
      </p>

      {!selectedAccount ? (
        <div className="text-white">Please connect your wallet</div>
      ) : loading ? (
        <div className="text-white">Loading your NFTs...</div>
      ) : nfts.length === 0 ? (
        <div className="text-white">You don't own any NFTs yet</div>
      ) : (
        <ScrollArea className="h-[800px]">
          <ul className="space-y-2">
            {nfts.map((nft) => (
              <li
                key={nft.id}
                className="bg-card hover:bg-slate-900 rounded-lg p-4 cursor-pointer"
                onClick={() => handleNftClick(nft)}
              >
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-white">
                          {nft.name || `NFT #${nft.id}`}
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                          NFT ID: {nft.id}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-indigo-500 text-white">
                        Owned
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-300">
                        <span className="font-semibold">Owner:</span>{" "}
                        {formatAddress(nft.owner)}
                      </p>
                      {nft.description && (
                        <p className="text-sm text-gray-300">
                          <span className="font-semibold">Description:</span>{" "}
                          {nft.description}
                        </p>
                      )}
                      {nft.jurisdiction && (
                        <p className="text-sm text-gray-300">
                          <span className="font-semibold">Jurisdiction:</span>{" "}
                          {nft.jurisdiction}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#1C1A11] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedNft && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Create Purchase Offer</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">NFT Details</h3>
                  <div className="bg-[#27251C] p-4 rounded-lg space-y-2">
                    <p>
                      <span className="font-semibold">NFT ID:</span>{" "}
                      {selectedNft.id}
                    </p>
                    <p>
                      <span className="font-semibold">Name:</span>{" "}
                      {selectedNft.name || "Unnamed"}
                    </p>
                    {selectedNft.description && (
                      <p>
                        <span className="font-semibold">Description:</span>{" "}
                        {selectedNft.description}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Payment Terms</h3>
                  <div className="bg-[#27251C] p-4 rounded-lg space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Payment Type
                      </label>
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => handlePaymentTypeChange(PaymentType.OneTime)}
                          className={`px-4 py-2 rounded-lg ${
                            paymentTerms.type === PaymentType.OneTime
                              ? "bg-blue-500 text-white"
                              : "bg-gray-600 text-gray-300"
                          }`}
                        >
                          One-Time Payment
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePaymentTypeChange(PaymentType.Periodic)}
                          className={`px-4 py-2 rounded-lg ${
                            paymentTerms.type === PaymentType.Periodic
                              ? "bg-blue-500 text-white"
                              : "bg-gray-600 text-gray-300"
                          }`}
                        >
                          Periodic Payment
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Amount per Payment
                      </label>
                      <Input
                        type="number"
                        value={paymentTerms.amount || ""}
                        onChange={(e) =>
                          setPaymentTerms({
                            ...paymentTerms,
                            amount: Number(e.target.value),
                          })
                        }
                        placeholder="Enter amount"
                        className="bg-[#1C1A11] text-white border-gray-600"
                      />
                    </div>

                    {paymentTerms.type === PaymentType.Periodic && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Period (blocks between payments)
                          </label>
                          <Input
                            type="number"
                            value={paymentTerms.period || ""}
                            onChange={(e) =>
                              setPaymentTerms({
                                ...paymentTerms,
                                period: Number(e.target.value),
                              })
                            }
                            placeholder="Enter period in blocks"
                            className="bg-[#1C1A11] text-white border-gray-600"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Total Number of Payments
                          </label>
                          <Input
                            type="number"
                            value={paymentTerms.totalPayments || ""}
                            onChange={(e) =>
                              setPaymentTerms({
                                ...paymentTerms,
                                totalPayments: Number(e.target.value),
                              })
                            }
                            placeholder="Enter total payments"
                            className="bg-[#1C1A11] text-white border-gray-600"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    onClick={() => setIsModalOpen(false)}
                    variant="outline"
                    className="bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    Cancel
                  </Button>
                  <OfferPurchaseButton
                    nftId={selectedNft.id}
                    paymentTerms={paymentTerms}
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

