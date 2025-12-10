"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import WithdrawForm from "@/components/admin/withdraw/WithdrawForm";
import WithdrawConfirmModal from "@/components/admin/withdraw/WithdrawConfirmModal";
import { LoadingState } from "@/components/admin/common/SkeletonLoader";
import { useAdmin } from "@/contexts/AdminContext";
import { Wallet, CheckCircle, AlertCircle } from "lucide-react";
import { Connection, PublicKey } from "@solana/web3.js";

interface WithdrawData {
  walletAddress: string;
  amount: number; // treat as SOL
}

interface VaultBalance {
  lamports: number;
  balanceSol: number;
  balanceUsd?: number;
  priceUsdPerSol?: number;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "";

// 🔐 Fixed devnet house vault address
const HOUSE_VAULT_ADDRESS =
  "9dA2trKHwn5MY5vJEiebAgXmTKwfG56mL8ByaoC5hu8f";

// 🔗 Solana RPC (devnet by default)
const SOLANA_RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.devnet.solana.com";

const LAMPORTS_PER_SOL = 1_000_000_000;

export default function WithdrawPage() {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [withdrawData, setWithdrawData] = useState<WithdrawData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [vaultBalance, setVaultBalance] = useState<VaultBalance | null>(null);
  const [vaultLoading, setVaultLoading] = useState<boolean>(true);
  const [vaultError, setVaultError] = useState<string | null>(null);

  // auth
  const { isAuthenticated, isLoading: authLoading } = useAdmin();
  const router = useRouter();

  // redirect if not logged in
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      try {
        router.replace("/admin/login");
      } catch {}
    }
  }, [authLoading, isAuthenticated, router]);

  // -------- Helper: fetch SOL price (optional USD display) ----------
  const fetchSolPriceUsd = async (): Promise<number | null> => {
    try {
      const res = await fetch(
        "https://api.coinbase.com/v2/prices/SOL-USD/spot"
      );
      if (!res.ok) return null;
      const j = await res.json();
      const amt = Number(j?.data?.amount);
      return Number.isFinite(amt) && amt > 0 ? amt : null;
    } catch {
      return null;
    }
  };

  // -------- Fetch house vault balance from Solana devnet ----------
  const fetchVaultBalance = async () => {
    try {
      setVaultLoading(true);
      setVaultError(null);

      const connection = new Connection(SOLANA_RPC, "confirmed");
      const vaultPk = new PublicKey(HOUSE_VAULT_ADDRESS);

      const lamports = await connection.getBalance(vaultPk, "confirmed");
      const balanceSol = lamports / LAMPORTS_PER_SOL;

      // optional: USD conversion
      const price = await fetchSolPriceUsd();
      const balanceUsd =
        price != null ? Number((balanceSol * price).toFixed(2)) : undefined;

      setVaultBalance({
        lamports,
        balanceSol,
        balanceUsd,
        priceUsdPerSol: price ?? undefined,
      });
    } catch (e: any) {
      setVaultError(e?.message || "Failed to load house vault balance");
    } finally {
      setVaultLoading(false);
    }
  };

  // initial fetch + polling
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchVaultBalance().catch(() => {});

    // Poll every 30 seconds so if you top-up from CLI it auto-reflects
    const interval = window.setInterval(() => {
      fetchVaultBalance().catch(() => {});
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [isAuthenticated]);

  // Handle submit from form
  const handleWithdrawSubmit = (data: WithdrawData) => {
    setWithdrawData(data);
    setShowConfirmModal(true);
    setError(null);
  };

  // Confirm + hit backend /admin/withdraw
  const handleConfirmWithdraw = async () => {
    if (!withdrawData) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Backend expects amountSol, we treat withdrawData.amount as SOL
      const res = await fetch(`${API_BASE}/admin/withdraw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // If you protect with API key: "Authorization": `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          playerWallet: withdrawData.walletAddress,
          amountSol: withdrawData.amount,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Withdraw failed");
      }

      setSuccess(true);
      setShowConfirmModal(false);

      // 🔄 Refresh vault balance after a successful withdraw
      fetchVaultBalance().catch(() => {});

      // Reset form after delay
      setTimeout(() => {
        setSuccess(false);
        setWithdrawData(null);
      }, 3000);
    } catch (err: any) {
      setError(err?.message || "Withdraw failed");
    } finally {
      setIsProcessing(false);
    }
  };

  // While auth is being checked, show loading
  if (authLoading) {
    return (
      <div className="flex h-screen">
        <AdminSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <AdminHeader
            title="Withdraw"
            subtitle="Withdraw funds from platform"
          />
          <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="glass rounded-xl p-6 border border-soft/10">
              <LoadingState
                message="Checking authentication..."
                description="Please wait"
              />
            </div>
          </main>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect is already triggered
  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen">
      <AdminSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader
          title="Withdraw"
          subtitle="Withdraw funds from platform"
        />

        <main className="flex-1 overflow-hidden p-6">
          {/* Success Message */}
          {success && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-3 mb-4 flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <div>
                <p className="text-green-400 font-medium text-sm">
                  Withdraw Successful!
                </p>
                <p className="text-green-300/70 text-xs">
                  {withdrawData?.amount} SOL sent to{" "}
                  {withdrawData?.walletAddress.slice(0, 6)}...
                  {withdrawData?.walletAddress.slice(-4)}
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 mb-4 flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <div>
                <p className="text-red-400 font-medium text-sm">
                  Withdraw Failed
                </p>
                <p className="text-red-300/70 text-xs">{error}</p>
              </div>
            </div>
          )}

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Left Column - House Vault Info */}
            <div className="flex flex-col space-y-4">
              <div className="glass rounded-xl p-4 border border-soft/10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-soft text-sm font-medium">
                    House Vault Balance (Devnet)
                  </h3>
                  <span className="text-[10px] text-soft/60">
                    {HOUSE_VAULT_ADDRESS.slice(0, 4)}...
                    {HOUSE_VAULT_ADDRESS.slice(-4)}
                  </span>
                </div>

                <div className="bg-background/30 rounded-lg p-3 border border-soft/10 space-y-2">
                  {vaultLoading ? (
                    <p className="text-soft text-xs">Loading balance…</p>
                  ) : vaultError ? (
                    <p className="text-red-300/80 text-xs">{vaultError}</p>
                  ) : vaultBalance ? (
                    <>
                      {/* SOL row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-soft" />
                          <span className="text-soft text-sm">
                            SOL Balance
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-light font-semibold">
                            {vaultBalance.balanceSol.toFixed(4)} SOL
                          </p>
                        </div>
                      </div>

                      {/* USD row (optional) */}
                      {vaultBalance.balanceUsd != null && (
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-soft text-xs">
                            ≈ USD Value
                          </span>
                          <span className="text-soft text-xs font-medium">
                            $
                            {vaultBalance.balanceUsd.toLocaleString(
                              undefined,
                              { maximumFractionDigits: 2 }
                            )}
                          </span>
                        </div>
                      )}

                      {/* Price row */}
                      {vaultBalance.priceUsdPerSol != null && (
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-soft/70 text-[11px]">
                            1 SOL Price
                          </span>
                          <span className="text-soft/70 text-[11px]">
                            ≈ $
                            {vaultBalance.priceUsdPerSol.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-soft text-xs">
                      No balance data available.
                    </p>
                  )}
                </div>
              </div>

              {/* Security Notice */}
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-yellow-400 font-medium text-sm">
                      Important
                    </p>
                    <p className="text-yellow-300/70 text-sm mt-1">
                      Double-check the withdrawal wallet address and amount.
                      Transactions on Solana cannot be reversed.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Withdraw Form */}
            <div className="flex flex-col">
              <WithdrawForm
                onSubmit={handleWithdrawSubmit}
                disabled={isProcessing}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && withdrawData && (
        <WithdrawConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmWithdraw}
          withdrawData={withdrawData}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}
