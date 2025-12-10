"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
    showCloseButton?: boolean;
}

export default function Modal({ isOpen, onClose, title, children, size = "md", showCloseButton = true }: ModalProps) {
    if (!isOpen) return null;

    const sizeClasses = {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
        "2xl": "max-w-2xl",
        "3xl": "max-w-3xl",
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-background-secondary/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={handleBackdropClick}>
            <div className={`bg-background-secondary rounded-xl p-6 ${sizeClasses[size]} w-full mx-4 max-h-[90vh] overflow-y-auto custom-scrollbar`}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    {showCloseButton && (
                        <button onClick={onClose} className="p-1 text-light/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    )}
                </div>
                {children}
            </div>
        </div>
    );
}

// Form Modal variant with form handling
interface FormModalProps extends Omit<ModalProps, "children"> {
    children: ReactNode;
    onSubmit?: (e: React.FormEvent) => void;
    submitLabel?: string;
    cancelLabel?: string;
    submitDisabled?: boolean;
    showActions?: boolean;
}

export function FormModal({ isOpen, onClose, title, children, size = "md", showCloseButton = true, onSubmit, submitLabel = "Save", cancelLabel = "Cancel", submitDisabled = false, showActions = true }: FormModalProps) {
    if (!isOpen) return null;

    const sizeClasses = {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
        "2xl": "max-w-2xl",
        "3xl": "max-w-3xl",
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit?.(e);
    };

    return (
        <div className="fixed inset-0 bg-background-secondary/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={handleBackdropClick}>
            <div className={`bg-background-secondary rounded-xl p-6 ${sizeClasses[size]} w-full mx-4 max-h-[90vh] overflow-y-auto custom-scrollbar`}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-light">{title}</h3>
                    {showCloseButton && (
                        <button onClick={onClose} className="p-1 text-light/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {children}

                    {showActions && (
                        <div className="flex items-center gap-3 pt-4">
                            <button type="submit" disabled={submitDisabled} className="flex-1 bg-neon-pink hover:bg-neon-pink/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors">
                                {submitLabel}
                            </button>
                            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-500/20 hover:bg-gray-500/30 text-light border border-gray-500/30 rounded-lg transition-colors">
                                {cancelLabel}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}

// Confirmation Modal variant
interface ConfirmModalProps extends Omit<ModalProps, "children"> {
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    variant?: "default" | "danger" | "success";
}

export function ConfirmModal({ isOpen, onClose, title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", onConfirm, variant = "default" }: ConfirmModalProps) {
    if (!isOpen) return null;

    const variantClasses = {
        default: "bg-neon-pink hover:bg-neon-pink/80",
        danger: "bg-red-600 hover:bg-red-500",
        success: "bg-green-600 hover:bg-green-500",
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-background-secondary/50 flex items-center justify-center z-50" onClick={handleBackdropClick}>
            <div className="glass-card rounded-xl p-6 max-w-sm w-full mx-4">
                <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
                <p className="text-light/70 mb-6">{message}</p>

                <div className="flex items-center gap-3">
                    <button onClick={handleConfirm} className={`flex-1 ${variantClasses[variant]} text-light py-2 px-4 rounded-lg transition-colors`}>
                        {confirmLabel}
                    </button>
                    <button onClick={onClose} className="flex-1 bg-gray-500/20 hover:bg-gray-500/30 text-light border border-gray-500/30 py-2 px-4 rounded-lg transition-colors">
                        {cancelLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
