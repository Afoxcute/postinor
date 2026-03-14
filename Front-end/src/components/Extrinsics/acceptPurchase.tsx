"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import AcceptPurchaseButton from "@/components/Dashboard/Manage/ActionButtons/purchase/accept";

type PaymentType =
  | { OneTime: number | string }
  | {
      Periodic: {
        amountPerPayment: number | string;
        totalPayments: number | string;
        frequency: number | string;
      };
    };

interface Purchase {
  nftId: number | string;
  seller: string;
  paymentType: PaymentType;
}

interface OfferData {
  Purchase?: Purchase;
  purchase?: Purchase; // Handle lowercase variant from chain
}

type Offer = [number[], OfferData];

export default function AcceptPurchase() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { selectedAccount } = useAccountsContext();

  // Fetch offers on mount
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        setLoading(true);
        const api = await getSoftlawApi();
        await api.isReady;

        // Query the `ipPallet.offers` storage
        const rawOffers = await api.query.ipPallet.offers.entries();

        // Parse the results - filter for Purchase offers only
        const parsedOffers: Offer[] = rawOffers
          .map(([key, value]) => {
            const offerId = key.args.map((id) => Number(id.toString()));
            const offerData = value.toJSON() as unknown as OfferData;
            return [offerId, offerData] as Offer;
          })
          .filter((offer): offer is Offer => {
            // Only include Purchase offers
            const offerData = offer[1];
            return !!(offerData.Purchase || (offerData as any).purchase);
          });

        setOffers(parsedOffers);
      } catch (error) {
        console.error("Error fetching purchase offers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();
  }, []);

  const handleOfferClick = (offer: Offer) => {
    setSelectedOffer(offer);
    setIsModalOpen(true);
  };

  const formatPaymentType = (paymentType: PaymentType | any): string => {
    if (!paymentType) return "Unknown";
    
    // Check for OneTime (capitalized)
    if ('OneTime' in paymentType) {
      return "One-Time Payment";
    }
    
    // Check for Periodic (capitalized)
    if ('Periodic' in paymentType) {
      return "Periodic Payment";
    }
    
    // Handle lowercase variants
    if ('oneTime' in paymentType) {
      return "One-Time Payment";
    }
    
    if ('periodic' in paymentType) {
      return "Periodic Payment";
    }
    
    return "Unknown";
  };

  const getPaymentAmount = (paymentType: PaymentType | any): string => {
    if (!paymentType) return "0";
    
    // Check for OneTime (capitalized)
    if ('OneTime' in paymentType) {
      const oneTime = (paymentType as { OneTime: number | string }).OneTime;
      return String(oneTime);
    }
    
    // Check for Periodic (capitalized)
    if ('Periodic' in paymentType) {
      const periodic = (paymentType as { Periodic: { amountPerPayment: number | string } }).Periodic;
      return String(periodic.amountPerPayment);
    }
    
    // Handle lowercase variants
    if ('oneTime' in paymentType) {
      const oneTime = (paymentType as { oneTime: number | string }).oneTime;
      return String(oneTime);
    }
    
    if ('periodic' in paymentType) {
      const periodic = (paymentType as { periodic: { amountPerPayment: number | string } }).periodic;
      return String(periodic.amountPerPayment);
    }
    
    return "0";
  };

  const formatAddress = (address: string): string => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-white">Available Purchase Offers</h1>
      
      {loading ? (
        <div className="text-white">Loading purchase offers...</div>
      ) : offers.length === 0 ? (
        <div className="text-white">No purchase offers available</div>
      ) : (
        <ScrollArea className="h-[800px]">
          <ul className="space-y-2">
            {offers.map((offer, index) => {
              const purchase = offer[1]?.Purchase || offer[1]?.purchase;
              // Offer ID is an array, use the first element as the offer ID
              //First element is the offer ID, second element is the offer data
              const offerId = offer[0][0]?.toString() || offer[0].join(",");
              
              if (!purchase) return null;
              
              return (
                <li
                  key={index}
                  className="bg-card hover:bg-slate-900 rounded-lg p-4 cursor-pointer"
                  onClick={() => handleOfferClick(offer)}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-white">
                            Purchase Offer for NFT #{purchase.nftId}
                          </CardTitle>
                          <CardDescription className="text-gray-400">
                            Offer ID: {offerId}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-green-500 text-white">
                          Purchase
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-300">
                          <span className="font-semibold">Seller:</span> {formatAddress(purchase.seller)}
                        </p>
                        <p className="text-sm text-gray-300">
                          <span className="font-semibold">Payment Type:</span> {formatPaymentType(purchase.paymentType)}
                        </p>
                        <p className="text-sm text-gray-300">
                          <span className="font-semibold">Amount:</span> {getPaymentAmount(purchase.paymentType)} tokens
                        </p>
                        {'Periodic' in purchase.paymentType && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-gray-400">
                              Total Payments: {(purchase.paymentType as { Periodic: { totalPayments: number | string } }).Periodic.totalPayments}
                            </p>
                            <p className="text-xs text-gray-400">
                              Frequency: Every {(purchase.paymentType as { Periodic: { frequency: number | string } }).Periodic.frequency} blocks
                            </p>
                          </div>
                        )}
                        {'periodic' in purchase.paymentType && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-gray-400">
                              Total Payments: {(purchase.paymentType as { periodic: { totalPayments: number | string } }).periodic.totalPayments}
                            </p>
                            <p className="text-xs text-gray-400">
                              Frequency: Every {(purchase.paymentType as { periodic: { frequency: number | string } }).periodic.frequency} blocks
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#1C1A11] text-white max-w-2xl">
          {selectedOffer && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Accept Purchase Offer</h2>
              
              {(() => {
                const purchase = selectedOffer[1]?.Purchase || selectedOffer[1]?.purchase;
                // Offer ID is an array, use the first element as the offer ID
                const offerId = selectedOffer[0][0]?.toString() || selectedOffer[0].join(",");
                
                if (!purchase) return null;
                
                return (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Offer Details</h3>
                      <div className="bg-[#27251C] p-4 rounded-lg space-y-2">
                        <p><span className="font-semibold">NFT ID:</span> {purchase.nftId}</p>
                        <p><span className="font-semibold">Seller:</span> {purchase.seller}</p>
                        <p><span className="font-semibold">Payment Type:</span> {formatPaymentType(purchase.paymentType)}</p>
                        <p><span className="font-semibold">Amount:</span> {getPaymentAmount(purchase.paymentType)} tokens</p>
                        {'Periodic' in purchase.paymentType && (
                          <>
                            <p><span className="font-semibold">Total Payments:</span> {(purchase.paymentType as { Periodic: { totalPayments: number | string } }).Periodic.totalPayments}</p>
                            <p><span className="font-semibold">Frequency:</span> Every {(purchase.paymentType as { Periodic: { frequency: number | string } }).Periodic.frequency} blocks</p>
                          </>
                        )}
                        {'periodic' in purchase.paymentType && (
                          <>
                            <p><span className="font-semibold">Total Payments:</span> {(purchase.paymentType as { periodic: { totalPayments: number | string } }).periodic.totalPayments}</p>
                            <p><span className="font-semibold">Frequency:</span> Every {(purchase.paymentType as { periodic: { frequency: number | string } }).periodic.frequency} blocks</p>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsModalOpen(false)}
                        className="bg-transparent text-white border-gray-600 hover:bg-gray-800"
                      >
                        Cancel
                      </Button>
                      <AcceptPurchaseButton offerId={offerId} />
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

