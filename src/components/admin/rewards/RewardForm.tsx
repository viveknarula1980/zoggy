import { useState, useEffect } from "react";
import { FormModal } from "@/components/common/Modal";
import { Range, Level, RewardsApiService } from "@/utils/api/rewardsApi";

type FormType = "range" | "level";

interface RewardFormProps {
    isOpen: boolean;
    formType: FormType;
    range?: Range | null;
    level?: Level | null;
    ranges?: Range[]; // For level form dropdown
    onSubmit: (data: any) => void;
    onClose: () => void;
}

export default function RewardForm({ isOpen, formType, range, level, ranges = [], onSubmit, onClose }: RewardFormProps) {
    const [rangeFormData, setRangeFormData] = useState({
        name: "",
        quote: "",
        image: "",
        isActive: true,
    });

    const [levelFormData, setLevelFormData] = useState({
        range_id: 0,
        level_number: 1,
        title: "",
        reward: "",
        wagering: "",
        isActive: true,
    });

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>("");
    const [isUploading, setIsUploading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const isEditMode = (formType === "range" && range) || (formType === "level" && level);
    const currentFormData = formType === "range" ? rangeFormData : levelFormData;
    const setCurrentFormData = formType === "range" ? setRangeFormData : setLevelFormData;

    useEffect(() => {
        if (formType === "range" && range) {
            setRangeFormData({
                name: range.name,
                quote: range.quote,
                image: range.image || "",
                isActive: range.isActive,
            });
            setImagePreview(range.image || "");
        } else if (formType === "level" && level) {
            setLevelFormData({
                range_id: level.range_id,
                level_number: level.level_number,
                title: level.title,
                reward: level.reward ?? "",
                wagering: level.wagering ?? "",
                isActive: level.isActive,
            });
        }
    }, [formType, range, level]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const allowedTypes = ["image/png", "image/svg+xml", "image/jpeg", "image/jpg"];
            if (allowedTypes.includes(file.type)) {
                setImageFile(file);
                const reader = new FileReader();
                reader.onload = (e) => {
                    const result = e.target?.result as string;
                    setImagePreview(result);
                    handleChange("image", result);
                };
                reader.readAsDataURL(file);
            } else {
                setErrors((prev) => ({ ...prev, image: "Please select a PNG, SVG, or JPEG file" }));
            }
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview("");
        handleChange("image", "");
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (formType === "range") {
            const data = rangeFormData;
            if (!data.name.trim()) {
                newErrors.name = "Range name is required";
            }
            if (!data.quote.trim()) {
                newErrors.quote = "Quote is required";
            }
        } else {
            const data = levelFormData;
            if (!data.title.trim()) {
                newErrors.title = "Level title is required";
            }
            if (!data.reward.trim()) {
                newErrors.reward = "Reward is required";
            }
            if (!data.wagering.trim()) {
                newErrors.wagering = "Wagering requirement is required";
            }
            if (data.range_id <= 0) {
                newErrors.range_id = "Please select a range";
            }
            if (data.level_number <= 0) {
                newErrors.level_number = "Level number must be greater than 0";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            setIsUploading(true);
            let finalData = formType === "range" ? { ...rangeFormData } : { ...levelFormData };

            // Upload image file if a new file was selected (only for ranges)
            if (imageFile && formType === "range") {
                const uploadResult = await RewardsApiService.uploadRewardIcon(imageFile);
                (finalData as any).image = uploadResult.iconUrl;
            }

            onSubmit(finalData);
        } catch (error) {
            console.error("Failed to upload image:", error);
            setErrors((prev) => ({ ...prev, image: "Failed to upload image. Please try again." }));
        } finally {
            setIsUploading(false);
        }
    };

    const handleChange = (field: string, value: any) => {
        if (formType === "range") {
            setRangeFormData((prev) => ({ ...prev, [field]: value }));
        } else {
            setLevelFormData((prev) => ({ ...prev, [field]: value }));
        }
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: "" }));
        }
    };

    const getTitle = () => {
        if (formType === "range") {
            return isEditMode ? "Edit Range" : "Create New Range";
        }
        return isEditMode ? "Edit Level" : "Create New Level";
    };

    const getSubmitLabel = () => {
        if (isUploading) return "Uploading...";
        if (formType === "range") {
            return isEditMode ? "Update Range" : "Create Range";
        }
        return isEditMode ? "Update Level" : "Create Level";
    };

    return (
        <FormModal isOpen={isOpen} onClose={onClose} title={getTitle()} onSubmit={handleSubmit} submitLabel={getSubmitLabel()} size="2xl" showActions={true} submitDisabled={isUploading}>
            {formType === "range" ? (
                <>
                    {/* Range Name */}
                    <div>
                        <label className="block text-sm font-medium text-light mb-2">Range Name *</label>
                        <input
                            type="text"
                            value={rangeFormData.name}
                            onChange={(e) => handleChange("name", e.target.value)}
                            className="w-full px-4 py-2 bg-background-secondary border border-soft/20 rounded-xl text-light placeholder-soft focus:outline-none focus:border-neon-pink/50"
                            placeholder="Enter range name (e.g., STREET DEALER, CHIP RUNNER)"
                        />
                        {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
                    </div>

                    {/* Quote */}
                    <div>
                        <label className="block text-sm font-medium text-light mb-2">Quote *</label>
                        <textarea
                            value={rangeFormData.quote}
                            onChange={(e) => handleChange("quote", e.target.value)}
                            className="w-full px-4 py-2 bg-background-secondary border border-soft/20 rounded-xl text-light placeholder-soft focus:outline-none focus:border-neon-pink/50"
                            placeholder="Enter motivational quote for this range"
                            rows={3}
                        />
                        {errors.quote && <p className="text-red-400 text-sm mt-1">{errors.quote}</p>}
                    </div>
                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-medium text-light mb-2">Image</label>
                        <div className="space-y-3">
                            {/* Upload Area */}
                            <div className="border-2 border-dashed border-soft/20 rounded-xl p-6 text-center hover:border-soft/40 transition-colors">
                                <input type="file" id="image-upload" accept=".png,.svg,.jpeg,.jpg" onChange={handleImageUpload} className="hidden" />
                                <label htmlFor="image-upload" className="cursor-pointer">
                                    <div className="text-soft mb-2">
                                        <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                    </div>
                                    <p className="text-sm text-light mb-1">Click to upload image</p>
                                    <p className="text-xs text-soft">PNG, SVG, JPEG up to 2MB</p>
                                </label>
                            </div>

                            {/* Preview */}
                            {imagePreview && (
                                <div className="flex items-center gap-3 p-3 bg-background-secondary rounded-lg border border-soft/20">
                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-soft/10 flex items-center justify-center">
                                        <img src={imagePreview} alt="Image preview" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-light">Image uploaded</p>
                                        <p className="text-xs text-soft">{imageFile?.name || "Existing image"}</p>
                                    </div>
                                    <button type="button" onClick={removeImage} className="text-red-400 hover:text-red-300 transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>
                        {errors.image && <p className="text-red-400 text-sm mt-1">{errors.image}</p>}
                    </div>
                </>
            ) : (
                <>
                    {/* Range Selection */}
                    <div>
                        <label className="block text-sm font-medium text-light mb-2">Range *</label>
                        <select value={levelFormData.range_id} onChange={(e) => handleChange("range_id", Number(e.target.value))} className="w-full px-4 py-2 bg-background-secondary border border-soft/20 rounded-xl text-light focus:outline-none focus:border-neon-pink/50">
                            <option value={0}>Select a range</option>
                            {ranges.map((range) => (
                                <option key={range.id} value={range.id}>
                                    {range.name}
                                </option>
                            ))}
                        </select>
                        {errors.range_id && <p className="text-red-400 text-sm mt-1">{errors.range_id}</p>}
                    </div>

                    {/* Level Number and Title */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-light mb-2">Level Number *</label>
                            <input
                                type="number"
                                value={levelFormData.level_number}
                                onChange={(e) => handleChange("level_number", Number(e.target.value))}
                                className="w-full px-4 py-2 bg-background-secondary border border-soft/20 rounded-xl text-light placeholder-soft focus:outline-none focus:border-neon-pink/50"
                                placeholder="Level number"
                                min="1"
                            />
                            {errors.level_number && <p className="text-red-400 text-sm mt-1">{errors.level_number}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-light mb-2">Level Title *</label>
                            <input
                                type="text"
                                value={levelFormData.title}
                                onChange={(e) => handleChange("title", e.target.value)}
                                className="w-full px-4 py-2 bg-background-secondary border border-soft/20 rounded-xl text-light placeholder-soft focus:outline-none focus:border-neon-pink/50"
                                placeholder="Enter level title"
                            />
                            {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
                        </div>
                    </div>

                    {/* Reward and Wagering */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-light mb-2">Reward *</label>
                            <input
                                type="text"
                                value={levelFormData.reward}
                                onChange={(e) => handleChange("reward", e.target.value)}
                                className="w-full px-4 py-2 bg-background-secondary border border-soft/20 rounded-xl text-light placeholder-soft focus:outline-none focus:border-neon-pink/50"
                                placeholder="e.g., $50"
                            />
                            {errors.reward && <p className="text-red-400 text-sm mt-1">{errors.reward}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-light mb-2">Wagering Requirement *</label>
                            <input
                                type="text"
                                value={levelFormData.wagering}
                                onChange={(e) => handleChange("wagering", e.target.value)}
                                className="w-full px-4 py-2 bg-background-secondary border border-soft/20 rounded-xl text-light placeholder-soft focus:outline-none focus:border-neon-pink/50"
                                placeholder="e.g., $1,000"
                            />
                            {errors.wagering && <p className="text-red-400 text-sm mt-1">{errors.wagering}</p>}
                        </div>
                    </div>
                </>
            )}

            {/* Status */}
            <div>
                <label className="flex items-center gap-3">
                    <input type="checkbox" checked={formType === "range" ? rangeFormData.isActive : levelFormData.isActive} onChange={(e) => handleChange("isActive", e.target.checked)} className="w-4 h-4 text-neon-pink bg-background-secondary border-soft/20 rounded focus:ring-neon-pink/50" />
                    <span className="text-sm font-medium text-light">Active {formType === "range" ? "Range" : "Level"}</span>
                </label>
                <p className="text-xs text-soft mt-1">Inactive {formType === "range" ? "ranges" : "levels"} won't be visible to users and can't be claimed</p>
            </div>
        </FormModal>
    );
}
