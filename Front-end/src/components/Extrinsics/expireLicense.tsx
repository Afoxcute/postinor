"use client";

import { useState } from "react";
import { useAccountsContext } from "@/context/account";
import { getSoftlawApi } from "@/utils/softlaw/getApi";
import { web3Enable, web3FromAddress } from "@polkadot/extension-dapp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";

export default function ExpireLicense() {
  const { selectedAccount } = useAccountsContext();
  const [contractId, setContractId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleExpireLicense = async () => {
    if (!selectedAccount?.address) {
      setError("Please connect your wallet first");
      return;
    }

    if (!contractId || isNaN(Number(contractId))) {
      setError("Please enter a valid contract ID");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const api = await getSoftlawApi();
      await web3Enable("softlaw");

      const injector = await web3FromAddress(selectedAccount.address);
      api.setSigner(injector.signer);

      const unsub = await api.tx.ipPallet
        .expireLicense(Number(contractId))
        .signAndSend(selectedAccount.address, ({ status, events }) => {
          if (status.isInBlock) {
            console.log(`Transaction included in block: ${status.asInBlock}`);
          }
          if (status.isFinalized) {
            console.log(`Transaction finalized at block: ${status.asFinalized}`);
            
            let hasError = false;
            events.forEach(({ event }) => {
              if (event.method === "ExtrinsicSuccess") {
                setSuccess(`License expired successfully! Transaction finalized at block ${status.asFinalized}`);
                setContractId("");
              } else if (event.method === "ExtrinsicFailed") {
                hasError = true;
                const dispatchError = event.data[0];
                if ((dispatchError as any).isModule) {
                  const decoded = api.registry.findMetaError((dispatchError as any).asModule);
                  setError(`${decoded.section}.${decoded.name}: ${decoded.docs.join(" ")}`);
                } else {
                  setError("Transaction failed");
                }
              }
            });
            
            if (!hasError && events.length === 0) {
              setSuccess(`License expired successfully! Transaction finalized at block ${status.asFinalized}`);
              setContractId("");
            }
            
            unsub();
            setLoading(false);
          }
        });
    } catch (err: any) {
      console.error("Error expiring license:", err);
      setError(err.message || "Failed to expire license");
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-[#1C1A11] border-[#FACC15]/20">
      <CardHeader>
        <CardTitle className="text-[#FACC15] text-2xl">Expire License</CardTitle>
        <CardDescription className="text-gray-400">
          Expire a license contract after its duration has ended. This will clean up the contract
          and remove it from active licenses.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!selectedAccount && (
          <Alert className="bg-yellow-500/10 border-yellow-500/50">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-200">
              Please connect your wallet to expire a license.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="contractId" className="text-white">
            Contract ID
          </Label>
          <Input
            id="contractId"
            type="number"
            placeholder="Enter the license contract ID"
            value={contractId}
            onChange={(e) => setContractId(e.target.value)}
            className="bg-[#2A2718] border-[#FACC15]/30 text-white placeholder:text-gray-500"
          />
          <p className="text-sm text-gray-500">
            The contract ID can be found in your active licenses or from the contract creation event.
          </p>
        </div>

        {error && (
          <Alert className="bg-red-500/10 border-red-500/50">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-200">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-500/10 border-green-500/50">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-200">{success}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleExpireLicense}
          disabled={loading || !selectedAccount || !contractId}
          className="w-full bg-[#FACC15] hover:bg-[#FACC15]/90 text-black font-semibold"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Expire License"
          )}
        </Button>

        <div className="text-sm text-gray-400 space-y-2">
          <p className="font-semibold text-[#FACC15]">Requirements:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>The license contract must exist</li>
            <li>The license duration must have expired (current block ≥ start block + duration)</li>
            <li>Any account can call this function (permissionless after expiry)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}