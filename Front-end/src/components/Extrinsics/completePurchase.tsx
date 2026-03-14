"use client";

import { useEffect, useState } from "react";
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
import CompletePurchaseButton from "@/components/Dashboard/Manage/ActionButtons/purchase/complete";

interface PurchaseContract {
  contractId: string;
  nftId: string;
  seller: string;
  buyer: string;
  paymentType: any;
  paymentSchedule?: {
    paymentsMade: number | string;
    paymentsDue: number | string;
    totalPayments: number | string;
  };
}

export default function CompletePurchase() {
  const [contracts, setContracts] = useState<PurchaseContract[]>([]);
  const [selectedContract, setSelectedContract] = useState<PurchaseContract | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { selectedAccount } = useAccountsContext();

  // Fetch purchase contracts on mount
  useEffect(() => {
    const fetchContracts = async () => {
      try {
        setLoading(true);
        const api = await getSoftlawApi();
        await api.isReady;

        // Query all contracts
        const rawContracts = await api.query.ipPallet.contracts.entries();

        // Parse and filter for Purchase contracts that are ready to complete
        const purchaseContracts: PurchaseContract[] = [];
        
        rawContracts.forEach(([key, value]) => {
          const contractId = key.args[0].toString();
          const contractData = value.toJSON() as any;
          
          // Check if it's a Purchase contract
          let purchase = null;
          if (contractData.Purchase) {
            purchase = contractData.Purchase;
          } else if (contractData.purchase) {
            purchase = contractData.purchase;
          }

          if (purchase) {
            // Check if all payments are completed (paymentsDue should be 0)
            const schedule = purchase.payment_schedule || purchase.paymentSchedule;
            if (schedule) {
              const paymentsDue = schedule.payments_due || schedule.paymentsDue || 0;
              
              // Only include contracts where all payments are made
              if (paymentsDue === 0 || paymentsDue === "0") {
                purchaseContracts.push({
                  contractId,
                  nftId: String(purchase.nft_id || purchase.nftId || ""),
                  seller: purchase.seller || "",
                  buyer: purchase.buyer || "",
                  paymentType: purchase.payment_type || purchase.paymentType,
                  paymentSchedule: {
                    paymentsMade: schedule.payments_made || schedule.paymentsMade || 0,
                    paymentsDue: paymentsDue,
                    totalPayments: schedule.total_payments || schedule.totalPayments || 0,
                  },
                });
              }
            }
          }
        });

        setContracts(purchaseContracts);
      } catch (error) {
        console.error("Error fetching purchase contracts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, []);

  const handleContractClick = (contract: PurchaseContract) => {
    setSelectedContract(contract);
    setIsModalOpen(true);
  };

  const formatAddress = (address: string): string => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-white">Complete Purchase Contracts</h1>
      <p className="text-gray-400 mb-4">Purchase contracts where all payments have been completed</p>
      
      {loading ? (
        <div className="text-white">Loading contracts...</div>
      ) : contracts.length === 0 ? (
        <div className="text-white">No purchase contracts ready to complete</div>
      ) : (
        <ScrollArea className="h-[800px]">
          <ul className="space-y-2">
            {contracts.map((contract, index) => (
              <li
                key={index}
                className="bg-card hover:bg-slate-900 rounded-lg p-4 cursor-pointer"
                onClick={() => handleContractClick(contract)}
              >
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-white">
                          Purchase Contract for NFT #{contract.nftId}
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                          Contract ID: {contract.contractId}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-purple-500 text-white">
                        Ready to Complete
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-300">
                        <span className="font-semibold">Seller:</span> {formatAddress(contract.seller)}
                      </p>
                      <p className="text-sm text-gray-300">
                        <span className="font-semibold">Buyer:</span> {formatAddress(contract.buyer)}
                      </p>
                      {contract.paymentSchedule && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-gray-400">
                            Payments Made: {contract.paymentSchedule.paymentsMade} / {contract.paymentSchedule.totalPayments}
                          </p>
                          <p className="text-xs text-green-400">
                            ✓ All payments completed
                          </p>
                        </div>
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
        <DialogContent className="bg-[#1C1A11] text-white max-w-2xl">
          {selectedContract && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Complete Purchase Contract</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Contract Details</h3>
                  <div className="bg-[#27251C] p-4 rounded-lg space-y-2">
                    <p><span className="font-semibold">Contract ID:</span> {selectedContract.contractId}</p>
                    <p><span className="font-semibold">NFT ID:</span> {selectedContract.nftId}</p>
                    <p><span className="font-semibold">Seller:</span> {selectedContract.seller}</p>
                    <p><span className="font-semibold">Buyer:</span> {selectedContract.buyer}</p>
                    {selectedContract.paymentSchedule && (
                      <>
                        <p><span className="font-semibold">Payments Made:</span> {selectedContract.paymentSchedule.paymentsMade} / {selectedContract.paymentSchedule.totalPayments}</p>
                        <p className="text-green-400"><span className="font-semibold">Status:</span> ✓ All payments completed - Ready to complete</p>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    Cancel
                  </button>
                  <CompletePurchaseButton contractId={selectedContract.contractId} />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


