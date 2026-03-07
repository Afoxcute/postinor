"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getSoftlawApi } from "@/utils/softlaw/getApi";
import { web3Enable, web3FromAddress } from "@polkadot/extension-dapp";
import { useAccountsContext } from "@/context/account";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";

type PaymentType =
  | { oneTime: number }
  | {
      periodic: {
        amountPerPayment: number;
        totalPayments: number;
        frequency: number;
      };
    };

interface License {
  nftId: number;
  licensor: string;
  paymentType: PaymentType;
  isExclusive: boolean;
  duration: number;
}

interface OfferData {
  license: License;
}

type Offer = [number[], OfferData];

export default function AcceptLicense() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { selectedAccount } = useAccountsContext();
  console.log("offers", offers);

  // Fetch offers on mount
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const api = await getSoftlawApi();

        // Query the `ipPallet.offers` storage
        const rawOffers = await api.query.ipPallet.offers.entries();

        // Parse the results
        const parsedOffers: Offer[] = rawOffers.map(([key, value]) => {
          const offerId = key.args.map((id) => Number(id.toString()));
          const offerData = value.toJSON() as unknown as OfferData;
          return [offerId, offerData];
        });

        setOffers(parsedOffers);
      } catch (error) {
        console.error("Error fetching offers:", error);
      }
    };

    fetchOffers();
  }, []);

  const handleOfferClick = (offer: Offer) => {
    setSelectedOffer(offer);
    setIsModalOpen(true);
  };

  const handleAcceptOffer = async () => {
    if (!selectedOffer) return;

    setLoading(true);

    try {
      const api = await getSoftlawApi();
      await web3Enable("softlaw");

      const [offerIdArray] = selectedOffer;
      const offerId = offerIdArray[0];
      if (!selectedAccount?.address) {
        throw new Error("Selected account address is undefined");
      }
      const accounts = await web3FromAddress(selectedAccount.address);
      api.setSigner(accounts.signer);

      // Call the extrinsic
      const unsub = await api.tx.ipPallet
        .acceptLicense(offerId)
        .signAndSend(selectedAccount?.address, ({ status, events }) => {
          if (status.isInBlock) {
            console.log(`Transaction included in block: ${status.asInBlock}`);
          }
          if (status.isFinalized) {
            console.log(
              `Transaction finalized at block: ${status.asFinalized}`
            );
            events.forEach(({ event }) => {
              if (event.method === "ExtrinsicSuccess") {
                console.log("Transaction succeeded:", event.toHuman());
              } else if (event.method === "ExtrinsicFailed") {
                console.error("Transaction failed:", event.toHuman());
              }
            });
            unsub();
          }
        });

      setIsModalOpen(false);
    } catch (error) {
      console.error("Error accepting offer:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPaymentType = (paymentType: PaymentType): string => {
    if ("oneTime" in paymentType) {
      return `One-time payment of ${paymentType.oneTime}`;
    } else if ("periodic" in paymentType && paymentType.periodic) {
      const { amountPerPayment, totalPayments, frequency } =
        paymentType.periodic;
      return `Periodic payment of ${amountPerPayment} every ${frequency} units, for a total of ${totalPayments} payments`;
    }
    return "Unknown payment type";
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Available Offers</h1>
      <ScrollArea className="h-[800px]">
        <ul className="space-y-2">
          {offers?.map((offer, index) => {
            const license = offer[1]?.license;
            return (
              <li
                key={index}
                className="bg-card hover:bg-slate-900 rounded-lg p-4 cursor-pointer"
                onClick={() => handleOfferClick(offer)}
              >
                <h2 className="text-lg font-semibold">
                  Offer for NFT #{license?.nftId}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Licensor: {license?.licensor}
                </p>
                <p className="text-sm text-muted-foreground">
                  Payment Type: {formatPaymentType(license?.paymentType)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Exclusive: {license?.isExclusive ? "Yes" : "No"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Duration: {license?.duration} units
                </p>
              </li>
            );
          })}
        </ul>
      </ScrollArea>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-0">
          {selectedOffer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-bold text-white">
                  Offer Details
                </CardTitle>
                <CardDescription className="text-white">
                  NFT #{selectedOffer[1].license.nftId}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-white">Licensor:</span>
                  <span className="text-muted-foreground">
                    {selectedOffer[1].license.licensor.slice(0, 10)}...
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-white">
                    Payment Type:
                  </span>
                  <span className="text-muted-foreground">
                    {formatPaymentType(selectedOffer[1].license.paymentType)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-white">Exclusive:</span>
                  <Badge
                    variant={
                      selectedOffer[1].license.isExclusive
                        ? "default"
                        : "secondary"
                    }
                  >
                    {selectedOffer[1].license.isExclusive ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-white">Duration:</span>
                  <span className="text-muted-foreground">
                    {selectedOffer[1].license.duration} units
                  </span>
                </div>
              </CardContent>
              <Button className="w-full" onClick={handleAcceptOffer}>
                Accept Offer
              </Button>
            </Card>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
