"use client";

import { useState, useEffect } from "react";
import { Settings, Plus, Edit2, Trash2, TrendingUp, Gift, Shield, DollarSign, Percent, Target } from "lucide-react";
import { getCommissionRules, updateCommissionRule, createCommissionRule, deleteCommissionRule, getAffiliates, type CommissionRule, type AdminAffiliate } from "@/utils/api/adminReferralsApi";
import RuleModal from "./RuleModal";
import { SkeletonLoader } from "../common/SkeletonLoader";

/** Normalize a rule so all optional branches are always present (prevents .length errors etc.) */
function normalizeRule(r: any): CommissionRule {
    return {
        id: String(r.id),
        name: r.name ?? "Unnamed",
        gameType: r.gameType ?? "all",
        commissionRate: Number(r.commissionRate ?? 0),
        bonusPerDeposit: Number(r.bonusPerDeposit ?? 0),
        rakeback: Number(r.rakeback ?? 0),
        isGlobal: !!r.isGlobal,
        affiliateIds: Array.isArray(r.affiliateIds) ? r.affiliateIds : [],
        tierBasedRates: {
            enabled: !!r.tierBasedRates?.enabled,
            tiers: Array.isArray(r.tierBasedRates?.tiers) ? r.tierBasedRates.tiers : [],
        },
        bonusTriggers: {
            firstDepositBonus: Number(r.bonusTriggers?.firstDepositBonus ?? 0),
            minimumDepositAmount: Number(r.bonusTriggers?.minimumDepositAmount ?? 0),
            recurringDepositBonus: Number(r.bonusTriggers?.recurringDepositBonus ?? 0),
            volumeMilestoneBonus: Array.isArray(r.bonusTriggers?.volumeMilestoneBonus) ? r.bonusTriggers.volumeMilestoneBonus : [],
        },
        rakebackIncentives: {
            baseRakeback: Number(r.rakebackIncentives?.baseRakeback ?? 0),
            referralBonus: Number(r.rakebackIncentives?.referralBonus ?? 0),
            loyaltyMultiplier: Number(r.rakebackIncentives?.loyaltyMultiplier ?? 1),
        },
        restrictions: {
            minimumBetAmount: Number(r.restrictions?.minimumBetAmount ?? 0),
            excludedCountries: Array.isArray(r.restrictions?.excludedCountries) ? r.restrictions.excludedCountries : [],
            maxCommissionPerMonth: Number(r.restrictions?.maxCommissionPerMonth ?? 0),
            requireKYC: !!r.restrictions?.requireKYC,
        },
        validityPeriod: {
            startDate: r.validityPeriod?.startDate ?? new Date().toISOString().split("T")[0],
            endDate: r.validityPeriod?.endDate,
            isActive: !!(r.validityPeriod?.isActive ?? true),
        },
    };
}

export default function CommissionConfig() {
    const [rules, setRules] = useState<CommissionRule[]>([]);
    const [affiliates, setAffiliates] = useState<AdminAffiliate[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);
    const [creatingRule, setCreatingRule] = useState(false);
    const [expandedRule, setExpandedRule] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [rulesData, affiliatesData] = await Promise.all([getCommissionRules(), getAffiliates()]);
                setRules(rulesData.map(normalizeRule));
                setAffiliates(affiliatesData);
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleSaveRule = async (rule: CommissionRule) => {
        try {
            const normalized = normalizeRule(rule);
            await updateCommissionRule(normalized);
            setRules((prev) => prev.map((r) => (r.id === normalized.id ? normalized : r)));
            setEditingRule(null);
        } catch (error) {
            console.error("Failed to update commission rule:", error);
        }
    };

    const handleCreateRule = async (rule: Omit<CommissionRule, "id">) => {
        try {
            const { id } = await createCommissionRule(rule);
            // Compose a full rule locally so UI doesn't break waiting for a refetch
            const fullRule = normalizeRule({ ...rule, id });
            setRules((prev) => [...prev, fullRule]);
            setCreatingRule(false);
        } catch (error) {
            console.error("Failed to create commission rule:", error);
        }
    };

    const handleDeleteRule = async (ruleId: string) => {
        if (!confirm("Are you sure you want to delete this commission rule?")) return;
        try {
            await deleteCommissionRule(ruleId);
            setRules((prev) => prev.filter((r) => r.id !== ruleId));
        } catch (error) {
            console.error("Failed to delete commission rule:", error);
        }
    };

    const getDefaultRule = (): Omit<CommissionRule, "id"> => ({
        name: "New Commission Rule",
        gameType: "all",
        commissionRate: 5.0,
        bonusPerDeposit: 5.0,
        rakeback: 10.0,
        isGlobal: false,
        affiliateIds: [],
        tierBasedRates: {
            enabled: false,
            tiers: [],
        },
        bonusTriggers: {
            firstDepositBonus: 5.0,
            minimumDepositAmount: 10.0,
            recurringDepositBonus: 2.0,
            volumeMilestoneBonus: [],
        },
        rakebackIncentives: {
            baseRakeback: 10.0,
            referralBonus: 2.0,
            loyaltyMultiplier: 1.0,
        },
        restrictions: {
            minimumBetAmount: 1.0,
            excludedCountries: [],
            maxCommissionPerMonth: 10000,
            requireKYC: false,
        },
        validityPeriod: {
            startDate: new Date().toISOString().split("T")[0],
            isActive: true,
        },
    });

    if (loading) {
        return (
            <div className="space-y-6">
                {/* Header skeleton */}
                <div className="flex items-center justify-between">
                    <div className="h-7 bg-soft/20 rounded w-64 animate-pulse"></div>
                    <div className="h-10 bg-soft/20 rounded w-24 animate-pulse"></div>
                </div>
                {/* Commission Rules skeleton */}
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="glass rounded-xl p-6 animate-pulse">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 bg-soft/20 rounded"></div>
                                    <div className="space-y-2">
                                        <div className="h-5 bg-soft/20 rounded w-48"></div>
                                        <div className="h-4 bg-soft/20 rounded w-32"></div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-soft/20 rounded"></div>
                                    <div className="w-8 h-8 bg-soft/20 rounded"></div>
                                    <div className="w-8 h-8 bg-soft/20 rounded"></div>
                                </div>
                            </div>
                            {/* Stats grid skeleton */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Array.from({ length: 4 }).map((_, j) => (
                                    <div key={j} className="glass-dark rounded-lg p-3">
                                        <div className="h-4 bg-soft/20 rounded w-20 mb-2"></div>
                                        <div className="h-6 bg-soft/20 rounded w-16"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Commission Configuration</h2>
                <button onClick={() => setCreatingRule(true)} className="px-4 py-2 bg-neon-pink hover:bg-neon-pink/80 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
                    <Plus size={16} />
                    Add Rule
                </button>
            </div>

            {/* Commission Rules */}
            <div className="space-y-4">
                {rules.map((rule) => {
                    const affiliateCount = rule.isGlobal ? 0 : rule.affiliateIds?.length ?? 0;
                    const tiers = rule.tierBasedRates?.tiers ?? [];
                    const tierEnabled = !!rule.tierBasedRates?.enabled;
                    const active = rule.validityPeriod?.isActive ?? true;

                    return (
                        <div key={rule.id} className="glass-card rounded-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <Settings className="text-neon-pink" size={20} />
                                    <div>
                                        <h3 className="text-white font-semibold">{rule.name}</h3>
                                        <div className="flex items-center gap-4 text-sm text-light">
                                            <span>{rule.isGlobal ? "Global rule" : `${affiliateCount} affiliates`}</span>
                                            <span className={`px-2 py-1 rounded-full text-xs ${active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>{active ? "Active" : "Inactive"}</span>
                                            {tierEnabled && <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs">Tier-based</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)} className="p-2 text-gray-400 hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
                                        <TrendingUp size={16} />
                                    </button>
                                    <button onClick={() => setEditingRule(rule)} className="p-2 text-blue-400 hover:bg-blue-400/20 rounded-lg transition-colors cursor-pointer">
                                        <Edit2 size={16} />
                                    </button>
                                    {!rule.isGlobal && (
                                        <button onClick={() => handleDeleteRule(rule.id)} className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors cursor-pointer">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Basic Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div className="glass-dark rounded-lg p-3">
                                    <div className="text-soft text-xs mb-1 flex items-center gap-1">
                                        <Percent size={12} />
                                        Commission Rate
                                    </div>
                                    <div className="text-white font-semibold">{tierEnabled ? `${(tiers[0]?.commissionRate ?? rule.commissionRate).toString()}%+` : `${rule.commissionRate}%`}</div>
                                </div>
                                <div className="glass-dark rounded-lg p-3">
                                    <div className="text-soft text-xs mb-1 flex items-center gap-1">
                                        <Gift size={12} />
                                        First Deposit Bonus
                                    </div>
                                    <div className="text-white font-semibold">${rule.bonusTriggers?.firstDepositBonus ?? 0}</div>
                                </div>
                                <div className="glass-dark rounded-lg p-3">
                                    <div className="text-soft text-xs mb-1 flex items-center gap-1">
                                        <DollarSign size={12} />
                                        Rakeback
                                    </div>
                                    <div className="text-white font-semibold">{(rule.rakebackIncentives?.baseRakeback ?? 0).toString()}%</div>
                                </div>
                                <div className="glass-dark rounded-lg p-3">
                                    <div className="text-soft text-xs mb-1 flex items-center gap-1">
                                        <Target size={12} />
                                        Game Type
                                    </div>
                                    <div className="text-white font-semibold capitalize">{rule.gameType}</div>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedRule === rule.id && (
                                <div className="border-t border-white/10 pt-4 space-y-4">
                                    {/* Tier-based Rates */}
                                    {tierEnabled && tiers.length > 0 && (
                                        <div>
                                            <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                                                <TrendingUp size={16} className="text-purple-400" />
                                                Tier-based Commission Rates
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                {tiers.map((tier, index) => (
                                                    <div key={index} className="glass-dark rounded-lg p-3">
                                                        <div className="text-soft text-xs mb-1">Volume ${tier.minVolume}</div>
                                                        <div className="text-white font-semibold">{tier.commissionRate}%</div>
                                                        <div className="text-purple-400 text-xs">Bonus: {tier.bonusMultiplier}x</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Volume Milestones */}
                                    {(rule.bonusTriggers?.volumeMilestoneBonus?.length ?? 0) > 0 && (
                                        <div>
                                            <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                                                <Gift size={16} className="text-green-400" />
                                                Volume Milestone Bonuses
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                {rule.bonusTriggers!.volumeMilestoneBonus!.map((milestone, index) => (
                                                    <div key={index} className="glass-dark rounded-lg p-3">
                                                        <div className="text-soft text-xs mb-1">${milestone.volume} Volume</div>
                                                        <div className="text-green-400 font-semibold">${milestone.bonus} Bonus</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Restrictions */}
                                    <div>
                                        <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                                            <Shield size={16} className="text-orange-400" />
                                            Restrictions & Requirements
                                        </h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="glass-dark rounded-lg p-3">
                                                <div className="text-soft text-xs mb-1">Min Bet</div>
                                                <div className="text-white font-semibold">${rule.restrictions?.minimumBetAmount ?? 0}</div>
                                            </div>
                                            <div className="glass-dark rounded-lg p-3">
                                                <div className="text-soft text-xs mb-1">Max Monthly</div>
                                                <div className="text-white font-semibold">${rule.restrictions?.maxCommissionPerMonth ?? 0}</div>
                                            </div>
                                            <div className="glass-dark rounded-lg p-3">
                                                <div className="text-soft text-xs mb-1">KYC Required</div>
                                                <div className={`font-semibold ${rule.restrictions?.requireKYC ? "text-green-400" : "text-gray-400"}`}>{rule.restrictions?.requireKYC ? "Yes" : "No"}</div>
                                            </div>
                                            <div className="glass-dark rounded-lg p-3">
                                                <div className="text-soft text-xs mb-1">Valid Until</div>
                                                <div className="text-white font-semibold">{rule.validityPeriod?.endDate || "Indefinite"}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Create/Edit Rule Modal */}
            {(editingRule || creatingRule) && (
                <RuleModal
                    rule={editingRule || getDefaultRule()}
                    affiliates={affiliates}
                    isEditing={!!editingRule}
                    onSave={editingRule ? handleSaveRule : handleCreateRule}
                    onCancel={() => {
                        setEditingRule(null);
                        setCreatingRule(false);
                    }}
                />
            )}
        </div>
    );
}
