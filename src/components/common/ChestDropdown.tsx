// app/components/ChestDropdown.tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Crown, Gift, Trophy } from "lucide-react";
import Image from "next/image";

import ToastService from "@/utils/toastService";
import { getDailyEligibility, getWeeklyEligibility, claimChestReward } from "@/utils/api/chestapi";
// ^ claimChestReward left as-is so your parent flow remains the same,
//   but we only call it AFTER eligibility passes.

interface ChestDropdownProps {
  balance?: number;
  onRewardClaimed?: (rewardType: string, reward: number | string) => void;
}

const ChestDropdown = ({ balance = 1234, onRewardClaimed }: ChestDropdownProps) => {
  const [isChestDropdownOpen, setIsChestDropdownOpen] = useState(false);
  const chestDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chestDropdownRef.current && !chestDropdownRef.current.contains(event.target as Node)) {
        setIsChestDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // SAME UI, ONLY CHANGE: show toast for weekly ineligible (map message→reason handled in API)
  const handleClaim = async (type: string) => {
    try {
      const isWeekly = /week/i.test(type);

      if (isWeekly) {
        const r = await getWeeklyEligibility();
        if (!r?.eligible) {
          // ✅ show backend reason (normalized in API as reason || message)
          ToastService.rewardNotEligible(r?.reason || "Not eligible for weekly chest yet.");
          return; // block popup
        }
      } else {
        const r = await getDailyEligibility();
        if (!r?.eligible) {
          // ✅ show backend reason for daily as well
          ToastService.rewardNotEligible(r?.reason || "Not eligible for daily chest yet.");
          return; // block popup
        }
      }

      // Passed eligibility → proceed with your existing flow
      const reward = await claimChestReward(type);
      onRewardClaimed?.(type, reward);
      setIsChestDropdownOpen(false);
    } catch (e: any) {
      // surface backend error exactly
      if (e?.message) ToastService.rewardError(e.message);
    }
  };

  return (
    <div className="relative" ref={chestDropdownRef}>
      <button
        onClick={() => setIsChestDropdownOpen(!isChestDropdownOpen)}
        className="flex items-center gap-0.5 sm:gap-1 bg-background-secondary hover:bg-background-secondary/30 text-light h-9 sm:h-10 md:h-12 px-2 sm:px-3 md:px-4 py-2 rounded-lg sm:rounded-xl transition-all duration-300 border border-purple/30"
      >
        <Crown size={18} className="text-neon-pink sm:w-5 sm:h-5" />
        <ChevronDown
          size={14}
          className={`sm:w-4 sm:h-4 transition-transform duration-300 ${isChestDropdownOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isChestDropdownOpen && (
        <div className="fixed md:absolute right-2 md:-right-3 left-0 md:left-auto top-20 md:top-16 w-full md:w-[400px] max-w-[100vw] px-3 md:px-4 py-3 md:py-4 rounded-xl border border-soft/10 bg-[#17132d] backdrop-blur-md drop-shadow-2xl z-50">
          <div className="py-2 border-b border-purple/30">
            <p className="text-sm text-light font-medium">Your Chests</p>
            <p className="text-xs text-soft">Balance: {balance.toLocaleString()}</p>
          </div>

          <div className="flex flex-col gap-3 md:gap-4 mt-2">
            {/* Daily Chest */}
            <div className="w-full text-left px-3 md:px-4 py-3 md:py-2 text-soft hover:text-light bg-background-secondary/50 rounded-xl transition-colors duration-200">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 md:gap-3">
                <div>
                  <h4 className="text-sm md:text-md text-light flex items-center gap-2">
                    Daily Chest
                  </h4>
                  <p className="text-xs text-soft">Available every 24 hours</p>
                </div>
                <button
                  onClick={() => handleClaim("Daily Chest")}
                  className="group text-sm md:text-md text-light rounded-xl transition-colors duration-200 w-full sm:w-auto cursor-pointer"
                >
                  <div className="relative w-16 h-16">
                    {/* Default Image */}
                    <Image
                      src="/assets/Chests/source/red chest.png"
                      alt="closed chest"
                      fill
                      quality={100}
                      sizes="48px"
                      priority
                      className="object-cover transition-opacity duration-200 group-hover:opacity-0"
                    />

                    {/* Hover Image */}
                    <Image
                      src="/assets/Chests/source/red.png"
                      alt="open chest"
                      fill
                      quality={100}
                      sizes="48px"
                      priority
                      className="object-cover opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    />
                  </div>
                </button>
              </div>
            </div>

            {/* Weekly Chest */}
            <div className="w-full text-left px-3 md:px-4 py-3 md:py-2 text-soft hover:text-light bg-background-secondary/50 rounded-xl transition-colors duration-200">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 md:gap-3">
                <div>
                  <h4 className="text-sm md:text-md text-light flex items-center gap-2">
                    Weekly Chest
                  </h4>
                  <p className="text-xs text-soft">Available every 7 days</p>
                </div>
                <button
                  onClick={() => handleClaim("Weekly Chest")}
                  className="group text-sm md:text-md text-light rounded-xl transition-colors duration-200 w-full sm:w-auto cursor-pointer"
                >
                  <div className="relative w-16 h-16">
                    {/* Default Image */}
                    <Image
                      src="/assets/Chests/source/purple chest.png"
                      alt="closed chest"
                      fill
                      quality={100}
                      sizes="48px"
                      priority
                      className="object-cover transition-opacity duration-200 group-hover:opacity-0"
                    />

                    {/* Hover Image */}
                    <Image
                      src="/assets/Chests/source/open purple.png"
                      alt="open chest"
                      fill
                      quality={100}
                      sizes="48px"
                      priority
                      className="object-cover scale-110 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChestDropdown;
