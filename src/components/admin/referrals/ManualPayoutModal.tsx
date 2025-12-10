"use client";

import { useState } from "react";
import { FormModal } from "@/components/common/Modal";

interface ManualPayoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (affiliateId: string, amount: number, network: string, notes?: string) => void;
}

export default function ManualPayoutModal({ isOpen, onClose, onCreate }: ManualPayoutModalProps) {
    const [affiliateId, setAffiliateId] = useState("");
    const [amount, setAmount] = useState("");
    const [network, setNetwork] = useState("SOL");
    const [notes, setNotes] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (affiliateId && amount) {
            onCreate(affiliateId, parseFloat(amount), network, notes);
            // Reset form after submission
            setAffiliateId("");
            setAmount("");
            setNetwork("SOL");
            setNotes("");
        }
    };

    return (
        <FormModal isOpen={isOpen} onClose={onClose} title="Create Manual Payout" size="md" onSubmit={handleSubmit} submitLabel="Create Payout">
            <div>
                <label className="block text-sm text-soft mb-1">Affiliate ID</label>
                <input type="text" value={affiliateId} onChange={(e) => setAffiliateId(e.target.value)} className="w-full bg-background/50 rounded-lg px-3 py-2 text-white" placeholder="Enter affiliate ID" required />
            </div>

            <div>
                <label className="block text-sm text-soft mb-1">Amount ($)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-background/50 rounded-lg px-3 py-2 text-white" placeholder="0.00" min="0" step="0.01" required />
            </div>

            <div>
                <label className="block text-sm text-soft mb-1">Network</label>
                <select value={network} onChange={(e) => setNetwork(e.target.value)} className="w-full bg-background/50 rounded-lg px-3 py-2 text-white">
                    <option value="SOL">Solana (SOL)</option>
                    <option value="USDT">Tether (USDT)</option>
                    <option value="ETH">Ethereum (ETH)</option>
                    <option value="BTC">Bitcoin (BTC)</option>
                </select>
            </div>

            <div>
                <label className="block text-sm text-soft mb-1">Notes (Optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-background/50 rounded-lg px-3 py-2 text-white resize-none" rows={3} placeholder="Add notes about this manual payout..." />
            </div>
        </FormModal>
    );
}
