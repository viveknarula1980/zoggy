"use client";

import React from "react";
import { Shield } from "lucide-react";

interface ProvablyFairButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

const ProvablyFairButton: React.FC<ProvablyFairButtonProps> = ({ 
  onClick, 
  disabled = false 
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-2 text-soft hover:text-neon-pink hover:bg-purple/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="Provably Fair Details"
    >
      <Shield className="w-4 h-4" />
    </button>
  );
};

export default ProvablyFairButton;
