"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import ConnectStep from "./ConnectStep";
import ActivateVaultStep from "./ActivateVaultStep";
import AddFundsStep from "./AddFundsStep";
import { useMultiStepForm, StepConfig } from "@/utils/hooks/useMultiStepForm";
import { useWallet } from "@solana/wallet-adapter-react";

interface WalletConnectPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps: StepConfig[] = [
  { id: "connect", title: "Connect Wallet" },
  { id: "activate", title: "Activate Vault" },
  { id: "add-funds", title: "Add Funds" },
];

const WalletConnectPopup = ({ isOpen, onClose }: WalletConnectPopupProps) => {
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [activateVault, setActivateVault] = useState(false);
  const { connected } = useWallet();

  const { currentStep, next, previous, reset } = useMultiStepForm({
    steps,
    initialStep: 0,
    onComplete: onClose,
  });

  const handleClose = () => {
    reset();
    setSelectedWallet(null);
    setActivateVault(false);
    onClose();
  };

  const handleWalletSelect = (walletName: string) => {
    setSelectedWallet(walletName);
    next();
  };

  // ✅ Auto-skip "Connect" step if already connected when popup opens
  useEffect(() => {
    if (isOpen && connected && currentStep === 0) {
      next();
    }
  }, [isOpen, connected, currentStep, next]);

  // Original step progression
  useEffect(() => {
    if (selectedWallet && currentStep === 0) {
      next();
    } else if (activateVault && currentStep === 1) {
      next();
    }
  }, [selectedWallet, activateVault, currentStep, next]);

  const handleActivateVault = () => {
    setActivateVault(true);
    next();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 glass-dark" onClick={handleClose} />

      {/* Modal */}
      <div className="relative flex flex-col w-full max-w-6xl h-full max-h-[650px] bg-background-secondary rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="relative z-10 flex items-center justify-end p-2 sm:p-3 border-b border-purple/20">
          <button
            onClick={handleClose}
            className="text-soft hover:text-neon-pink transition-colors p-1 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="relative h-full z-10 p-3 sm:p-4 md:p-6 md:pt-2 overflow-y-auto custom-scrollbar">
          {currentStep === 0 && (
            <ConnectStep onWalletSelect={handleWalletSelect} />
          )}
          {currentStep === 1 && (
            <ActivateVaultStep
              selectedWallet={selectedWallet}
              onBack={previous}
              onComplete={handleActivateVault}
            />
          )}
          {currentStep === 2 && (
            <AddFundsStep
              selectedWallet={selectedWallet}
              onBack={previous}
              onComplete={handleClose}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletConnectPopup;
