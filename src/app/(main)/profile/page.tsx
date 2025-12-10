"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import ProfileOverview from "@/components/profile/ProfileOverview";
import TransactionHistory from "@/components/profile/TransactionHistory";
import LeaderboardRank from "@/components/profile/LeaderboardRank";
import { getMockProfile, type UserProfile } from "@/utils/api/profileapi";

export default function ProfilePage() {
  const { connected, publicKey } = useWallet();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      setIsLoading(true);
      const loadProfileData = async () => {
        try {
          const profileData = getMockProfile(publicKey.toString());
          setProfile(profileData);
        } catch (error) {
          console.error("Failed to fetch profile data:", error);
        } finally {
          setIsLoading(false);
        }
      };

      loadProfileData();
    } else {
      setProfile(null);
      setIsLoading(false);
    }
  }, [connected, publicKey]);

  if (!connected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-6 md:p-8 border border-purple/20 text-center max-w-md w-full">
          <h1 className="text-xl md:text-2xl font-bold text-light mb-4">Connect Your Wallet</h1>
          <p className="text-sm md:text-base text-light/60">Please connect your wallet to view your profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background md:p-4 pt-4 md:pt-14">
      <div className="layout-wrapper space-y-4 md:space-y-6">
        <ProfileOverview profile={profile} isLoading={isLoading} />
        <TransactionHistory isLoading={isLoading} />
        <LeaderboardRank isLoading={isLoading} />
      </div>
    </div>
  );
}
