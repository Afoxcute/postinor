"use client";
import React, { useEffect, useState, useCallback } from "react";
import MaxWidthWrapper from "@/components/MaxWidhWrapper";
import { useDashboardContext } from "@/context/dashboard";
import { useAccountsContext } from "@/context/account";
import { getSoftlawApi } from "@/utils/softlaw/getApi";
import TypesComponent from "@/components/TypesProps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import Footer from "../../Footer";

interface ActivityProps {
  onDataChange: (data: any) => void;
}

interface ActivityItem {
  id: string;
  type: "Mint" | "License" | "Purchase" | "Payment" | "Contract";
  action: string;
  nftId?: string;
  contractId?: string;
  offerId?: string;
  from?: string;
  to?: string;
  amount?: string;
  blockNumber: string;
  blockHash: string;
  timestamp: Date;
  status: "Success" | "Pending" | "Failed";
  details?: any;
}

export default function Activity({ onDataChange }: ActivityProps) {
  const { selectedTabDashboard, setSelectedTabDashboard } = useDashboardContext();
  const { selectedAccount } = useAccountsContext();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [eventSubscription, setEventSubscription] = useState<any>(null);

  // Format account address for display
  const formatAddress = (address: string) => {
    if (!address) return "N/A";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Format activity type for display
  const formatActivityType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Parse event data
  const parseEvent = (event: any, blockNumber: string, blockHash: string, timestamp: Date): ActivityItem | null => {
    if (event.section !== 'ipPallet') return null;

    // Event data can be accessed via event.data or event.data.toJSON()
    const eventData = event.data ? (event.data.toJSON ? event.data.toJSON() : event.data) : [];
    const eventMethod = event.method;

    try {
      switch (eventMethod) {
        case 'NftMinted': {
          // Event structure: NftMinted { owner, nft_id }
          const eventObj = eventData as any;
          const owner = eventObj?.owner || eventData[0]?.toString() || '';
          const nftId = eventObj?.nft_id || eventObj?.nftId || eventData[1]?.toString() || '';
          
          // Only show if it's the user's activity
          if (selectedAccount?.address && owner !== selectedAccount.address) {
            return null;
          }

          return {
            id: `${blockHash}-${eventMethod}-${nftId}`,
            type: "Mint",
            action: "NFT Minted",
            nftId,
            from: owner,
            blockNumber,
            blockHash,
            timestamp,
            status: "Success",
            details: { owner, nftId },
          };
        }

        case 'LicenseOffered': {
          // Event structure: LicenseOffered { nft_id, offer_id, is_exclusive }
          const eventObj = eventData as any;
          const nftId = eventObj?.nft_id || eventObj?.nftId || eventData[0]?.toString() || '';
          const offerId = eventObj?.offer_id || eventObj?.offerId || eventData[1]?.toString() || '';
          const isExclusive = eventObj?.is_exclusive || eventObj?.isExclusive || eventData[2]?.toString() === 'true' || false;

          return {
            id: `${blockHash}-${eventMethod}-${offerId}`,
            type: "License",
            action: `License Offer Created (${isExclusive ? 'Exclusive' : 'Non-Exclusive'})`,
            nftId,
            offerId,
            blockNumber,
            blockHash,
            timestamp,
            status: "Success",
            details: { nftId, offerId, isExclusive },
          };
        }

        case 'PurchaseOffered': {
          // Event structure: PurchaseOffered { nft_id, offer_id }
          const eventObj = eventData as any;
          const nftId = eventObj?.nft_id || eventObj?.nftId || eventData[0]?.toString() || '';
          const offerId = eventObj?.offer_id || eventObj?.offerId || eventData[1]?.toString() || '';

          return {
            id: `${blockHash}-${eventMethod}-${offerId}`,
            type: "Purchase",
            action: "Purchase Offer Created",
            nftId,
            offerId,
            blockNumber,
            blockHash,
            timestamp,
            status: "Success",
            details: { nftId, offerId },
          };
        }

        case 'ContractCreated': {
          // Event structure: ContractCreated { contract_id, contract_type, nft_id, offered_by, accepted_by }
          const eventObj = eventData as any;
          const contractId = eventObj?.contract_id || eventObj?.contractId || eventData[0]?.toString() || '';
          const contractType = eventObj?.contract_type || eventObj?.contractType || eventData[1]?.toString() || '';
          const nftId = eventObj?.nft_id || eventObj?.nftId || eventData[2]?.toString() || '';
          const offeredBy = eventObj?.offered_by || eventObj?.offeredBy || eventData[3]?.toString() || '';
          const acceptedBy = eventObj?.accepted_by || eventObj?.acceptedBy || eventData[4]?.toString() || '';

          // Only show if user is involved
          if (selectedAccount?.address && 
              offeredBy !== selectedAccount.address && 
              acceptedBy !== selectedAccount.address) {
            return null;
          }

          return {
            id: `${blockHash}-${eventMethod}-${contractId}`,
            type: contractType === 'License' ? "License" : "Purchase",
            action: `${contractType} Contract Created`,
            nftId,
            contractId,
            from: offeredBy,
            to: acceptedBy,
            blockNumber,
            blockHash,
            timestamp,
            status: "Success",
            details: { contractId, contractType, nftId, offeredBy, acceptedBy },
          };
        }

        case 'PeriodicPaymentMade': {
          // Event structure: PeriodicPaymentMade { contract_id, nft_id, payer, payee, amount }
          const eventObj = eventData as any;
          const contractId = eventObj?.contract_id || eventObj?.contractId || eventData[0]?.toString() || '';
          const nftId = eventObj?.nft_id || eventObj?.nftId || eventData[1]?.toString() || '';
          const payer = eventObj?.payer || eventData[2]?.toString() || '';
          const payee = eventObj?.payee || eventData[3]?.toString() || '';
          const amount = eventObj?.amount || eventData[4]?.toString() || '0';

          // Only show if user is involved
          if (selectedAccount?.address && 
              payer !== selectedAccount.address && 
              payee !== selectedAccount.address) {
            return null;
          }

          return {
            id: `${blockHash}-${eventMethod}-${contractId}-${Date.now()}`,
            type: "Payment",
            action: "Periodic Payment Made",
            nftId,
            contractId,
            from: payer,
            to: payee,
            amount,
            blockNumber,
            blockHash,
            timestamp,
            status: "Success",
            details: { contractId, nftId, payer, payee, amount },
          };
        }

        case 'ContractCompleted': {
          // Event structure: ContractCompleted { contract_id, contract_type, nft_id, offered_by, accepted_by, total_paid }
          const eventObj = eventData as any;
          const contractId = eventObj?.contract_id || eventObj?.contractId || eventData[0]?.toString() || '';
          const contractType = eventObj?.contract_type || eventObj?.contractType || eventData[1]?.toString() || '';
          const nftId = eventObj?.nft_id || eventObj?.nftId || eventData[2]?.toString() || '';
          const offeredBy = eventObj?.offered_by || eventObj?.offeredBy || eventData[3]?.toString() || '';
          const acceptedBy = eventObj?.accepted_by || eventObj?.acceptedBy || eventData[4]?.toString() || '';
          const totalPaid = eventObj?.total_paid || eventObj?.totalPaid || eventData[5]?.toString() || '0';

          // Only show if user is involved
          if (selectedAccount?.address && 
              offeredBy !== selectedAccount.address && 
              acceptedBy !== selectedAccount.address) {
            return null;
          }

          return {
            id: `${blockHash}-${eventMethod}-${contractId}`,
            type: contractType === 'License' ? "License" : "Purchase",
            action: `${contractType} Contract Completed`,
            nftId,
            contractId,
            from: offeredBy,
            to: acceptedBy,
            amount: totalPaid,
            blockNumber,
            blockHash,
            timestamp,
            status: "Success",
            details: { contractId, contractType, nftId, offeredBy, acceptedBy, totalPaid },
          };
        }

        case 'ContractExpired': {
          // Event structure: ContractExpired { contract_id, contract_type, nft_id, offered_by, accepted_by }
          const eventObj = eventData as any;
          const contractId = eventObj?.contract_id || eventObj?.contractId || eventData[0]?.toString() || '';
          const contractType = eventObj?.contract_type || eventObj?.contractType || eventData[1]?.toString() || '';
          const nftId = eventObj?.nft_id || eventObj?.nftId || eventData[2]?.toString() || '';
          const offeredBy = eventObj?.offered_by || eventObj?.offeredBy || eventData[3]?.toString() || '';
          const acceptedBy = eventObj?.accepted_by || eventObj?.acceptedBy || eventData[4]?.toString() || '';

          // Only show if user is involved
          if (selectedAccount?.address && 
              offeredBy !== selectedAccount.address && 
              acceptedBy !== selectedAccount.address) {
            return null;
          }

          return {
            id: `${blockHash}-${eventMethod}-${contractId}`,
            type: contractType === 'License' ? "License" : "Purchase",
            action: `${contractType} Contract Expired`,
            nftId,
            contractId,
            from: offeredBy,
            to: acceptedBy,
            blockNumber,
            blockHash,
            timestamp,
            status: "Success",
            details: { contractId, contractType, nftId, offeredBy, acceptedBy },
          };
        }

        default:
          return null;
      }
    } catch (error) {
      console.error(`Error parsing event ${eventMethod}:`, error);
      return null;
    }
  };

  // Fetch historical events from recent blocks
  const fetchHistoricalEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const api = await getSoftlawApi();
      await api.isReady;

      const currentBlock = await api.rpc.chain.getHeader();
      const currentBlockNumber = currentBlock.number.toNumber();
      
      // Fetch events from last 1000 blocks (or all blocks if chain is shorter)
      // This ensures we capture all activities even if the server was restarted
      const blocksToFetch = Math.min(1000, currentBlockNumber);
      const activitiesList: ActivityItem[] = [];

      console.log(`Fetching events from ${blocksToFetch} blocks (current block: ${currentBlockNumber})`);

      // Process blocks in batches to avoid overwhelming the API
      const batchSize = 50;
      for (let batchStart = 0; batchStart < blocksToFetch; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, blocksToFetch);
        const batchPromises: Promise<void>[] = [];

        for (let i = batchStart; i < batchEnd; i++) {
          const blockNumber = currentBlockNumber - i;
          
          const fetchBlock = async () => {
            try {
              const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
              
              // Try to get actual block timestamp if available
              let timestamp = new Date();
              try {
                // Some chains have timestamp pallet - try to get it
                const timestampValue = await api.query.timestamp?.now.at(blockHash);
                if (timestampValue) {
                  // Type assertion: Codec from timestamp pallet has toNumber() method
                  const timestampNumber = (timestampValue as any).toNumber?.();
                  if (timestampNumber && timestampNumber > 0) {
                    // Timestamp is usually in milliseconds, but check if it's seconds
                    // If it's less than a reasonable date (year 2000), assume it's seconds
                    if (timestampNumber < 946684800000) {
                      timestamp = new Date(timestampNumber * 1000);
                    } else {
                      timestamp = new Date(timestampNumber);
                    }
                  }
                }
              } catch {
                // If timestamp pallet not available, use current time
                // This is okay for display purposes
              }

              // Get events for this block
              const eventsAt = await api.query.system.events.at(blockHash);
              
              // Convert Codec to array
              const events = eventsAt as any;
              const eventsArray = events.toArray ? events.toArray() : (Array.isArray(events) ? events : []);
              
              eventsArray.forEach((record: any) => {
                const { event } = record;
                if (event && event.section === 'ipPallet') {
                  const activity = parseEvent(
                    event,
                    blockNumber.toString(),
                    blockHash.toString(),
                    timestamp
                  );
                  if (activity) {
                    activitiesList.push(activity);
                  }
                }
              });
            } catch (err) {
              // Skip blocks that can't be fetched (might be pruned or not exist)
              console.log(`Skipping block ${blockNumber}:`, err);
            }
          };

          batchPromises.push(fetchBlock());
        }

        // Wait for batch to complete before processing next batch
        await Promise.all(batchPromises);
        
        // Update UI periodically to show progress
        if (batchStart % 200 === 0) {
          const sorted = [...activitiesList].sort((a, b) => parseInt(b.blockNumber) - parseInt(a.blockNumber));
          setActivities(sorted);
        }
      }

      // Sort by block number (newest first)
      activitiesList.sort((a, b) => parseInt(b.blockNumber) - parseInt(a.blockNumber));
      
      console.log(`Fetched ${activitiesList.length} activities from ${blocksToFetch} blocks`);
      
      setActivities(activitiesList);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching historical events:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch activities");
      setLoading(false);
    }
  };

  // Subscribe to new events
  const subscribeToEvents = useCallback(async () => {
    try {
      const api = await getSoftlawApi();
      await api.isReady;

      // Subscribe to new blocks
      const unsubscribe = await api.rpc.chain.subscribeNewHeads(async (header) => {
        try {
          const blockHash = header.hash;
          const blockNumber = header.number.toNumber();
          const timestamp = new Date();

          // Process events in the new block
          const newActivities: ActivityItem[] = [];

          // Get events from the block
          const eventsAt = await api.query.system.events.at(blockHash);
          
          // Convert Codec to array
          const events = eventsAt as any;
          const eventsArray = events.toArray ? events.toArray() : (Array.isArray(events) ? events : []);
          
          eventsArray.forEach((record: any) => {
            const { event } = record;
            if (event && event.section === 'ipPallet') {
              const activity = parseEvent(
                event,
                blockNumber.toString(),
                blockHash.toString(),
                timestamp
              );
              if (activity) {
                newActivities.push(activity);
              }
            }
          });

          // Add new activities to the list
          if (newActivities.length > 0) {
            setActivities((prev) => {
              // Avoid duplicates
              const existingIds = new Set(prev.map(a => a.id));
              const uniqueNew = newActivities.filter(a => !existingIds.has(a.id));
              return [...uniqueNew, ...prev].slice(0, 200); // Keep last 200 activities
            });
          }
        } catch (err) {
          console.error("Error processing new block:", err);
        }
      });

      setEventSubscription(unsubscribe);
    } catch (err) {
      console.error("Error subscribing to events:", err);
    }
  }, [selectedAccount?.address]);

  // Initial fetch on mount - always fetch regardless of account
  useEffect(() => {
    fetchHistoricalEvents();
  }, []); // Fetch once on mount

  // Subscribe to new events
  useEffect(() => {
    subscribeToEvents();

    return () => {
      if (eventSubscription) {
        eventSubscription();
      }
    };
  }, [subscribeToEvents]); // Re-subscribe when callback changes (which happens when account changes)

  // Re-fetch when account changes to filter activities
  useEffect(() => {
    if (selectedAccount?.address) {
      fetchHistoricalEvents();
    }
  }, [selectedAccount?.address]);

  // Filter activities
  const filteredActivities = activities.filter((activity) => {
    // Filter by type
    if (filter !== "All" && activity.type !== filter) {
      return false;
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        activity.action.toLowerCase().includes(query) ||
        activity.nftId?.toLowerCase().includes(query) ||
        activity.contractId?.toLowerCase().includes(query) ||
        activity.offerId?.toLowerCase().includes(query) ||
        activity.from?.toLowerCase().includes(query) ||
        activity.to?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  return (
    <div className="bg-[#1C1A11] flex flex-col flex-shrink-0 w-full justify-center items-center text-white min-[2000px]:w-[3000px]">
      <MaxWidthWrapper className="flex flex-col self-stretch min-[2000px]:min-h-screen pt-[120px] justify-center items-center">
        <div className="w-full flex flex-col gap-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <TypesComponent 
              text="Activity Feed" 
              className="text-[#EFF4F6] text-2xl font-bold"
            />
            <Button
              onClick={fetchHistoricalEvents}
              className="bg-[#373737] text-white hover:bg-[#FACC15] hover:text-[#1C1A11] px-4 py-2 rounded"
            >
              Refresh
            </Button>
          </div>

          {/* Filters and Search */}
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex gap-2">
              <Button
                onClick={() => setFilter("All")}
                className={`px-4 py-2 rounded ${
                  filter === "All"
                    ? "bg-[#FACC15] text-[#1C1A11]"
                    : "bg-[#373737] text-white hover:bg-[#FACC15] hover:text-[#1C1A11]"
                }`}
              >
                All
              </Button>
              <Button
                onClick={() => setFilter("Mint")}
                className={`px-4 py-2 rounded ${
                  filter === "Mint"
                    ? "bg-[#FACC15] text-[#1C1A11]"
                    : "bg-[#373737] text-white hover:bg-[#FACC15] hover:text-[#1C1A11]"
                }`}
              >
                Mints
              </Button>
              <Button
                onClick={() => setFilter("License")}
                className={`px-4 py-2 rounded ${
                  filter === "License"
                    ? "bg-[#FACC15] text-[#1C1A11]"
                    : "bg-[#373737] text-white hover:bg-[#FACC15] hover:text-[#1C1A11]"
                }`}
              >
                Licenses
              </Button>
              <Button
                onClick={() => setFilter("Purchase")}
                className={`px-4 py-2 rounded ${
                  filter === "Purchase"
                    ? "bg-[#FACC15] text-[#1C1A11]"
                    : "bg-[#373737] text-white hover:bg-[#FACC15] hover:text-[#1C1A11]"
                }`}
              >
                Purchases
              </Button>
              <Button
                onClick={() => setFilter("Payment")}
                className={`px-4 py-2 rounded ${
                  filter === "Payment"
                    ? "bg-[#FACC15] text-[#1C1A11]"
                    : "bg-[#373737] text-white hover:bg-[#FACC15] hover:text-[#1C1A11]"
                }`}
              >
                Payments
              </Button>
            </div>

            <Input
              type="text"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 max-w-md bg-[#27251C] text-white border-[#8A8A8A] focus:ring-[#FACC15]"
            />
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <p className="text-gray-400">Loading activities...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="text-center py-8">
              <p className="text-red-400">Error: {error}</p>
              <Button
                onClick={fetchHistoricalEvents}
                className="bg-[#373737] text-white hover:bg-[#FACC15] hover:text-[#1C1A11] px-4 py-2 rounded mt-4"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredActivities.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400">
                {searchQuery || filter !== "All"
                  ? "No activities match your filters."
                  : "No activities found. Activities will appear here as you interact with the blockchain."}
              </p>
            </div>
          )}

          {/* Activities List */}
          {!loading && !error && filteredActivities.length > 0 && (
            <div className="space-y-4">
              {/* Table Header */}
              <div className="grid grid-cols-6 gap-4 pb-2 border-b border-[#8A8A8A] font-bold text-[#B0B0B1]">
                <div>Type</div>
                <div>Action</div>
                <div>NFT ID</div>
                <div>From/To</div>
                <div>Block</div>
                <div>Time</div>
              </div>

              {/* Activities */}
              {filteredActivities.map((activity) => (
                <Card
                  key={activity.id}
                  className="bg-[#27251C] border-[#8A8A8A] p-4"
                >
                  <div className="grid grid-cols-6 gap-4 items-center">
                    <div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          activity.type === "Mint"
                            ? "bg-blue-500"
                            : activity.type === "License"
                            ? "bg-green-500"
                            : activity.type === "Purchase"
                            ? "bg-purple-500"
                            : activity.type === "Payment"
                            ? "bg-yellow-500"
                            : "bg-gray-500"
                        }`}
                      >
                        {formatActivityType(activity.type)}
                      </span>
                    </div>
                    <div className="text-white">{activity.action}</div>
                    <div className="text-white">
                      {activity.nftId ? `#${activity.nftId}` : "N/A"}
                    </div>
                    <div className="text-sm text-gray-400">
                      {activity.from && (
                        <div>From: {formatAddress(activity.from)}</div>
                      )}
                      {activity.to && (
                        <div>To: {formatAddress(activity.to)}</div>
                      )}
                      {!activity.from && !activity.to && "N/A"}
                    </div>
                    <div className="text-sm text-gray-400">
                      #{activity.blockNumber}
                    </div>
                    <div className="text-sm text-gray-400">
                      {activity.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  {activity.amount && (
                    <div className="mt-2 text-sm text-gray-400">
                      Amount: {activity.amount} SLAW
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </MaxWidthWrapper>
      <Footer
        width="py-[60px] max-h-[400px]"
        className="border-t-[1px] border-[#8A8A8A] w-full"
      />
    </div>
  );
}
