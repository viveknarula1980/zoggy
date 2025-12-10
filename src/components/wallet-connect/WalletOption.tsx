"use client";

import { LucideIcon } from "lucide-react";

interface WalletOptionProps {
  name: string;
  icon: LucideIcon;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}

const WalletOption = ({ name, icon: Icon, description, onClick, disabled }: WalletOptionProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full p-4 bg-background/80 rounded-xl group transition-colors duration-200
        ${disabled ? "opacity-50 cursor-not-allowed" : "hover:cursor-pointer"}`}
    >
      <div className="flex items-center gap-4">
        <div className="w-8 h-8"><Icon className="w-8 h-8 text-neon-pink" /></div>
        <div className="flex-1 text-left">
          <div
            className={`font-semibold transition-colors ${
              disabled ? "text-gray-400" : "text-light group-hover:text-neon-pink"
            }`}
          >
            {name}
          </div>
          <div className="text-sm text-soft">{description}</div>
        </div>
        <div
          className={`transition-colors ${
            disabled ? "text-gray-400" : "text-soft group-hover:text-neon-pink"
          }`}
        >
          →
        </div>
      </div>
    </button>
  );
};

export default WalletOption;
