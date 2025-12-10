"use client";

import { useState, useEffect } from "react";
import { FormModal } from "@/components/common/Modal";
import { type PayoutSettings } from "@/utils/api/adminReferralsApi";

interface PayoutSettingsModalProps {
    isOpen: boolean;
    settings: PayoutSettings | null;
    onClose: () => void;
    onSave: (settings: PayoutSettings) => void;
}

export default function PayoutSettingsModal({ isOpen, settings, onClose, onSave }: PayoutSettingsModalProps) {
    const [formData, setFormData] = useState<PayoutSettings | null>(settings);

    useEffect(() => {
        if (settings) {
            setFormData(settings);
        }
    }, [settings]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData) {
            onSave(formData);
        }
    };

    if (!formData) return null;

    return (
        <FormModal isOpen={isOpen} onClose={onClose} title="Payout Settings" size="md" onSubmit={handleSubmit} submitLabel="Save Settings">
            <div>
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.autoPayoutEnabled} onChange={(e) => setFormData((prev) => (prev ? { ...prev, autoPayoutEnabled: e.target.checked } : null))} className="rounded" />
                    <span className="text-white">Enable Automatic Payouts</span>
                </label>
            </div>

            <div>
                <label className="block text-sm text-soft mb-1">Auto Payout Threshold ($)</label>
                <input type="number" value={formData.autoPayoutThreshold} onChange={(e) => setFormData((prev) => (prev ? { ...prev, autoPayoutThreshold: parseFloat(e.target.value) } : null))} className="w-full bg-background/50 rounded-lg px-3 py-2 text-white" min="0" step="0.01" />
            </div>

            <div>
                <label className="block text-sm text-soft mb-1">Max Auto Payout Amount ($)</label>
                <input type="number" value={formData.autoPayoutMaxAmount} onChange={(e) => setFormData((prev) => (prev ? { ...prev, autoPayoutMaxAmount: parseFloat(e.target.value) } : null))} className="w-full bg-background/50 rounded-lg px-3 py-2 text-white" min="0" step="0.01" />
            </div>

            <div>
                <label className="block text-sm text-soft mb-1">Default Network</label>
                <select value={formData.defaultNetwork} onChange={(e) => setFormData((prev) => (prev ? { ...prev, defaultNetwork: e.target.value as "SOL" | "USDT" | "ETH" | "BTC" } : null))} className="w-full bg-background/50 rounded-lg px-3 py-2 text-white">
                    <option value="SOL">Solana (SOL)</option>
                    <option value="USDT">Tether (USDT)</option>
                    <option value="ETH">Ethereum (ETH)</option>
                    <option value="BTC">Bitcoin (BTC)</option>
                </select>
            </div>

            <div>
                <label className="block text-sm text-soft mb-1">Fraud Score Threshold</label>
                <input type="number" value={formData.fraudScoreThreshold} onChange={(e) => setFormData((prev) => (prev ? { ...prev, fraudScoreThreshold: parseFloat(e.target.value) } : null))} className="w-full bg-background/50 rounded-lg px-3 py-2 text-white" min="0" max="1" step="0.01" />
            </div>

            <div>
                <label className="block text-sm text-soft mb-1">Manual Review Above ($)</label>
                <input type="number" value={formData.requireManualReviewAbove} onChange={(e) => setFormData((prev) => (prev ? { ...prev, requireManualReviewAbove: parseFloat(e.target.value) } : null))} className="w-full bg-background/50 rounded-lg px-3 py-2 text-white" min="0" step="0.01" />
            </div>
        </FormModal>
    );
}
