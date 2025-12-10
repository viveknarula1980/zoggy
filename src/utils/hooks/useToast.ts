import { useCallback } from "react";
import { ToastOptions } from "react-hot-toast";
import ToastService from "../toastService";

/**
 * Custom hook for toast notifications
 * Provides a React-friendly interface to the centralized ToastService
 */
export const useToast = () => {
  // Basic toast methods
  const success = useCallback((message: string, options?: ToastOptions) => {
    return ToastService.success(message, options);
  }, []);

  const error = useCallback((message: string, options?: ToastOptions) => {
    return ToastService.error(message, options);
  }, []);

  const loading = useCallback((message: string, options?: ToastOptions) => {
    return ToastService.loading(message, options);
  }, []);

  const info = useCallback((message: string, options?: ToastOptions) => {
    return ToastService.info(message, options);
  }, []);

  const warning = useCallback((message: string, options?: ToastOptions) => {
    return ToastService.warning(message, options);
  }, []);

  const custom = useCallback((message: string, options?: ToastOptions) => {
    return ToastService.custom(message, options);
  }, []);

  // Dismiss methods
  const dismiss = useCallback((toastId?: string) => {
    return ToastService.dismiss(toastId);
  }, []);

  const dismissAll = useCallback(() => {
    return ToastService.dismissAll();
  }, []);

  // Game-specific toast methods
  const gameWin = useCallback((message: string, amount?: number) => {
    return ToastService.gameWin(message, amount);
  }, []);

  const gameLoss = useCallback((message: string) => {
    return ToastService.gameLoss(message);
  }, []);

  const gameStart = useCallback((message: string, betAmount?: number) => {
    return ToastService.gameStart(message, betAmount);
  }, []);

  const gameError = useCallback((message: string) => {
    return ToastService.gameError(message);
  }, []);

  // Wallet-specific toast methods
  const walletConnected = useCallback((walletName: string) => {
    return ToastService.walletConnected(walletName);
  }, []);

  const walletError = useCallback((message: string) => {
    return ToastService.walletError(message);
  }, []);

  // Reward-specific toast methods
  const rewardClaimed = useCallback((rewardTitle: string) => {
    return ToastService.rewardClaimed(rewardTitle);
  }, []);

  const rewardError = useCallback((rewardTitle: string) => {
    return ToastService.rewardError(rewardTitle);
  }, []);

  const rewardClaiming = useCallback((rewardTitle: string) => {
    return ToastService.rewardClaiming(rewardTitle);
  }, []);

  // Utility methods for common patterns
  const showInsufficientBalance = useCallback((required: number, available: number) => {
    return error(`Insufficient balance. Required: ${required} SOL, Available: ${available} SOL`);
  }, [error]);

  const showConnectionError = useCallback((walletName?: string) => {
    const message = walletName 
      ? `${walletName} wallet not installed. Please install it first.`
      : "Failed to connect wallet. Please try again.";
    return walletError(message);
  }, [walletError]);

  const showClaimingProgress = useCallback((rewardTitle: string) => {
    return rewardClaiming(rewardTitle);
  }, [rewardClaiming]);

  // Promise-based toast for async operations
  const promise = useCallback(
    <T>(
      promise: Promise<T>,
      {
        loading: loadingMessage,
        success: successMessage,
        error: errorMessage,
      }: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((error: any) => string);
      },
      options?: ToastOptions
    ) => {
      const toastId = ToastService.loading(loadingMessage, options);

      return promise
        .then((data) => {
          ToastService.dismiss(toastId);
          const message = typeof successMessage === "function" ? successMessage(data) : successMessage;
          ToastService.success(message, options);
          return data;
        })
        .catch((error) => {
          ToastService.dismiss(toastId);
          const message = typeof errorMessage === "function" ? errorMessage(error) : errorMessage;
          ToastService.error(message, options);
          throw error;
        });
    },
    []
  );

  return {
    // Basic methods
    success,
    error,
    loading,
    info,
    warning,
    custom,
    dismiss,
    dismissAll,
    
    // Game methods
    gameWin,
    gameLoss,
    gameStart,
    gameError,
    
    // Wallet methods
    walletConnected,
    walletError,
    
    // Reward methods
    rewardClaimed,
    rewardError,
    rewardClaiming,
    
    // Utility methods
    showInsufficientBalance,
    showConnectionError,
    showClaimingProgress,
    
    // Promise-based toast
    promise,
  };
};

export default useToast;
