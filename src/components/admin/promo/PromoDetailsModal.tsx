import { Calendar, Users, DollarSign, Gift, TrendingUp, Clock } from "lucide-react";
import { PromoData } from "./PromoTable";
import Modal from "@/components/common/Modal";

interface PromoDetailsModalProps {
    promo: PromoData;
    onClose: () => void;
    onEdit: (promo: PromoData) => void;
}

export default function PromoDetailsModal({ promo, onClose, onEdit }: PromoDetailsModalProps) {
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

    const formatReward = () => {
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
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const usagePercentage = promo.usageLimit ? (promo.usageCount / promo.usageLimit) * 100 : 0;

    return (
        <Modal isOpen={true} title={promo.name} onClose={onClose} size="3xl" showCloseButton={true}>
            {/* Header Info */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(promo.type)}`}>{promo.type.replace("_", " ")}</span>
                    <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(promo.status)}`}>{promo.status}</span>
                    {promo.code && <span className="px-2 py-1 text-xs bg-background/30 text-soft font-mono rounded">{promo.code}</span>}
                </div>
                {/* <button onClick={() => onEdit(promo)} className="px-4 py-2 bg-neon-pink/20 text-neon-pink border border-neon-pink/30 rounded-lg hover:bg-neon-pink/30 transition-colors">
                    Edit Promotion
                </button> */}
            </div>

            {/* Content */}
            <div className="space-y-6">
                {/* Overview Stats */}
                {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-background-secondary rounded-xl p-4 border border-soft/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/20 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                                <div className="text-lg font-semibold text-light">{promo.usageCount.toLocaleString()}</div>
                                <div className="text-xs text-soft">Total Uses</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-background-secondary rounded-xl p-4 border border-soft/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <DollarSign className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <div className="text-lg font-semibold text-light">{formatReward()}</div>
                                <div className="text-xs text-soft">Reward Value</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-background-secondary rounded-xl p-4 border border-soft/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/20 rounded-lg">
                                <Users className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <div className="text-lg font-semibold text-light">{promo.usageLimit ? promo.usageLimit.toLocaleString() : "∞"}</div>
                                <div className="text-xs text-soft">Usage Limit</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-background-secondary rounded-xl p-4 border border-soft/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-500/20 rounded-lg">
                                <Clock className="w-5 h-5 text-yellow-400" />
                            </div>
                            <div>
                                <div className="text-lg font-semibold text-light">{promo.wagering || 1}x</div>
                                <div className="text-xs text-soft">Wagering</div>
                            </div>
                        </div>
                    </div>
                </div> */}

                {/* Usage Progress */}
                {promo.usageLimit && (
                    <div className="bg-background-secondary rounded-xl p-4 border border-soft/10">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-light">Usage Progress</span>
                            <span className="text-sm text-soft">
                                {promo.usageCount} / {promo.usageLimit} ({usagePercentage.toFixed(1)}%)
                            </span>
                        </div>
                        <div className="w-full bg-background/30 rounded-full h-2">
                            <div className="bg-gradient-to-r from-neon-pink to-purple-500 h-2 rounded-full transition-all duration-300" style={{ width: `${Math.min(usagePercentage, 100)}%` }} />
                        </div>
                    </div>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Promotion Details */}
                    <div className="bg-background-secondary rounded-xl p-4 border border-soft/10">
                        <h3 className="text-lg font-semibold text-light mb-4 flex items-center gap-2">
                            <Gift className="w-5 h-5" />
                            Promotion Details
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-soft">Type:</span>
                                <span className="text-light capitalize">{promo.type.replace("_", " ")}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-soft">Trigger:</span>
                                <span className="text-light capitalize">{promo.trigger.replace("_", " ")}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-soft">Reward Type:</span>
                                <span className="text-light capitalize">{promo.rewardType.replace("_", " ")}</span>
                            </div>
                            {promo.minDeposit && (
                                <div className="flex justify-between">
                                    <span className="text-soft">Min Deposit:</span>
                                    <span className="text-light">${promo.minDeposit}</span>
                                </div>
                            )}
                            {promo.maxReward && (
                                <div className="flex justify-between">
                                    <span className="text-soft">Max Reward:</span>
                                    <span className="text-light">${promo.maxReward}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Validity Period */}
                    <div className="bg-background-secondary rounded-xl p-4 border border-soft/10">
                        <h3 className="text-lg font-semibold text-light mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5" />
                            Validity Period
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <div className="text-soft text-sm">Start Date:</div>
                                <div className="text-light">{formatDate(promo.validFrom)}</div>
                            </div>
                            <div>
                                <div className="text-soft text-sm">End Date:</div>
                                <div className="text-light">{formatDate(promo.validTo)}</div>
                            </div>
                            <div>
                                <div className="text-soft text-sm">Created:</div>
                                <div className="text-light">{formatDate(promo.createdAt)}</div>
                            </div>
                            <div>
                                <div className="text-soft text-sm">Last Updated:</div>
                                <div className="text-light">{formatDate(promo.updatedAt)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="bg-background-secondary rounded-xl p-4 border border-soft/10">
                    <h3 className="text-lg font-semibold text-light mb-3">Description</h3>
                    <p className="text-soft leading-relaxed">{promo.description}</p>
                </div>

                {/* Terms & Conditions Preview */}
                <div className="bg-background-secondary rounded-xl p-4 border border-soft/10">
                    <h3 className="text-lg font-semibold text-light mb-3">Terms & Conditions</h3>
                    <div className="text-sm text-soft space-y-2">
                        <p>
                            • This promotion is valid from {formatDate(promo.validFrom)} to {formatDate(promo.validTo)}
                        </p>
                        {promo.minDeposit && <p>• Minimum deposit of ${promo.minDeposit} required</p>}
                        {promo.maxReward && <p>• Maximum reward capped at ${promo.maxReward}</p>}
                        <p>• Wagering requirement: {promo.wagering || 1}x the bonus amount</p>
                        {promo.usageLimit && <p>• Limited to {promo.usageLimit.toLocaleString()} total uses</p>}
                        <p>• FlipVerse reserves the right to modify or cancel this promotion at any time</p>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
