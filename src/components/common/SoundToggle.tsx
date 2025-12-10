"use client";

import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface SoundToggleProps {
  soundsEnabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

const SoundToggle: React.FC<SoundToggleProps> = ({
  soundsEnabled,
  onToggle,
  disabled = false,
}) => {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className="p-2 text-soft hover:text-neon-pink hover:bg-purple/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title={soundsEnabled ? 'Disable sounds' : 'Enable sounds'}
    >
      {soundsEnabled ? (
        <Volume2 className="w-4 h-4" />
      ) : (
        <VolumeX className="w-4 h-4" />
      )}
    </button>
  );
};

export default SoundToggle;
