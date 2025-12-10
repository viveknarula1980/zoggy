"use client";

import { useEffect, useMemo, useState } from "react";
import { User, UsersApiService } from "@/utils/api/usersApi";
import { solToUsd } from "@/utils/currency";

interface BalanceManagementProps {
  user: User;
  onBalanceUpdate: (newBalance: number) => void;
  updating: boolean;
  setUpdating: (updating: boolean) => void;
}

type FakeStatus = {
  wallet: string;
  isFake: boolean;
  mode: "fake" | "real";
  promoBalanceLamports: number;
  promoBalanceSol: number;
  effectiveBalanceLamports: number;
  effectiveBalanceSol: number;
  frozenLamports: number;
  frozenSol: number;
  withdrawalsEnabled: boolean;
};

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

export default function BalanceManagement({
  user,
  onBalanceUpdate,
  updating,
  setUpdating,
}: BalanceManagementProps) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [actionType, setActionType] = useState<"add" | "subtract">("add");

  // ---- fetched balances ----
  const [fake, setFake] = useState<FakeStatus | null>(null);
  const [pdaUsd, setPdaUsd] = useState<number>(Number(user?.pdaBalance ?? 0)); // fallback to prop

  // try to derive a wallet address from user
  const walletAddr =
    (user as any)?.wallet ||
    (user as any)?.publicKey ||
    (user as any)?.address ||
    (user as any)?.walletAddress ||
    "";

  const formatBalance = (balance: number) => {
    return `$${Number(balance || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Effective current balance (UI shows one number):
  // - If fake mode active and we have fake status, show effective fake balance (converted to USD)
  // - Else show real (PDA) USD
  const currentBalanceUsd = useMemo(() => {
    if (fake && fake.isFake) {
      const sol = Number(fake.effectiveBalanceSol ?? fake.promoBalanceSol ?? 0);
      return solToUsd ? Number(solToUsd(sol)) : Number(user?.pdaBalance ?? 0);
    }
    return pdaUsd;
  }, [fake, pdaUsd, user?.pdaBalance]);

  // -------- fetchers ----------
  const fetchFakeStatus = async () => {
    if (!walletAddr) return;
    const url = `${API_BASE}/admin/fake/status?wallet=${encodeURIComponent(String(walletAddr))}`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch fake status");
    const data = (await res.json()) as FakeStatus;
    setFake(data);
  };

  // If you have a dedicated real/PDA balance endpoint, wire it here.
  // Otherwise we keep the prop value as canonical USD.
  const fetchRealBalanceUsd = async () => {
    try {
      // Example (commented): adjust if you actually expose a PDA status endpoint
      // const res = await fetch(`${API_BASE}/admin/pda/status?wallet=${encodeURIComponent(walletAddr)}`, { credentials: "include" });
      // if (res.ok) {
      //   const data = await res.json();
      //   // if it returns SOL -> convert to USD with your helper
      //   // setPdaUsd(data.balanceUsd ?? solToUsd(data.balanceSol));
      //   return;
      // }
    } catch {
      /* ignore */
    }
    setPdaUsd(Number(user?.pdaBalance ?? 0));
  };

  const refreshBalances = async () => {
    try {
      await Promise.all([fetchFakeStatus(), fetchRealBalanceUsd()]);
    } catch (e) {
      console.error("Balance refresh failed", e);
      // still keep whatever we had
    }
  };

  useEffect(() => {
    refreshBalances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, walletAddr]);

  const handleBalanceAdjustment = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    if (!reason.trim()) {
      alert("Please provide a reason for this balance adjustment");
      return;
    }

    try {
      setUpdating(true);
      const adjustmentAmount = Number(amount);

      // IMPORTANT: we are adjusting FAKE balance, keep same UI & just add mode="promo"
      await UsersApiService.adjustUserBalance(
        user.id,
        adjustmentAmount,
        actionType,
        reason
      );

      // For compatibility with parent (it expects a new number):
      // Keep same behavior but it only affects fake balance; we'll immediately refresh real/fake after.
      const newBalance =
        actionType === "add"
          ? Number(user.pdaBalance) + adjustmentAmount
          : Number(user.pdaBalance) - adjustmentAmount;

      onBalanceUpdate(Number(newBalance.toFixed(2)));

      // Reset form
      setAmount("");
      setReason("");
      setShowForm(false);

      alert(
        `Successfully ${
          actionType === "add" ? "added" : "subtracted"
        } ${formatBalance(adjustmentAmount)} ${
          actionType === "add" ? "to" : "from"
        } user balance`
      );

      // Pull canonical values (ensures Current Balance reflects the true fake/effective balance)
      await refreshBalances();
    } catch (error: any) {
      console.error("Error adjusting balance:", error);
      alert(error?.message || "Failed to adjust user balance");
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => {
    setAmount("");
    setReason("");
    setShowForm(false);
  };

  return (
    <div className="glass rounded-xl p-6 border border-soft/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Balance Management</h3>
        <div className="text-sm text-soft">
          Current Balance:{" "}
          <span className="text-white font-bold">
            {formatBalance(currentBalanceUsd)}
          </span>
        </div>
      </div>

      {!showForm ? (
        <div className="flex gap-3">
          <button
            onClick={() => {
              setActionType("add");
              setShowForm(true);
            }}
            disabled={updating}
            className="flex-1 px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            Add Fake Balance
          </button>
          <button
            onClick={() => {
              setActionType("subtract");
              setShowForm(true);
            }}
            disabled={updating}
            className="flex-1 px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            Subtract Fake Balance
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                actionType === "add"
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}
            >
              {actionType === "add" ? "Adding Balance" : "Subtracting Balance"}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-soft mb-2">
              Amount (USD)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full px-3 py-2 bg-card/20 border border-soft/20 rounded-lg text-white placeholder-soft/50 focus:outline-none focus:border-neon-pink/50 focus:ring-1 focus:ring-neon-pink/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-soft mb-2">
              Reason for Adjustment
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for balance adjustment..."
              rows={3}
              className="w-full px-3 py-2 bg-card/20 border border-soft/20 rounded-lg text-white placeholder-soft/50 focus:outline-none focus:border-neon-pink/50 focus:ring-1 focus:ring-neon-pink/50 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleBalanceAdjustment}
              disabled={updating || !amount || !reason.trim()}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                actionType === "add"
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            >
              {updating
                ? "Processing..."
                : `${actionType === "add" ? "Add" : "Subtract"} ${
                    amount ? formatBalance(Number(amount)) : "$0.00"
                  }`}
            </button>
            <button
              onClick={handleCancel}
              disabled={updating}
              className="px-4 py-2 bg-gray-500/20 border border-gray-500/30 text-gray-400 rounded-lg hover:bg-gray-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
