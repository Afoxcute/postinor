"use client";
import React, { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { LicenseCreationFlow } from "./LicenseCreation/LicenseFlowCreation";
import type { LicenseFormData } from "./LicenseCreation/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TypesComponent from "@/components/TypesProps";
import { getSoftlawApi } from "@/utils/softlaw/getApi";
import OfferLicenseButton from "./ActionButtons/license/OfferLicenseButton";
import InnovationProvider from "@/context/innovation";
import AccountsProvider from "@/context/account";
import { useAccountsContext } from "@/context/account";
import { useToast } from "@/hooks/use-toast";
import { web3Enable, web3FromAddress } from "@polkadot/extension-dapp";

interface ManageProps {
  onDataChange?: (data: any) => void;
}
interface License extends LicenseFormData {
  status: string;
  lifetimeEarnings: string;
  recentPayment: string;
  amount: string;
  contractId?: string;
}

interface ChainLicense {
  contractId: string;
  nftId: string;
  licensor: string;
  licensee: string;
  isExclusive: boolean;
  duration: string;
  startBlock: string;
  paymentType: any;
  paymentSchedule?: any;
}

// Componente que maneja los parámetros de búsqueda
function SearchParamsHandler({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  // Aquí puedes manejar la lógica relacionada con searchParams
  return <>{children}</>;
}

function LicensingContent({ onDataChange }: ManageProps) {
  // Get URL parameters
  const searchParams = useSearchParams();
  const { selectedAccount } = useAccountsContext();
  const { toast } = useToast();
  // Check if URL has 'create' parameter to show creation form
  const shouldShowCreation = searchParams.get('create') === 'true';
  const [showLicenseCreation, setShowLicenseCreation] = useState(shouldShowCreation);
  const [licenses, setLicenses] = React.useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to format payment type
  const formatPaymentType = (paymentType: any): string => {
    if (!paymentType) return "Unknown";
    if (paymentType.OneTime) {
      return "OneTime";
    }
    if (paymentType.Periodic) {
      return "Periodic";
    }
    return "Unknown";
  };

  // Helper to get payment amount
  const getPaymentAmount = (paymentType: any): string => {
    if (!paymentType) return "0";
    if (paymentType.OneTime) {
      return String(paymentType.OneTime);
    }
    if (paymentType.Periodic) {
      return String(paymentType.Periodic.amount_per_payment || "0");
    }
    return "0";
  };

  // Fetch licenses from the chain (both offers and contracts)
  const fetchLicenses = async () => {
    try {
      setLoading(true);
      setError(null);

      const api = await getSoftlawApi();
      await api.isReady;

      // Query all contracts from the ipPallet
      const rawContracts = await api.query.ipPallet.contracts.entries();
      console.log("Raw contracts from chain:", rawContracts.length, "entries");
      if (rawContracts.length > 0) {
        console.log("Sample contract data:", rawContracts[0][1].toJSON());
        console.log("Sample contract key:", rawContracts[0][0].toHuman());
      }

      // Query all offers from the ipPallet
      const rawOffers = await api.query.ipPallet.offers.entries();
      console.log("Raw offers from chain:", rawOffers.length, "entries");
      if (rawOffers.length > 0) {
        console.log("Sample offer data:", rawOffers[0][1].toJSON());
        console.log("Sample offer key:", rawOffers[0][0].toHuman());
      }

      console.log("Current account:", selectedAccount?.address);

      // Parse and filter for License contracts
      const licenseContracts: ChainLicense[] = [];

      rawContracts.forEach(([key, value]) => {
        const contractId = key.args[0].toString();
        const contractData = value.toJSON() as any;
        
        console.log(`Contract ${contractId} data:`, contractData);
        console.log(`Contract ${contractId} keys:`, Object.keys(contractData));

        // Check if it's a License contract (not Purchase)
        // The enum might be serialized as {License: {...}} or just License: {...}
        let license = null;
        if (contractData.License) {
          license = contractData.License;
        } else if (contractData.license) {
          license = contractData.license;
        } else if (typeof contractData === 'object' && !contractData.Purchase && !contractData.purchase) {
          // If it's not a Purchase, it might be a License directly
          license = contractData;
        }

        if (license) {
          console.log(`Found License contract ${contractId}:`, license);
          licenseContracts.push({
            contractId,
            nftId: String(license.nft_id || license.nftId || ""),
            licensor: license.licensor || "",
            licensee: license.licensee || "",
            isExclusive: license.is_exclusive || license.isExclusive || false,
            duration: String(license.duration || ""),
            startBlock: String(license.start_block || license.startBlock || ""),
            paymentType: license.payment_type || license.paymentType,
            paymentSchedule: license.payment_schedule || license.paymentSchedule,
          });
        }
      });

      console.log("Parsed license contracts:", licenseContracts.length);

      // Parse and filter for License offers (pending licenses)
      const licenseOffers: any[] = [];

      rawOffers.forEach(([key, value]) => {
        const offerId = key.args[0].toString();
        const offerData = value.toJSON() as any;
        
        console.log(`Offer ${offerId} data:`, offerData);
        console.log(`Offer ${offerId} keys:`, Object.keys(offerData));

        // Check if it's a License offer (not Purchase)
        // The enum might be serialized as {License: {...}} or just License: {...}
        let offer = null;
        if (offerData.License) {
          offer = offerData.License;
        } else if (offerData.license) {
          offer = offerData.license;
        } else if (typeof offerData === 'object' && !offerData.Purchase && !offerData.purchase) {
          // If it's not a Purchase, it might be a License directly
          offer = offerData;
        }

        if (offer) {
          console.log(`Found License offer ${offerId}:`, offer);
          licenseOffers.push({
            offerId,
            nftId: String(offer.nft_id || offer.nftId || ""),
            licensor: offer.licensor || "",
            isExclusive: offer.is_exclusive || offer.isExclusive || false,
            duration: String(offer.duration || ""),
            paymentType: offer.payment_type || offer.paymentType,
          });
        }
      });

      console.log("Parsed license offers:", licenseOffers.length);

      // Combine contracts and offers, filter by current user's account
      let allLicenses: any[] = [];

      // Add active contracts
      allLicenses = [...licenseContracts];

      // Add pending offers (where user is the licensor)
      if (selectedAccount?.address) {
        const userOffers = licenseOffers.filter(
          (offer) => offer.licensor === selectedAccount.address
        );
        allLicenses = [...allLicenses, ...userOffers.map(offer => ({ ...offer, isOffer: true }))];
      } else {
        allLicenses = [...allLicenses, ...licenseOffers.map(offer => ({ ...offer, isOffer: true }))];
      }

      // Filter by current user's account (show licenses where user is licensor or licensee)
      let filteredLicenses = allLicenses;
      if (selectedAccount?.address) {
        console.log("Filtering licenses for account:", selectedAccount.address);
        console.log("All licenses before filtering:", allLicenses.map(l => ({
          licensor: l.licensor,
          licensee: l.licensee,
          isOffer: l.isOffer
        })));
        
        filteredLicenses = allLicenses.filter(
          (license) => {
            const isLicensor = license.licensor === selectedAccount.address;
            const isLicensee = license.licensee === selectedAccount.address;
            console.log(`License ${license.contractId || license.offerId}: licensor=${license.licensor}, licensee=${license.licensee}, matches=${isLicensor || isLicensee}`);
            return isLicensor || isLicensee;
          }
        );
      } else {
        console.log("No account selected, showing all licenses");
      }

      console.log("Filtered licenses (contracts + offers):", filteredLicenses);

      // Convert chain licenses to UI format
      const uiLicenses: License[] = filteredLicenses.map((chainLicense, index) => {
        const paymentType = formatPaymentType(chainLicense.paymentType);
        const amount = getPaymentAmount(chainLicense.paymentType);
        const isOffer = chainLicense.isOffer || false;
        const durationValue = parseInt(chainLicense.duration || "0");
        
        // Map duration to "Permanent" or "Custom" based on value
        // If duration is 0 or very large, consider it Permanent
        const durationType: "Permanent" | "Custom" = 
          durationValue === 0 || durationValue > 1000000000 ? "Permanent" : "Custom";

        return {
          id: Date.now() + index,
          nftId: chainLicense.nftId,
          licenseType: chainLicense.isExclusive ? "Exclusive" : "Non-Exclusive",
          price: {
            amount: parseFloat(amount) || 0,
            currency: "SLAW",
          },
          royaltyrate: 0, // Not stored in contract, would need to fetch from offer or metadata
          durationType: durationType,
          customDuration: durationType === "Custom" ? {
            value: durationValue,
            unit: "days" as const,
          } : undefined,
          paymentType: paymentType,
          status: isOffer ? "Pending" : "Active",
          lifetimeEarnings: "$0.00",
          recentPayment: "N/A",
          amount: amount,
          contractId: chainLicense.contractId || chainLicense.offerId,
        } as License;
      });

      setLicenses(uiLicenses);
      console.log("Final licenses to display:", uiLicenses.length, "licenses");
    } catch (err) {
      console.error("Error fetching licenses:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch licenses");
    } finally {
      setLoading(false);
    }
  };

  // Fetch licenses on mount and when account changes
  useEffect(() => {
    fetchLicenses();

    // Refresh every 15 seconds
    const interval = setInterval(fetchLicenses, 15000);
    return () => clearInterval(interval);
  }, [selectedAccount?.address]);

  const handleLicenseCreation = (data: LicenseFormData) => {
    // Refresh licenses from chain after creation
    setTimeout(() => {
      fetchLicenses();
    }, 2000); // Wait 2 seconds for transaction to be included
    setShowLicenseCreation(false);
  };

  // Handle renew license - creates a new license offer
  const handleRenewLicense = (license: License) => {
    toast({
      title: "Renew License",
      description: "To renew a license, you need to create a new license offer. Opening license creation form...",
      variant: "default",
    });
    // Pre-fill the form with the existing license details
    setShowLicenseCreation(true);
  };

  // Handle request payment - for periodic payments
  const handleRequestPayment = async (license: License) => {
    if (!license.contractId) {
      toast({
        title: "Error",
        description: "This license doesn't have a contract ID. Cannot request payment.",
        variant: "destructive",
      });
      return;
    }

    if (license.paymentType !== "Periodic") {
      toast({
        title: "Info",
        description: "Payment requests are only available for periodic payment licenses.",
        variant: "default",
      });
      return;
    }

    if (license.status === "Pending") {
      toast({
        title: "Info",
        description: "This license offer hasn't been accepted yet. Payment can only be requested for active licenses.",
        variant: "default",
      });
      return;
    }

    try {
      const api = await getSoftlawApi();
      await web3Enable("softlaw");

      if (!selectedAccount?.address) {
        throw new Error("No account selected");
      }

      const injector = await web3FromAddress(selectedAccount.address);
      api.setSigner(injector.signer as any);

      const contractId = parseInt(license.contractId, 10);
      if (isNaN(contractId)) {
        throw new Error("Invalid contract ID");
      }

      setLoading(true);
      
      await api.tx.ipPallet
        .makePeriodicPayment(contractId)
        .signAndSend(
          selectedAccount.address,
          { signer: injector.signer as any },
          ({ status, events, dispatchError }: any) => {
            if (dispatchError) {
              const decoded = api.registry.findMetaError(dispatchError.asModule);
              toast({
                title: "Payment Failed",
                description: `${decoded.section}.${decoded.name}: ${decoded.docs.join(" ")}`,
                variant: "destructive",
              });
              setLoading(false);
              return;
            }

            if (status.isInBlock || status.isFinalized) {
              let paymentMade = false;
              let allComplete = false;

              events.forEach(({ event }: any) => {
                if (event.section === 'ipPallet') {
                  if (event.method === 'PeriodicPaymentMade') {
                    paymentMade = true;
                  }
                  if (event.method === 'PaymentsCompleted') {
                    allComplete = true;
                  }
                }
              });

              if (paymentMade) {
                toast({
                  title: "Payment Successful",
                  description: allComplete 
                    ? "All payments have been completed!" 
                    : "Payment processed successfully",
                  variant: "default",
                });
                // Refresh licenses
                setTimeout(() => {
                  fetchLicenses();
                }, 2000);
              }
              setLoading(false);
            }
          }
        );
    } catch (error: any) {
      console.error("Error requesting payment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to request payment",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // Handle edit royalty rate - requires creating a new offer
  const handleEditRoyaltyRate = (license: License) => {
    toast({
      title: "Edit Royalty Rate",
      description: "To change the royalty rate, you need to create a new license offer with the updated rate. Opening license creation form...",
      variant: "default",
    });
    // Open license creation form
    setShowLicenseCreation(true);
  };
  return (
    <div className="bg-[#1C1A11] w-full justify-center self-stretch items-center min-[2000px]:min-h-screen min-[2000px]:w-[3000px] py-[120px] mx-auto scrollable">
      {showLicenseCreation ? (
        <LicenseCreationFlow
          onComplete={handleLicenseCreation}
          onCancel={() => setShowLicenseCreation(false)}
        />
      ) : (
        <div className="self-stretch flex flex-col items-end gap-[16px] w-full">
          {/* Always show Create License button at the top */}
          <div className="w-full flex justify-end mb-4">
            <Button
              onClick={() => setShowLicenseCreation(true)}
              className="bg-[#373737] text-white hover:bg-[#FACC15] hover:text-[#1C1A11] px-4 py-2 rounded min-[2000px]:text-2xl"
            >
              Create New License
            </Button>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="text-center py-8 w-full">
              <p className="text-center text-gray-400">Loading licenses...</p>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="text-center py-8 w-full">
              <p className="text-center text-red-400">Error: {error}</p>
              <Button
                onClick={fetchLicenses}
                className="bg-[#373737] text-white hover:bg-[#FACC15] hover:text-[#1C1A11] px-4 py-2 rounded mt-4"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && licenses.length === 0 && (
            <div className="text-center py-8 w-full">
              <p className="text-center text-gray-400">
                No licenses created yet. Click "Create New License" above to get started.
              </p>
            </div>
          )}

          {/* Licenses list */}
          {!loading && !error && licenses.length > 0 && (
            <>
              <div className="grid grid-cols-8 gap-[10px] pb-2 items-start border-b-[#ffff] mx-auto">
                <TypesComponent
                  text="NFT ID"
                  className="text-[#B0B0B1] min-[2000px]:text-2xl text-[16px]"
                />
                <TypesComponent
                  text="License Type"
                  className="text-[#B0B0B1] min-[2000px]:text-2xl text-[16px]"
                />
                <TypesComponent
                  text="Status"
                  className="text-[#B0B0B1] min-[2000px]:text-2xl text-[16px]"
                />
                <TypesComponent
                  text="License Price"
                  className="text-[#B0B0B1] min-[2000px]:text-2xl text-[16px]"
                />
                <TypesComponent
                  text="Royalty Rate"
                  className="text-[#B0B0B1] min-[2000px]:text-2xl text-[16px]"
                />
                <TypesComponent
                  text="Duration Type"
                  className="text-[#B0B0B1] min-[2000px]:text-2xl text-[16px]"
                />
                <TypesComponent
                  text="Payment Type"
                  className="text-[#B0B0B1] min-[2000px]:text-2xl text-[16px]"
                />
              </div>
              <div className="flex flex-col pb-[16px]   p-4 bg-[#1C1A11] mx-auto">
                {licenses.map((license: License) => (
                  <Card
                    key={license.nftId}
                    className="bg-[transparent] border-none mb-4"
                  >
                    <div className="grid grid-cols-8 gap-[40px] pb-2 items-start">
                      <TypesComponent
                        className="font-bold min-[2000px]:text-2xl text-[#fff] "
                        text={`${license.nftId}`}
                      />

                      <TypesComponent
                        className="text-[#fff]"
                        text={` ${license.licenseType}`}
                      />

                      <div className={`${license.status === "Active" ? "bg-[#43C705]" : "bg-yellow-500"} rounded-[36px] flex py-1 px-4 items-center justify-center text-black md:w-[70px] min-[2000px]:w-full min-[2000px]:text-2xl`}>
                        <TypesComponent
                          className="text-black"
                          text={license.status || "Active"}
                        />
                      </div>

                      <div>
                        <TypesComponent
                          className="px-2 py-1 text-[#fff] min-[2000px]:text-2xl text-sm"
                          text={`${license.price.amount} ${license.price.currency}`}
                        />
                      
                      </div>

                      <div className="text-[#fff]">{`${license.royaltyrate}%`}</div>

                      <TypesComponent
                        className="text-center min-[2000px]:text-2xl text-[#fff]"
                        text={` ${license.durationType}`}
                      />

                      <TypesComponent
                        className="text-center min-[2000px]:text-2xl text-[#fff]"
                        text={`${license.paymentType}`}
                      />
                    </div>
                    
                    {/* Action buttons for each license */}
                    <div className="flex items-center justify-end text-center gap-4 mt-4 pt-4 border-t border-[#8A8A8A]">
                      <Button
                        onClick={() => handleRenewLicense(license)}
                        className="bg-[#373737] text-white hover:bg-[#FACC15] hover:text-[#1C1A11] px-4 py-2 rounded text-sm"
                      >
                        Renew License
                      </Button>
                      <Button
                        onClick={() => handleRequestPayment(license)}
                        className="bg-[#373737] text-white hover:bg-[#FACC15] hover:text-[#1C1A11] px-4 py-2 rounded text-sm"
                        disabled={license.paymentType !== "Periodic" || license.status === "Pending"}
                      >
                        Request Payment
                      </Button>
                      <Button
                        onClick={() => handleEditRoyaltyRate(license)}
                        className="bg-[#373737] text-white hover:bg-[#FACC15] hover:text-[#1C1A11] px-4 py-2 rounded text-sm"
                      >
                        Edit Royalty Rate
                      </Button>
                    </div>
                  </Card>
                ))}

            <div className="flex items-center justify-end text-center gap-4 mt-4">
                  <OfferLicenseButton/>
                </div>
              </div>
              
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Licensing(props: ManageProps) {
  return (
  

       <Suspense fallback={<div className="bg-[#1C1A11] w-full h-screen flex items-center justify-center">
      <p className="text-white">Cargando...</p>
    </div>}>
      <SearchParamsHandler>
        <LicensingContent {...props} />
      </SearchParamsHandler>
    </Suspense>

   
  );
}