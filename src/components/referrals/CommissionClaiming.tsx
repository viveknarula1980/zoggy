"use client";

import { useState, useEffect, useMemo } from "react";
import { Wallet, Clock, CheckCircle, AlertCircle, Loader2, DollarSign } from "lucide-react";
import {
  getUnclaimedCommission,
  claimCommission,
  type UnclaimedCommission,
  type ClaimCommissionResponse,
} from "@/utils/api/referralsApi";
import { useWallet } from "@solana/wallet-adapter-react";

export default function CommissionClaiming() {
  const { publicKey, connected } = useWallet();
  const walletAddress = useMemo(() => publicKey?.toBase58() ?? "", [publicKey]);

  const [unclaimedData, setUnclaimedData] = useState<UnclaimedCommission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimCommissionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // load when wallet changes
  useEffect(() => {
    if (!walletAddress) {
      setUnclaimedData(null);
      setIsLoading(false);
      return;
    }
    void loadUnclaimedCommission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  const loadUnclaimedCommission = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getUnclaimedCommission();
      setUnclaimedData(data);
    } catch (err) {
      console.error("Failed to fetch unclaimed bonus:", err);
      setError("Failed to load bonus data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimCommission = async () => {
    if (!unclaimedData?.canClaim || isClaiming) return;

    try {
      setIsClaiming(true);
      setError(null);
      setClaimResult(null);

      const result = await claimCommission();
      setClaimResult(result);

      if (result.success) {
        // Refresh unclaimed data after successful request
        await loadUnclaimedCommission();
      }
    } catch (err) {
      console.error("Failed to claim commission:", err);
      setError("Failed to request claim. Please try again.");
    } finally {
      setIsClaiming(false);
    }
  };

  const formatLastUpdated = (dateString?: string) => {
    if (!dateString) return "Recently";
    try {
      const date = new Date(dateString);
      return (
        date.toLocaleDateString() +
        " at " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    } catch {
      return "Recently";
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-soft/20 rounded mb-4 w-48"></div>
          <div className="space-y-4">
            <div className="h-20 bg-soft/20 rounded-xl"></div>
            <div className="h-12 bg-soft/20 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  // Not connected
  if (!connected || !walletAddress) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Wallet className="text-yellow-400" size={24} />
          <h3 className="text-xl font-bold text-white">Connect your wallet</h3>
        </div>
        <p className="text-soft">
          Please connect your wallet to view and request your referral bonus payout.
        </p>
      </div>
    );
  }

  const amount = unclaimedData?.amount ?? 0;
  const minimum = unclaimedData?.minimum ?? 0;
  const meetsThreshold = amount > 0 && amount >= minimum;

  const now = Date.now();
  const nextAt = unclaimedData?.nextEligibleAt ? new Date(unclaimedData.nextEligibleAt).getTime() : 0;
  const timeGateOpen = !nextAt || now >= nextAt;

  const canClaim = Boolean(unclaimedData?.canClaim) && meetsThreshold && timeGateOpen && !isClaiming;

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <DollarSign className="text-green-400" size={24} />
        <h3 className="text-xl font-bold text-white">Request Referral Bonus Payout</h3>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
          <AlertCircle className="text-red-400" size={20} />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {claimResult && (
        <div
          className={`mb-4 p-4 rounded-xl flex items-center gap-3 ${
            claimResult.success
              ? "bg-green-500/10 border border-green-500/20"
              : "bg-red-500/10 border border-red-500/20"
          }`}
        >
          {claimResult.success ? (
            <CheckCircle className="text-green-400" size={20} />
          ) : (
            <AlertCircle className="text-red-400" size={20} />
          )}
          <div>
            <p className={claimResult.success ? "text-green-400" : "text-red-400"}>
              {claimResult.success
                ? `Request submitted for $${claimResult.claimedAmount.toFixed(2)}`
                : "Failed to request payout"}
            </p>
            {claimResult.message && (
              <p className="text-soft text-sm mt-1">{claimResult.message}</p>
            )}
            {claimResult.transactionId && (
              <p className="text-soft text-sm mt-1">
                Reference: {claimResult.transactionId}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Available Amount */}
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold text-white mb-1">
                Available Referral Bonus
              </h4>
              <p className="text-soft text-sm">
                Request will be sent to admin; once approved, funds are credited to your PDA.
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-400">
                ${amount.toFixed(2)}
              </div>
              {minimum > 0 && amount < minimum && (
                <p className="text-xs text-soft mt-1">
                  Minimum to request: ${minimum.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {(unclaimedData?.lastUpdated || unclaimedData?.nextEligibleAt) && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-soft text-sm mt-2">
              {unclaimedData?.lastUpdated && (
                <div className="flex items-center gap-2">
                  <Clock size={14} />
                  <span>Last updated: {formatLastUpdated(unclaimedData.lastUpdated)}</span>
                </div>
              )}
              {unclaimedData?.nextEligibleAt && !timeGateOpen && (
                <div className="flex items-center gap-2">
                  <Clock size={14} />
                  <span>
                    Next eligible: {formatLastUpdated(unclaimedData.nextEligibleAt)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Request button */}
        <div className="space-y-4">
          <button
            onClick={handleClaimCommission}
            disabled={!canClaim}
            className={`w-full py-2 px-4 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-3 ${
              canClaim
                ? "bg-green-500/20 hover:bg-green-500/30 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                : "bg-gray-600 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isClaiming ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Submitting Request...
              </>
            ) : (
              <>Request payout</>
            )}
          </button>

          {/* Status helper copy */}
          {!unclaimedData?.canClaim && (
            <div className="text-center text-soft text-sm">
                         </div>
          )}
          {unclaimedData?.canClaim && !meetsThreshold && (
            <div className="text-center text-soft text-sm">
              You haven’t reached the minimum request amount yet.
            </div>
          )}
          {unclaimedData?.canClaim && meetsThreshold && !timeGateOpen && (
            <div className="text-center text-soft text-sm">
              You’ll be eligible to request again soon.
            </div>
          )}
          {unclaimedData?.canClaim && meetsThreshold && timeGateOpen && amount <= 0 && (
            <div className="text-center text-soft text-sm">
              No available balance to request at this time.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
