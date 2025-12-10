import toast, { ToastOptions } from "react-hot-toast";
import { Info, AlertTriangle, Trophy, Gamepad2, Link, Lock, Gift, X, Target } from "lucide-react";
import { createElement } from "react";
import { solToUsd, formatCurrencyDisplay } from "./currency";

/**
 * Centralized Toast Service for consistent toast notifications across the app
 */
class ToastService {
    // Default toast options
    private static defaultOptions: ToastOptions = {
        duration: 3000,
        position: "bottom-right",
    };

    // Success toast with custom styling
    static success(message: string, options?: ToastOptions) {
        return toast.success(message, {
            ...this.defaultOptions,
            duration: 3000,
            style: {
                background: "linear-gradient(135deg, #10B981, #059669)",
                color: "white",
                fontWeight: "500",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
            },
            ...options,
        });
    }

    // Error toast with custom styling
    static error(message: string, options?: ToastOptions) {
        return toast.error(message, {
            ...this.defaultOptions,
            duration: 4000,
            style: {
                background: "linear-gradient(135deg, #EF4444, #DC2626)",
                color: "white",
                fontWeight: "500",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)",
            },
            ...options,
        });
    }

    // Loading toast
    static loading(message: string, options?: ToastOptions) {
        return toast.loading(message, {
            ...this.defaultOptions,
            style: {
                background: "#1a1a2e",
                color: "#ffffff",
                fontWeight: "500",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(26, 26, 46, 0.3)",
            },
            ...options,
        });
    }

    // Info toast
    static info(message: string, options?: ToastOptions) {
        return toast(message, {
            ...this.defaultOptions,
            icon: createElement(Info, { size: 16, color: "white" }),
            style: {
                background: "linear-gradient(135deg, #3B82F6, #2563EB)",
                color: "white",
                fontWeight: "500",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
            },
            ...options,
        });
    }

    // Warning toast
    static warning(message: string, options?: ToastOptions) {
        return toast(message, {
            ...this.defaultOptions,
            icon: createElement(AlertTriangle, { size: 16, color: "white" }),
            style: {
                background: "linear-gradient(135deg, #F59E0B, #D97706)",
                color: "white",
                fontWeight: "500",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
            },
            ...options,
        });
    }

    // Custom toast with full control
    static custom(message: string, options?: ToastOptions) {
        return toast(message, {
            ...this.defaultOptions,
            ...options,
        });
    }

    // Dismiss a specific toast
    static dismiss(toastId?: string) {
        return toast.dismiss(toastId);
    }

    // Dismiss all toasts
    static dismissAll() {
        return toast.dismiss();
    }

    // Game-specific toasts with emojis
    static gameWin(message: string, amount?: number) {
        let winMessage = message;
        if (amount) {
            const usdAmount = solToUsd(amount);
            const formattedAmount = formatCurrencyDisplay(usdAmount);
            winMessage = `${message} (+${formattedAmount.primary})`;
        }

        return this.success(winMessage, {
            icon: createElement(Trophy, { size: 16, color: "white" }),
            duration: 4000,
            style: {
                background: "linear-gradient(135deg, #10B981, #059669)",
                color: "white",
                fontWeight: "600",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.4)",
                fontSize: "14px",
            },
        });
    }

    static gameLoss(message: string) {
        return this.error(message, {
            icon: createElement(X, { size: 16, color: "white" }),
            duration: 3000,
        });
    }

    static gameStart(message: string, betAmount?: number) {
        const startMessage = betAmount ? `${message} (${betAmount} SOL)` : message;

        return this.info(startMessage, {
            icon: createElement(Gamepad2, { size: 16, color: "white" }),
            duration: 2000,
        });
    }

    static gameError(message: string) {
        return this.error(message, {
            icon: createElement(X, { size: 16, color: "white" }),
            duration: 4000,
        });
    }

    // Wallet-specific toasts
    static walletConnected(walletName: string) {
        return this.success(`Successfully connected to ${walletName}!`, {
            icon: createElement(Link, { size: 16, color: "white" }),
            duration: 3000,
        });
    }

    static walletError(message: string) {
        return this.error(`Wallet Error: ${message}`, {
            icon: createElement(Lock, { size: 16, color: "white" }),
            duration: 4000,
        });
    }

    // Reward-specific toasts
    static rewardClaimed(rewardTitle: string) {
        return this.success(`Successfully claimed ${rewardTitle}!`, {
            icon: createElement(Gift, { size: 16, color: "white" }),
            duration: 4000,
        });
    }

    static rewardError(rewardTitle: string) {
        return this.error(`Failed to claim ${rewardTitle}. Please try again.`, {
            icon: createElement(X, { size: 16, color: "white" }),
            duration: 5000,
        });
    }

    static rewardNotEligible(message : string) {
        return this.error(` ${message}.`, {
            icon: createElement(AlertTriangle, { size: 16, color: "white" }),
            duration: 5000,
        });
    }

    static rewardClaiming(rewardTitle: string) {
        return this.loading(`Claiming ${rewardTitle}...`, {
            icon: createElement(Target, { size: 16, color: "white" }),
        });
    }
}

export default ToastService;
