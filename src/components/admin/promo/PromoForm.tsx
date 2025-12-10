import { useState, useEffect } from "react";
import { FormModal } from "@/components/common/Modal";
import { PromoData } from "./PromoTable";

interface PromoFormProps {
    promo?: PromoData | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (promo: Partial<PromoData>) => void;
}

export default function PromoForm({ promo, isOpen, onClose, onSave }: PromoFormProps) {
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        type: "welcome" as PromoData["type"],
        status: "draft" as PromoData["status"],
        trigger: "signup" as PromoData["trigger"],
        rewardType: "bonus" as PromoData["rewardType"],
        rewardValue: 0,
        rewardUnit: "percentage" as PromoData["rewardUnit"],
        maxReward: 0,
        minDeposit: 0,
        wagering: 1,
        validFrom: "",
        validTo: "",
        usageLimit: 0,
        description: "",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (promo) {
            setFormData({
                name: promo.name,
                code: promo.code || "",
                type: promo.type,
                status: promo.status,
                trigger: promo.trigger,
                rewardType: promo.rewardType,
                rewardValue: promo.rewardValue,
                rewardUnit: promo.rewardUnit,
                maxReward: promo.maxReward || 0,
                minDeposit: promo.minDeposit || 0,
                wagering: promo.wagering || 1,
                validFrom: promo.validFrom.split("T")[0],
                validTo: promo.validTo.split("T")[0],
                usageLimit: promo.usageLimit || 0,
                description: promo.description,
            });
        } else {
            // Reset form for new promo
            setFormData({
                name: "",
                code: "",
                type: "welcome",
                status: "draft",
                trigger: "signup",
                rewardType: "bonus",
                rewardValue: 0,
                rewardUnit: "percentage",
                maxReward: 0,
                minDeposit: 0,
                wagering: 1,
                validFrom: "",
                validTo: "",
                usageLimit: 0,
                description: "",
            });
        }
        setErrors({});
    }, [promo, isOpen]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) newErrors.name = "Name is required";
        if (!formData.description.trim()) newErrors.description = "Description is required";
        if (!formData.validFrom) newErrors.validFrom = "Start date is required";
        if (!formData.validTo) newErrors.validTo = "End date is required";
        if (formData.validFrom && formData.validTo && formData.validFrom >= formData.validTo) {
            newErrors.validTo = "End date must be after start date";
        }
        if (formData.rewardValue <= 0) newErrors.rewardValue = "Reward value must be greater than 0";
        if (formData.wagering < 1) newErrors.wagering = "Wagering must be at least 1x";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        const promoData: Partial<PromoData> = {
            ...formData,
            validFrom: new Date(formData.validFrom).toISOString(),
            validTo: new Date(formData.validTo).toISOString(),
            maxReward: formData.maxReward || undefined,
            minDeposit: formData.minDeposit || undefined,
            usageLimit: formData.usageLimit || undefined,
            code: formData.code || undefined,
        };

        onSave(promoData);
    };

    const handleInputChange = (field: string, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: "" }));
        }
    };

    const getTitle = () => {
        return promo ? "Edit Promotion" : "Create New Promotion";
    };

    const getSubmitLabel = () => {
        return promo ? "Update Promotion" : "Create Promotion";
    };

    return (
        <FormModal
            isOpen={isOpen}
            onClose={onClose}
            title={getTitle()}
            onSubmit={handleSubmit}
            submitLabel={getSubmitLabel()}
            size="2xl"
            showActions={true}
        >
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-light mb-2">Promotion Name *</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        className={`w-full px-4 py-2 bg-background-secondary border rounded-xl text-light placeholder-soft focus:outline-none focus:border-neon-pink/50 ${
                            errors.name ? "border-red-500" : "border-soft/20"
                        }`}
                        placeholder="e.g., Welcome Bonus 400%"
                    />
                    {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-light mb-2">Promo Code</label>
                    <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => handleInputChange("code", e.target.value.toUpperCase())}
                        className="w-full px-4 py-2 bg-background-secondary border border-soft/20 rounded-xl text-light placeholder-soft focus:outline-none focus:border-neon-pink/50"
                        placeholder="e.g., WELCOME400"
                    />
                </div>
            </div>

            {/* Type and Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-medium text-light mb-2">Promotion Type</label>
                    <select 
                        value={formData.type} 
                        onChange={(e) => handleInputChange("type", e.target.value)} 
                        className="w-full px-4 py-2 bg-background-secondary border border-soft/20 rounded-xl text-light focus:outline-none focus:border-neon-pink/50"
                    >
                        <option value="welcome">Welcome Bonus</option>
                        <option value="deposit">Deposit Bonus</option>
                        <option value="rakeback">Rakeback</option>
                        <option value="cashback">Cashback</option>
                        <option value="free_spins">Free Spins</option>
                        <option value="reload">Reload Bonus</option>
                        <option value="seasonal">Seasonal</option>
                        <option value="vip">VIP Bonus</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-light mb-2">Status</label>
                    <select 
                        value={formData.status} 
                        onChange={(e) => handleInputChange("status", e.target.value)} 
                        className="w-full px-4 py-2 bg-background-secondary border border-soft/20 rounded-xl text-light focus:outline-none focus:border-neon-pink/50"
                    >
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-light mb-2">Trigger</label>
                    <select 
                        value={formData.trigger} 
                        onChange={(e) => handleInputChange("trigger", e.target.value)} 
                        className="w-full px-4 py-2 bg-background-secondary border border-soft/20 rounded-xl text-light focus:outline-none focus:border-neon-pink/50"
                    >
                        <option value="signup">Sign Up</option>
                        <option value="deposit">Deposit</option>
                        <option value="wager">Wager Amount</option>
                        <option value="loss">Loss Amount</option>
                        <option value="time">Time Based</option>
                        <option value="manual">Manual</option>
                        <option value="code">Promo Code</option>
                    </select>
                </div>
            </div>

            {/* Reward Configuration */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-light">Reward Configuration</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-light mb-2">Reward Type</label>
                        <select
                            value={formData.rewardType}
                            onChange={(e) => handleInputChange("rewardType", e.target.value)}
                            className="w-full px-4 py-2 bg-background-secondary border border-soft/20 rounded-xl text-light focus:outline-none focus:border-neon-pink/50"
                        >
                            <option value="bonus">Bonus</option>
                            <option value="cashback">Cashback</option>
                            <option value="free_spins">Free Spins</option>
                            <option value="multiplier">Multiplier</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-light mb-2">Reward Value *</label>
                        <input
                            type="number"
                            value={formData.rewardValue}
                            onChange={(e) => handleInputChange("rewardValue", parseFloat(e.target.value) || 0)}
                            className={`w-full px-4 py-2 bg-background-secondary border rounded-xl text-light placeholder-soft focus:outline-none focus:border-neon-pink/50 ${
                                errors.rewardValue ? "border-red-500" : "border-soft/20"
                            }`}
                            min="0"
                            step="0.01"
                        />
                        {errors.rewardValue && <p className="text-red-400 text-sm mt-1">{errors.rewardValue}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-light mb-2">Unit</label>
                        <select
                            value={formData.rewardUnit}
                            onChange={(e) => handleInputChange("rewardUnit", e.target.value)}
                            className="w-full px-4 py-2 bg-background-secondary border border-soft/20 rounded-xl text-light focus:outline-none focus:border-neon-pink/50"
                        >
                            <option value="percentage">Percentage (%)</option>
                            <option value="fixed">Fixed Amount ($)</option>
                            <option value="spins">Free Spins</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-light mb-2">Max Reward ($)</label>
                        <input
                            type="number"
                            value={formData.maxReward}
                            onChange={(e) => handleInputChange("maxReward", parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-2 bg-background-secondary border border-soft/20 rounded-xl text-light placeholder-soft focus:outline-none focus:border-neon-pink/50"
                            min="0"
                            step="0.01"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-light mb-2">Min Deposit ($)</label>
                        <input
                            type="number"
                            value={formData.minDeposit}
                            onChange={(e) => handleInputChange("minDeposit", parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-2 bg-background-secondary border border-soft/20 rounded-xl text-light placeholder-soft focus:outline-none focus:border-neon-pink/50"
                            min="0"
                            step="0.01"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-light mb-2">Wagering Requirement *</label>
                        <input
                            type="number"
                            value={formData.wagering}
                            onChange={(e) => handleInputChange("wagering", parseFloat(e.target.value) || 1)}
                            className={`w-full px-4 py-2 bg-background-secondary border rounded-xl text-light placeholder-soft focus:outline-none focus:border-neon-pink/50 ${
                                errors.wagering ? "border-red-500" : "border-soft/20"
                            }`}
                            min="1"
                            step="0.1"
                        />
                        {errors.wagering && <p className="text-red-400 text-sm mt-1">{errors.wagering}</p>}
                    </div>
                </div>
            </div>

            {/* Validity Period */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-light">Validity Period</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-light mb-2">Start Date *</label>
                        <input
                            type="date"
                            value={formData.validFrom}
                            onChange={(e) => handleInputChange("validFrom", e.target.value)}
                            className={`w-full px-4 py-2 bg-background-secondary border rounded-xl text-light focus:outline-none focus:border-neon-pink/50 ${
                                errors.validFrom ? "border-red-500" : "border-soft/20"
                            }`}
                        />
                        {errors.validFrom && <p className="text-red-400 text-sm mt-1">{errors.validFrom}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-light mb-2">End Date *</label>
                        <input
                            type="date"
                            value={formData.validTo}
                            onChange={(e) => handleInputChange("validTo", e.target.value)}
                            className={`w-full px-4 py-2 bg-background-secondary border rounded-xl text-light focus:outline-none focus:border-neon-pink/50 ${
                                errors.validTo ? "border-red-500" : "border-soft/20"
                            }`}
                        />
                        {errors.validTo && <p className="text-red-400 text-sm mt-1">{errors.validTo}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-light mb-2">Usage Limit</label>
                        <input
                            type="number"
                            value={formData.usageLimit}
                            onChange={(e) => handleInputChange("usageLimit", parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-2 bg-background-secondary border border-soft/20 rounded-xl text-light placeholder-soft focus:outline-none focus:border-neon-pink/50"
                            min="0"
                            placeholder="0 = unlimited"
                        />
                    </div>
                </div>
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-medium text-light mb-2">Description *</label>
                <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    rows={3}
                    className={`w-full px-4 py-2 bg-background-secondary border rounded-xl text-light placeholder-soft focus:outline-none focus:border-neon-pink/50 resize-none ${
                        errors.description ? "border-red-500" : "border-soft/20"
                    }`}
                    placeholder="Describe the promotion details and terms..."
                />
                {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
            </div>
        </FormModal>
    );
}
