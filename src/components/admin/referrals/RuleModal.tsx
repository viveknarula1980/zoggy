"use client";

import { useState } from "react";
import { Settings, TrendingUp, Gift, Shield, Trash2 } from "lucide-react";
import { type CommissionRule, type AdminAffiliate } from "@/utils/api/adminReferralsApi";

interface RuleModalProps {
    rule: CommissionRule | Omit<CommissionRule, "id">;
    affiliates: AdminAffiliate[];
    isEditing: boolean;
    onSave: (rule: any) => void;
    onCancel: () => void;
}

export default function RuleModal({ rule, affiliates, isEditing, onSave, onCancel }: RuleModalProps) {
    const [formData, setFormData] = useState(rule);
    const [activeTab, setActiveTab] = useState<"basic" | "tiers" | "bonuses" | "restrictions">("basic");

    const handleSave = () => {
        onSave(formData);
    };

    const addTier = () => {
        setFormData({
            ...formData,
            tierBasedRates: {
                ...formData.tierBasedRates,
                tiers: [...formData.tierBasedRates.tiers, { minVolume: 0, commissionRate: 5, bonusMultiplier: 1 }],
            },
        });
    };

    const removeTier = (index: number) => {
        setFormData({
            ...formData,
            tierBasedRates: {
                ...formData.tierBasedRates,
                tiers: formData.tierBasedRates.tiers.filter((_, i) => i !== index),
            },
        });
    };

    const addMilestone = () => {
        setFormData({
            ...formData,
            bonusTriggers: {
                ...formData.bonusTriggers,
                volumeMilestoneBonus: [...formData.bonusTriggers.volumeMilestoneBonus, { volume: 1000, bonus: 50 }],
            },
        });
    };

    const removeMilestone = (index: number) => {
        setFormData({
            ...formData,
            bonusTriggers: {
                ...formData.bonusTriggers,
                volumeMilestoneBonus: formData.bonusTriggers.volumeMilestoneBonus.filter((_, i) => i !== index),
            },
        });
    };

    return (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-background-secondary rounded-xl w-full max-w-4xl h-[600px] overflow-y-auto custom-scrollbar">
                <div className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-6">{isEditing ? "Edit Commission Rule" : "Create Commission Rule"}</h3>

                    {/* Tabs */}
                    <div className="flex space-x-1 mb-6 bg-glass-dark rounded-lg p-1">
                        {[
                            { id: "basic", label: "Basic Settings", icon: Settings },
                            { id: "tiers", label: "Tier-based Rates", icon: TrendingUp },
                            { id: "bonuses", label: "Bonus Triggers", icon: Gift },
                            { id: "restrictions", label: "Restrictions", icon: Shield },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-neon-pink text-white" : "text-gray-400 hover:text-white hover:bg-white/10"}`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="space-y-6">
                        {activeTab === "basic" && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-white text-sm font-medium mb-2">Rule Name</label>
                                        <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-background/50 rounded-lg px-3 py-2 text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-white text-sm font-medium mb-2">Game Type</label>
                                        <select value={formData.gameType} onChange={(e) => setFormData({ ...formData, gameType: e.target.value as any })} className="w-full bg-background/50 rounded-lg px-3 py-2 text-white">
                                            <option value="all">All Games</option>
                                            <option value="crash">Crash</option>
                                            <option value="slots">Slots</option>
                                            <option value="mines">Mines</option>
                                            <option value="dice">Dice</option>
                                            <option value="plinko">Plinko</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-white text-sm font-medium mb-2">Base Commission Rate (%)</label>
                                        <input type="number" step="0.1" value={formData.commissionRate} onChange={(e) => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) || 0 })} className="w-full bg-background/50 rounded-lg px-3 py-2 text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-white text-sm font-medium mb-2">Base Rakeback (%)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.rakebackIncentives.baseRakeback}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    rakebackIncentives: {
                                                        ...formData.rakebackIncentives,
                                                        baseRakeback: parseFloat(e.target.value) || 0,
                                                    },
                                                })
                                            }
                                            className="w-full bg-background/50 rounded-lg px-3 py-2 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-white text-sm font-medium mb-2">Referral Bonus (%)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.rakebackIncentives.referralBonus}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    rakebackIncentives: {
                                                        ...formData.rakebackIncentives,
                                                        referralBonus: parseFloat(e.target.value) || 0,
                                                    },
                                                })
                                            }
                                            className="w-full bg-background/50 rounded-lg px-3 py-2 text-white"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" id="isGlobal" checked={formData.isGlobal} onChange={(e) => setFormData({ ...formData, isGlobal: e.target.checked })} className="w-4 h-4 text-neon-pink bg-glass-dark border-white/10 rounded focus:ring-neon-pink" />
                                        <label htmlFor="isGlobal" className="text-white text-sm font-medium">
                                            Apply globally to all affiliates
                                        </label>
                                    </div>

                                    {!formData.isGlobal && (
                                        <div>
                                            <label className="block text-white text-sm font-medium mb-2">Select Affiliates</label>
                                            <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-2 bg-glass-dark rounded-lg p-3">
                                                {affiliates.map((affiliate) => (
                                                    <div key={affiliate.id} className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            id={`affiliate-${affiliate.id}`}
                                                            checked={formData.affiliateIds.includes(affiliate.affiliateId)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setFormData({
                                                                        ...formData,
                                                                        affiliateIds: [...formData.affiliateIds, affiliate.affiliateId],
                                                                    });
                                                                } else {
                                                                    setFormData({
                                                                        ...formData,
                                                                        affiliateIds: formData.affiliateIds.filter((id) => id !== affiliate.affiliateId),
                                                                    });
                                                                }
                                                            }}
                                                            className="w-4 h-4 text-neon-pink bg-background/50 rounded focus:ring-neon-pink"
                                                        />
                                                        <label htmlFor={`affiliate-${affiliate.id}`} className="text-white text-sm">
                                                            {affiliate.affiliateId} ({affiliate.walletAddress.slice(0, 8)}...)
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === "tiers" && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 mb-4">
                                    <input
                                        type="checkbox"
                                        id="tierEnabled"
                                        checked={formData.tierBasedRates.enabled}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                tierBasedRates: { ...formData.tierBasedRates, enabled: e.target.checked },
                                            })
                                        }
                                        className="w-4 h-4 text-neon-pink bg-background/50 rounded focus:ring-neon-pink"
                                    />
                                    <label htmlFor="tierEnabled" className="text-white text-sm font-medium">
                                        Enable tier-based commission rates
                                    </label>
                                </div>

                                {formData.tierBasedRates.enabled && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-white font-medium">Commission Tiers</h4>
                                            <button onClick={addTier} className="px-3 py-1 bg-neon-pink hover:bg-neon-pink/80 text-white rounded text-sm transition-colors">
                                                Add Tier
                                            </button>
                                        </div>

                                        {formData.tierBasedRates.tiers.map((tier, index) => (
                                            <div key={index} className="bg-background/50 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h5 className="text-white font-medium">Tier {index + 1}</h5>
                                                    <button onClick={() => removeTier(index)} className="text-red-400 hover:text-red-300 transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div>
                                                        <label className="block text-gray-400 text-xs mb-1">Min Volume ($)</label>
                                                        <input
                                                            type="number"
                                                            value={tier.minVolume}
                                                            onChange={(e) => {
                                                                const newTiers = [...formData.tierBasedRates.tiers];
                                                                newTiers[index].minVolume = parseFloat(e.target.value) || 0;
                                                                setFormData({
                                                                    ...formData,
                                                                    tierBasedRates: { ...formData.tierBasedRates, tiers: newTiers },
                                                                });
                                                            }}
                                                            className="w-full bg-background-secondary/50 rounded px-2 py-1 text-white text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-soft text-xs mb-1">Commission Rate (%)</label>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={tier.commissionRate}
                                                            onChange={(e) => {
                                                                const newTiers = [...formData.tierBasedRates.tiers];
                                                                newTiers[index].commissionRate = parseFloat(e.target.value) || 0;
                                                                setFormData({
                                                                    ...formData,
                                                                    tierBasedRates: { ...formData.tierBasedRates, tiers: newTiers },
                                                                });
                                                            }}
                                                            className="w-full bg-background-secondary/50 rounded px-2 py-1 text-white text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-soft text-xs mb-1">Bonus Multiplier</label>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={tier.bonusMultiplier}
                                                            onChange={(e) => {
                                                                const newTiers = [...formData.tierBasedRates.tiers];
                                                                newTiers[index].bonusMultiplier = parseFloat(e.target.value) || 1;
                                                                setFormData({
                                                                    ...formData,
                                                                    tierBasedRates: { ...formData.tierBasedRates, tiers: newTiers },
                                                                });
                                                            }}
                                                            className="w-full bg-background-secondary/50 rounded px-2 py-1 text-white text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === "bonuses" && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-white text-sm font-medium mb-2">First Deposit Bonus ($)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.bonusTriggers.firstDepositBonus}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    bonusTriggers: {
                                                        ...formData.bonusTriggers,
                                                        firstDepositBonus: parseFloat(e.target.value) || 0,
                                                    },
                                                })
                                            }
                                            className="w-full bg-background/50 rounded-lg px-3 py-2 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-white text-sm font-medium mb-2">Minimum Deposit ($)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.bonusTriggers.minimumDepositAmount}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    bonusTriggers: {
                                                        ...formData.bonusTriggers,
                                                        minimumDepositAmount: parseFloat(e.target.value) || 0,
                                                    },
                                                })
                                            }
                                            className="w-full bg-background/50 rounded-lg px-3 py-2 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-white text-sm font-medium mb-2">Recurring Deposit Bonus ($)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.bonusTriggers.recurringDepositBonus}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    bonusTriggers: {
                                                        ...formData.bonusTriggers,
                                                        recurringDepositBonus: parseFloat(e.target.value) || 0,
                                                    },
                                                })
                                            }
                                            className="w-full bg-background/50 rounded-lg px-3 py-2 text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-white font-medium">Volume Milestone Bonuses</h4>
                                        <button onClick={addMilestone} className="px-3 py-1 bg-neon-pink hover:bg-neon-pink/80 text-white rounded text-sm transition-colors">
                                            Add Milestone
                                        </button>
                                    </div>

                                    {formData.bonusTriggers.volumeMilestoneBonus.map((milestone, index) => (
                                        <div key={index} className="bg-background/50 rounded-lg p-4 mb-3">
                                            <div className="flex items-center justify-between mb-3">
                                                <h5 className="text-white font-medium">Milestone {index + 1}</h5>
                                                <button onClick={() => removeMilestone(index)} className="text-red-400 hover:text-red-300 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-soft text-xs mb-1">Volume Required ($)</label>
                                                    <input
                                                        type="number"
                                                        value={milestone.volume}
                                                        onChange={(e) => {
                                                            const newMilestones = [...formData.bonusTriggers.volumeMilestoneBonus];
                                                            newMilestones[index].volume = parseFloat(e.target.value) || 0;
                                                            setFormData({
                                                                ...formData,
                                                                bonusTriggers: {
                                                                    ...formData.bonusTriggers,
                                                                    volumeMilestoneBonus: newMilestones,
                                                                },
                                                            });
                                                        }}
                                                        className="w-full bg-background-secondary/50 rounded px-2 py-1 text-white text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-soft text-xs mb-1">Bonus Amount ($)</label>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        value={milestone.bonus}
                                                        onChange={(e) => {
                                                            const newMilestones = [...formData.bonusTriggers.volumeMilestoneBonus];
                                                            newMilestones[index].bonus = parseFloat(e.target.value) || 0;
                                                            setFormData({
                                                                ...formData,
                                                                bonusTriggers: {
                                                                    ...formData.bonusTriggers,
                                                                    volumeMilestoneBonus: newMilestones,
                                                                },
                                                            });
                                                        }}
                                                        className="w-full bg-background-secondary/50 rounded px-2 py-1 text-white text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === "restrictions" && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-white text-sm font-medium mb-2">Minimum Bet Amount ($)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.restrictions.minimumBetAmount}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    restrictions: {
                                                        ...formData.restrictions,
                                                        minimumBetAmount: parseFloat(e.target.value) || 0,
                                                    },
                                                })
                                            }
                                            className="w-full bg-background-secondary/50 rounded-lg px-3 py-2 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-white text-sm font-medium mb-2">Max Commission Per Month ($)</label>
                                        <input
                                            type="number"
                                            value={formData.restrictions.maxCommissionPerMonth}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    restrictions: {
                                                        ...formData.restrictions,
                                                        maxCommissionPerMonth: parseFloat(e.target.value) || 0,
                                                    },
                                                })
                                            }
                                            className="w-full bg-glass-dark border border-white/10 rounded-lg px-3 py-2 text-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-white text-sm font-medium mb-2">Start Date</label>
                                        <input
                                            type="date"
                                            value={formData.validityPeriod.startDate}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    validityPeriod: {
                                                        ...formData.validityPeriod,
                                                        startDate: e.target.value,
                                                    },
                                                })
                                            }
                                            className="w-full bg-glass-dark border border-white/10 rounded-lg px-3 py-2 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-white text-sm font-medium mb-2">End Date (Optional)</label>
                                        <input
                                            type="date"
                                            value={formData.validityPeriod.endDate || ""}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    validityPeriod: {
                                                        ...formData.validityPeriod,
                                                        endDate: e.target.value || undefined,
                                                    },
                                                })
                                            }
                                            className="w-full bg-glass-dark border border-white/10 rounded-lg px-3 py-2 text-white"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            id="requireKYC"
                                            checked={formData.restrictions.requireKYC}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    restrictions: {
                                                        ...formData.restrictions,
                                                        requireKYC: e.target.checked,
                                                    },
                                                })
                                            }
                                            className="w-4 h-4 text-neon-pink bg-glass-dark border-white/10 rounded focus:ring-neon-pink"
                                        />
                                        <label htmlFor="requireKYC" className="text-white text-sm font-medium">
                                            Require KYC verification
                                        </label>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            id="isActive"
                                            checked={formData.validityPeriod.isActive}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    validityPeriod: {
                                                        ...formData.validityPeriod,
                                                        isActive: e.target.checked,
                                                    },
                                                })
                                            }
                                            className="w-4 h-4 text-neon-pink bg-glass-dark border-white/10 rounded focus:ring-neon-pink"
                                        />
                                        <label htmlFor="isActive" className="text-white text-sm font-medium">
                                            Rule is active
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Modal Actions */}
                    <div className="flex items-center gap-3 mt-8 pt-6 border-t border-white/10">
                        <button onClick={handleSave} className="flex-1 bg-neon-pink hover:bg-neon-pink/80 text-white py-3 rounded-lg font-medium transition-colors">
                            {isEditing ? "Save Changes" : "Create Rule"}
                        </button>
                        <button onClick={onCancel} className="flex-1 glass hover:bg-white/10 text-white py-3 rounded-lg font-medium transition-colors">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
