"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { Copy, X } from "lucide-react";
import { MOCK_PROFILE_META } from "@/utils/api/profileapi";

interface ProfilePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfilePopup({ isOpen, onClose }: ProfilePopupProps) {
  const { connected, publicKey } = useWallet();

  if (!isOpen || !connected) return null;

  const { totalWagered, currentRank, levelIcon } = MOCK_PROFILE_META;

  return (
    <div className="fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-background-secondary border border-soft/10 rounded-xl w-full max-w-md relative">
        {/* Close Button */}
        <div className="flex items-center justify-between px-4 py-2 bg-soft/10 rounded-t-xl">
          <h1 className="text-light text-xl">Profile</h1>
          <button
            onClick={onClose}
            className="text-light/60 hover:text-light transition-colors p-1 hover:bg-light/10 rounded-lg cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="py-6 space-y-6">
          {/* Level Icon */}
          <div className="text-center pt-2">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center mx-auto">
              <span className="text-4xl">{levelIcon}</span>
            </div>
          </div>

          {/* Main Stats */}
          <div className=" flex justify-center gap-6 items-center">
            <div className="text-center">
              <p className="text-light/60 text-sm">Total Wagered</p>
              <p className="text-light text-xl font-bold">${totalWagered.toFixed(2)}</p>
            </div>

            <div className="text-center">
              <p className="text-light/60 text-sm">Current Rank</p>
              <p className="text-light text-xl font-bold tracking-wider">{currentRank}</p>
            </div>
          </div>

          {/* SOL Address */}
          <div className="border-t pt-4 px-4 border-soft/50">
            <p className="text-light/60 text-sm mb-2">SOL Address</p>
            <div className="glass-dark rounded-lg p-3 flex items-center justify-between">
              <p className="text-light/80 text-xs font-mono break-all">{publicKey?.toString() || "Not connected"}</p>
              <button
                onClick={() => navigator.clipboard.writeText(publicKey?.toString() || "")}
                className="text-light/60 hover:text-light transition-colors p-1 hover:bg-light/10 rounded-lg cursor-pointer"
              >
                <Copy size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
