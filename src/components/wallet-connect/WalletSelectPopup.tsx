"use client";

import WalletOption from "./WalletOption";
import { Ghost, Flame } from "lucide-react";

interface WalletSelectPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (walletName: string) => void;
    isConnecting: boolean;
}

const walletOptions = [
    { name: "Phantom",  icon: Ghost, description: "Connect using Phantom wallet" },
    { name: "Solflare", icon: Flame, description: "Connect using Solflare wallet" },
];

const WalletSelectPopup = ({
    isOpen,
    onClose,
    onSelect,
    isConnecting,
}: WalletSelectPopupProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={isConnecting ? undefined : onClose}
            />
            <div className="relative bg-background-secondary rounded-2xl p-3 sm:p-4 z-10 w-full max-w-[90%] sm:max-w-md mx-4">
                <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-light">
                    Choose your wallet
                </h3>
                <div className="space-y-2 sm:space-y-3">
                    {walletOptions.map((wallet) => (
                        <WalletOption
                            key={wallet.name}
                            name={wallet.name}
                            icon={wallet.icon}
                            description={wallet.description}
                            onClick={() => {
                                if (!isConnecting) {
                                    onSelect(wallet.name);
                                    onClose();
                                }
                            }}
                            disabled={isConnecting}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WalletSelectPopup;
