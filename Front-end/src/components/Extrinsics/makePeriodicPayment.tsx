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
import MakePeriodicPaymentButton from "@/components/Dashboard/Manage/ActionButtons/payments/makePerioficPayment";

interface Contract {
  contractId: string;
  nftId: string;
  contractType: "License" | "Purchase";
  licensor?: string;
  licensee?: string;
  seller?: string;
  buyer?: string;
  paymentType: any;
  paymentSchedule?: {
    paymentsMade: number | string;
    paymentsDue: number | string;
    totalPayments: number | string;
    nextPaymentBlock?: number | string;
  };
}

export default function MakePeriodicPaymentPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { selectedAccount } = useAccountsContext();

  // Fetch contracts with periodic payments due
  useEffect(() => {
    const fetchContracts = async () => {
      try {
        setLoading(true);
        const api = await getSoftlawApi();
        await api.isReady;

        // Query all contracts
        const rawContracts = await api.query.ipPallet.contracts.entries();

        // Parse and filter for contracts with periodic payments due
        const periodicContracts: Contract[] = [];
        
        rawContracts.forEach(([key, value]) => {
          const contractId = key.args[0].toString();
          const contractData = value.toJSON() as any;
          
          // Check if it's a License or Purchase contract
          let contract = null;
          let contractType: "License" | "Purchase" = "License";
          
          if (contractData.License) {
            contract = contractData.License;
            contractType = "License";
          } else if (contractData.license) {
            contract = contractData.license;
            contractType = "License";
          } else if (contractData.Purchase) {
            contract = contractData.Purchase;
            contractType = "Purchase";
          } else if (contractData.purchase) {
            contract = contractData.purchase;
            contractType = "Purchase";
          }

          if (contract) {
            const schedule = contract.payment_schedule || contract.paymentSchedule;
            if (schedule) {
              const paymentsDue = schedule.payments_due || schedule.paymentsDue || 0;
              
              // Only include contracts where payments are still due
              if (paymentsDue > 0 && paymentsDue !== "0") {
                periodicContracts.push({
                  contractId,
                  nftId: String(contract.nft_id || contract.nftId || ""),
                  contractType,
                  licensor: contract.licensor,
                  licensee: contract.licensee,
                  seller: contract.seller,
                  buyer: contract.buyer,
                  paymentType: contract.payment_type || contract.paymentType,
                  paymentSchedule: {
                    paymentsMade: schedule.payments_made || schedule.paymentsMade || 0,
                    paymentsDue: paymentsDue,
                    totalPayments: schedule.total_payments || schedule.totalPayments || 0,
                    nextPaymentBlock: schedule.next_payment_block || schedule.nextPaymentBlock,
                  },
                });
              }
            }
          }
        });

        // Filter by current user if account is selected
        let filteredContracts = periodicContracts;
        if (selectedAccount?.address) {
          filteredContracts = periodicContracts.filter(contract => {
            if (contract.contractType === "License") {
              return contract.licensee === selectedAccount.address;
            } else {
              return contract.buyer === selectedAccount.address;
            }
          });
        }

        setContracts(filteredContracts);
      } catch (error) {
        console.error("Error fetching contracts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, [selectedAccount?.address]);

  const handleContractClick = (contract: Contract) => {
    setSelectedContract(contract);
    setIsModalOpen(true);
  };

  const formatAddress = (address: string): string => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-white">Make Periodic Payment</h1>
      <p className="text-gray-400 mb-4">Contracts with periodic payments due</p>
      
      {loading ? (
        <div className="text-white">Loading contracts...</div>
      ) : contracts.length === 0 ? (
        <div className="text-white">
          {selectedAccount 
            ? "No contracts with payments due for your account"
            : "Connect your wallet to view contracts with payments due"}
        </div>
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
                          {contract.contractType} Contract for NFT #{contract.nftId}
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                          Contract ID: {contract.contractId}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-red-500 text-white">
                        Payment Due
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {contract.contractType === "License" ? (
                        <>
                          <p className="text-sm text-gray-300">
                            <span className="font-semibold">Licensor:</span> {formatAddress(contract.licensor || "")}
                          </p>
                          <p className="text-sm text-gray-300">
                            <span className="font-semibold">Licensee:</span> {formatAddress(contract.licensee || "")}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-gray-300">
                            <span className="font-semibold">Seller:</span> {formatAddress(contract.seller || "")}
                          </p>
                          <p className="text-sm text-gray-300">
                            <span className="font-semibold">Buyer:</span> {formatAddress(contract.buyer || "")}
                          </p>
                        </>
                      )}
                      {contract.paymentSchedule && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-gray-400">
                            Payments Made: {contract.paymentSchedule.paymentsMade} / {contract.paymentSchedule.totalPayments}
                          </p>
                          <p className="text-xs text-yellow-400">
                            Payments Due: {contract.paymentSchedule.paymentsDue}
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
              <h2 className="text-2xl font-bold">Make Periodic Payment</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Contract Details</h3>
                  <div className="bg-[#27251C] p-4 rounded-lg space-y-2">
                    <p><span className="font-semibold">Contract ID:</span> {selectedContract.contractId}</p>
                    <p><span className="font-semibold">Contract Type:</span> {selectedContract.contractType}</p>
                    <p><span className="font-semibold">NFT ID:</span> {selectedContract.nftId}</p>
                    {selectedContract.contractType === "License" ? (
                      <>
                        <p><span className="font-semibold">Licensor:</span> {selectedContract.licensor}</p>
                        <p><span className="font-semibold">Licensee:</span> {selectedContract.licensee}</p>
                      </>
                    ) : (
                      <>
                        <p><span className="font-semibold">Seller:</span> {selectedContract.seller}</p>
                        <p><span className="font-semibold">Buyer:</span> {selectedContract.buyer}</p>
                      </>
                    )}
                    {selectedContract.paymentSchedule && (
                      <>
                        <p><span className="font-semibold">Payments Made:</span> {selectedContract.paymentSchedule.paymentsMade} / {selectedContract.paymentSchedule.totalPayments}</p>
                        <p><span className="font-semibold">Payments Due:</span> {selectedContract.paymentSchedule.paymentsDue}</p>
                        {selectedContract.paymentSchedule.nextPaymentBlock && (
                          <p><span className="font-semibold">Next Payment Block:</span> {selectedContract.paymentSchedule.nextPaymentBlock}</p>
                        )}
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
                  <MakePeriodicPaymentButton contractId={selectedContract.contractId} />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

