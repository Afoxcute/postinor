"use client";

import React, { useState, useEffect } from "react";
import { getSoftlawApi } from "@/utils/softlaw/getApi";
import { Keyring } from "@polkadot/keyring";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { useAccountsContext } from "@/context/account";
import { useToast } from "@/hooks/use-toast";
import dynamic from "next/dynamic";
import type { ISubmittableResult } from "@polkadot/types/types";

const NavBar = dynamic(() => import("@/components/NavBar"), {
  ssr: false,
});

interface FaucetStatus {
  status: "idle" | "checking" | "sending" | "success" | "error";
  message?: string;
  txHash?: string;
}

export default function FaucetPage() {
  const { selectedAccount } = useAccountsContext();
  const { toast } = useToast();
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState<string | null>(null);
  const [faucetStatus, setFaucetStatus] = useState<FaucetStatus>({
    status: "idle",
  });
  const [isLoading, setIsLoading] = useState(false);

  // Use connected wallet address if available
  useEffect(() => {
    if (selectedAccount?.address) {
      setAddress(selectedAccount.address);
      checkBalance(selectedAccount.address);
    }
  }, [selectedAccount]);

  const checkBalance = async (addr: string) => {
    if (!addr) return;
    try {
      const api = await getSoftlawApi();
      const accountInfo = await api.query.system.account(addr);
      // Access the balance using proper type casting
      const accountData = accountInfo as unknown as {
        data: { free: { toString: () => string } };
      };
      const bal = accountData.data.free;
      const decimals = api.registry.chainDecimals[0] || 12;
      const balanceFormatted = (Number(bal.toString()) / Math.pow(10, decimals)).toFixed(4);
      setBalance(balanceFormatted);
    } catch (error) {
      console.error("Error checking balance:", error);
      setBalance("Error");
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const addr = e.target.value;
    setAddress(addr);
    if (addr) {
      checkBalance(addr);
    } else {
      setBalance(null);
    }
  };

  const claimTokens = async () => {
    if (!address) {
      toast({
        title: "Error",
        description: "Please enter an address or connect your wallet",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setFaucetStatus({ status: "sending", message: "Preparing transaction..." });

    try {
      // Wait for crypto to be ready
      await cryptoWaitReady();

      // Create keyring and add Alice account
      const keyring = new Keyring({ type: "sr25519" });
      const alice = keyring.addFromUri("//Alice");

      // Get API
      const api = await getSoftlawApi();
      await api.isReady;

      // Amount to send: 1000 tokens (adjust as needed)
      const decimals = api.registry.chainDecimals[0] || 12;
      const amount = BigInt(1000 * Math.pow(10, decimals));

      setFaucetStatus({ status: "sending", message: "Sending tokens..." });

      // Create and send transaction
      // Access balances transfer - the runtime uses new macro system
      const balancesPallet = (api.tx as any).balances;
      
      if (!balancesPallet) {
        const availablePallets = Object.keys(api.tx || {}).join(", ");
        throw new Error(
          `Balances pallet not found in API. Available pallets: ${availablePallets || "none"}. ` +
          `The chain might not have the balances pallet exposed, or the API needs to be reconnected.`
        );
      }

      let tx;
      if (typeof balancesPallet.transfer === 'function') {
        tx = balancesPallet.transfer(address, amount);
      } else if (typeof balancesPallet.transferKeepAlive === 'function') {
        tx = balancesPallet.transferKeepAlive(address, amount);
      } else {
        const availableMethods = Object.keys(balancesPallet).join(", ");
        throw new Error(
          `Transfer method not found in balances pallet. Available methods: ${availableMethods || "none"}`
        );
      }

      await tx.signAndSend(alice, ({ status, events, dispatchError }: ISubmittableResult) => {
        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            const { name, docs } = decoded;
            const errorMsg = `${name}: ${docs.join(" ")}`;
            setFaucetStatus({
              status: "error",
              message: errorMsg,
            });
            toast({
              title: "Transaction Failed",
              description: errorMsg,
              variant: "destructive",
            });
          } else {
            const errorMsg = dispatchError.toString();
            setFaucetStatus({
              status: "error",
              message: errorMsg,
            });
            toast({
              title: "Transaction Failed",
              description: errorMsg,
              variant: "destructive",
            });
          }
          setIsLoading(false);
          return;
        }

        if (status.isInBlock || status.isFinalized) {
          const blockHash = status.isInBlock
            ? status.asInBlock.toString()
            : status.asFinalized.toString();

          setFaucetStatus({
            status: "success",
            message: `Tokens sent successfully!`,
            txHash: blockHash,
          });

          toast({
            title: "Success!",
            description: "1000 SLAW tokens have been sent to your address",
            className: "bg-[#252525] text-white border-[#373737]",
          });

          // Refresh balance
          setTimeout(() => {
            checkBalance(address);
          }, 2000);

          setIsLoading(false);
        }
      });
    } catch (error) {
      console.error("Faucet error:", error);
      const errorMsg =
        error instanceof Error ? error.message : "Failed to send tokens";
      setFaucetStatus({
        status: "error",
        message: errorMsg,
      });
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  return (
    <div className="min-h-screen bg-[#1C1A11] text-white">
      <NavBar />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="bg-[#252525] rounded-lg border border-[#373737] p-8">
            <h1 className="text-3xl font-bold mb-2">Softlaw Chain Faucet</h1>
            <p className="text-gray-400 mb-8">
              Get test tokens for the Softlaw Chain local testnet
            </p>

            {/* Address Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Recipient Address
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={address}
                  onChange={handleAddressChange}
                  placeholder="Enter your address or connect wallet"
                  className="flex-1 bg-[#1C1A11] border border-[#373737] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  disabled={isLoading}
                />
                {selectedAccount && (
                  <button
                    onClick={() => {
                      setAddress(selectedAccount.address);
                      checkBalance(selectedAccount.address);
                    }}
                    className="px-4 py-3 bg-[#373737] hover:bg-[#4a4a4a] rounded-lg transition-colors"
                    disabled={isLoading}
                  >
                    Use Wallet
                  </button>
                )}
              </div>
              {address && (
                <p className="text-sm text-gray-400 mt-2">
                  Address: {formatAddress(address)}
                </p>
              )}
            </div>

            {/* Balance Display */}
            {balance !== null && (
              <div className="mb-6 p-4 bg-[#1C1A11] rounded-lg border border-[#373737]">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Current Balance:</span>
                  <span className="text-xl font-bold text-yellow-500">
                    {balance} SLAW
                  </span>
                </div>
              </div>
            )}

            {/* Claim Button */}
            <button
              onClick={claimTokens}
              disabled={!address || isLoading}
              className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-bold py-4 px-6 rounded-lg transition-colors mb-6"
            >
              {isLoading ? "Processing..." : "Claim 1000 SLAW Tokens"}
            </button>

            {/* Status Display */}
            {faucetStatus.status !== "idle" && (
              <div
                className={`p-4 rounded-lg border ${
                  faucetStatus.status === "success"
                    ? "bg-green-900/30 border-green-500"
                    : faucetStatus.status === "error"
                    ? "bg-red-900/30 border-red-500"
                    : "bg-blue-900/30 border-blue-500"
                }`}
              >
                <p className="font-medium mb-2">
                  {faucetStatus.status === "success" && "✓ Success"}
                  {faucetStatus.status === "error" && "✗ Error"}
                  {faucetStatus.status === "sending" && "⏳ Processing"}
                </p>
                <p className="text-sm">{faucetStatus.message}</p>
                {faucetStatus.txHash && (
                  <p className="text-xs text-gray-400 mt-2">
                    Transaction Hash: {formatAddress(faucetStatus.txHash)}
                  </p>
                )}
              </div>
            )}

            {/* Info Section */}
            <div className="mt-8 pt-6 border-t border-[#373737]">
              <h2 className="text-lg font-semibold mb-4">Faucet Information</h2>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• Amount per claim: 1000 SLAW tokens</li>
                <li>• Network: Local Softlaw Chain Testnet</li>
                <li>• Token Symbol: SLAW</li>
                <li>• Decimals: 12</li>
                <li>• Source: //Alice dev account</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

