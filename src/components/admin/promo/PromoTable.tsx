import { Edit, Trash2, Play, Pause, Copy, Eye, Gift } from "lucide-react";

export interface PromoData {
    id: string;
    name: string;
    code?: string;
    type: "welcome" | "deposit" | "rakeback" | "cashback" | "free_spins" | "reload" | "seasonal" | "vip";
    status: "active" | "inactive" | "scheduled" | "expired" | "draft";
    trigger: "signup" | "deposit" | "wager" | "loss" | "time" | "manual" | "code";
    rewardType: "bonus" | "cashback" | "free_spins" | "multiplier";
    rewardValue: number;
    rewardUnit: "percentage" | "fixed" | "spins";
    maxReward?: number;
    minDeposit?: number;
    wagering?: number;
    validFrom: string;
    validTo: string;
    usageCount: number;
    usageLimit?: number;
    description: string;
    createdAt: string;
    updatedAt: string;
}

interface PromoTableProps {
    promos: PromoData[];
    onPromoClick: (promo: PromoData) => void;
    onEditPromo: (promo: PromoData) => void;
    onToggleStatus: (promo: PromoData) => void;
    onDeletePromo: (promo: PromoData) => void;
    onDuplicatePromo: (promo: PromoData) => void;
}

export default function PromoTable({ promos, onPromoClick, onEditPromo, onToggleStatus, onDeletePromo, onDuplicatePromo }: PromoTableProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case "active":
                return "text-green-400 bg-green-500/20 border-green-500/30";
            case "inactive":
                return "text-gray-400 bg-gray-500/20 border-gray-500/30";
            case "scheduled":
                return "text-yellow-400 bg-yellow-500/20 border-yellow-500/30";
            case "expired":
                return "text-red-400 bg-red-500/20 border-red-500/30";
            case "draft":
                return "text-blue-400 bg-blue-500/20 border-blue-500/30";
            default:
                return "text-soft bg-soft/20 border-soft/30";
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case "welcome":
                return "text-purple-400 bg-purple-500/20";
            case "deposit":
                return "text-blue-400 bg-blue-500/20";
            case "rakeback":
                return "text-green-400 bg-green-500/20";
            case "cashback":
                return "text-yellow-400 bg-yellow-500/20";
            case "free_spins":
                return "text-pink-400 bg-pink-500/20";
            case "reload":
                return "text-orange-400 bg-orange-500/20";
            case "seasonal":
                return "text-red-400 bg-red-500/20";
            case "vip":
                return "text-gold-400 bg-gold-500/20";
            default:
                return "text-soft bg-soft/20";
        }
    };

    const formatReward = (promo: PromoData) => {
        if (promo.rewardType === "free_spins") {
            return `${promo.rewardValue} spins`;
        }
        if (promo.rewardUnit === "percentage") {
            return `${promo.rewardValue}%${promo.maxReward ? ` (max $${promo.maxReward})` : ""}`;
        }
        return `$${promo.rewardValue}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    if (promos.length === 0) {
        return (
            <div className="glass rounded-xl p-12 border border-soft/10 text-center">
                <div className="mb-4">
                    <Gift className="w-16 h-16 text-soft mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No promotions found</h3>
                <p className="text-soft">Create your first promotion to get started</p>
            </div>
        );
    }

    return (
        <div className="glass rounded-xl border border-soft/10 overflow-hidden mb-6">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-background/30 border-b border-soft/10">
                        <tr>
                            <th className="text-left p-4 text-sm font-medium text-soft">Name & Code</th>
                            <th className="text-left p-4 text-sm font-medium text-soft">Type</th>
                            <th className="text-left p-4 text-sm font-medium text-soft">Status</th>
                            <th className="text-left p-4 text-sm font-medium text-soft">Reward</th>
                            <th className="text-left p-4 text-sm font-medium text-soft">Usage</th>
                            <th className="text-left p-4 text-sm font-medium text-soft">Valid Period</th>
                            <th className="text-left p-4 text-sm font-medium text-soft">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {promos.map((promo) => (
                            <tr key={promo.id} className="border-b border-soft/5 hover:bg-background/20 transition-colors cursor-pointer" onClick={() => onPromoClick(promo)}>
                                <td className="p-4">
                                    <div>
                                        <div className="font-medium text-white">{promo.name}</div>
                                        {promo.code && <div className="text-xs text-soft font-mono bg-background/30 px-2 py-1 rounded mt-1 inline-block">{promo.code}</div>}
                                        <div className="text-xs text-soft mt-1 line-clamp-1">{promo.description}</div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(promo.type)}`}>{promo.type.replace("_", " ")}</span>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(promo.status)}`}>{promo.status}</span>
                                </td>
                                <td className="p-4">
                                    <div className="text-white font-medium">{formatReward(promo)}</div>
                                    {promo.wagering && <div className="text-xs text-soft">{promo.wagering}x wagering</div>}
                                </td>
                                <td className="p-4">
                                    <div className="text-white">{promo.usageCount.toLocaleString()}</div>
                                    {promo.usageLimit && <div className="text-xs text-soft">/ {promo.usageLimit.toLocaleString()}</div>}
                                </td>
                                <td className="p-4">
                                    <div className="text-sm text-white">{formatDate(promo.validFrom)}</div>
                                    <div className="text-xs text-soft">to {formatDate(promo.validTo)}</div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEditPromo(promo);
                                            }}
                                            className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onToggleStatus(promo);
                                            }}
                                            className={`p-1.5 rounded-lg transition-colors ${promo.status === "active" ? "text-yellow-400 hover:bg-yellow-500/20" : "text-green-400 hover:bg-green-500/20"}`}
                                            title={promo.status === "active" ? "Pause" : "Activate"}
                                        >
                                            {promo.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                        </button>
                                        {/* <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDuplicatePromo(promo);
                                            }}
                                            className="p-1.5 text-purple-400 hover:bg-purple-500/20 rounded-lg transition-colors"
                                            title="Duplicate"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button> */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeletePromo(promo);
                                            }}
                                            className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
