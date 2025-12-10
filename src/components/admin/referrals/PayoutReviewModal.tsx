"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/common/Modal";
import { type PayoutRequest } from "@/utils/api/adminReferralsApi";

interface PayoutReviewModalProps {
    isOpen: boolean;
    payout: PayoutRequest | null;
    onClose: () => void;
    onApprove: (network: string, notes?: string) => void;
    onReject: (notes?: string) => void;
}

export default function PayoutReviewModal({ isOpen, payout, onClose, onApprove, onReject }: PayoutReviewModalProps) {
    const [selectedNetwork, setSelectedNetwork] = useState<"SOL" | "USDT" | "ETH" | "BTC">("SOL");
    const [notes, setNotes] = useState("");

    // Update state when payout changes
    useEffect(() => {
        if (payout) {
            setSelectedNetwork(payout.network);
            setNotes(payout.notes || "");
        }
    }, [payout]);

    if (!payout) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Review Payout Request" size="md">
            <div className="space-y-4 mb-6">
                <div>
                    <label className="block text-sm text-soft mb-1">Affiliate ID</label>
                    <div className="text-light font-medium">{payout.affiliateId}</div>
                </div>

                <div>
                    <label className="block text-sm text-soft mb-1">Amount</label>
                    <div className="text-light font-medium">${payout.amount.toFixed(2)}</div>
                </div>

                <div>
                    <label className="block text-sm text-soft mb-1">Fraud Score</label>
                    <div className={`font-medium ${payout.fraudScore > 0.7 ? "text-red-400" : payout.fraudScore > 0.3 ? "text-yellow-400" : "text-green-400"}`}>{(payout.fraudScore * 100).toFixed(1)}%</div>
                </div>

                <div>
                    <label className="block text-sm text-soft mb-1">Network</label>
                    <select value={selectedNetwork} onChange={(e) => setSelectedNetwork(e.target.value as "SOL" | "USDT" | "ETH" | "BTC")} className="w-full bg-background/50 rounded-lg px-3 py-2 text-white">
                        <option value="SOL">Solana (SOL)</option>
                        <option value="USDT">Tether (USDT)</option>
                        <option value="ETH">Ethereum (ETH)</option>
                        <option value="BTC">Bitcoin (BTC)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm text-soft mb-1">Notes</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-background/50 rounded-lg px-3 py-2 text-white resize-none" rows={3} placeholder="Add notes about this payout..." />
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button onClick={() => onApprove(selectedNetwork, notes)} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 px-4 rounded-lg transition-colors">
                    Approve
                </button>
                <button onClick={() => onReject(notes)} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 px-4 rounded-lg transition-colors">
                    Reject
                </button>
                <button onClick={onClose} className="px-4 py-2 bg-background/50 hover:bg-background/70 text-white rounded-lg transition-colors">
                    Cancel
                </button>
            </div>
        </Modal>
    );
}
