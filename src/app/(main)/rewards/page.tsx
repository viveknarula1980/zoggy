"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ChevronRight, TrendingUp, Trophy, User, Crown, Wallet, Check, Target, Lock } from "lucide-react";
import ToastService from "@/utils/toastService";
import { RewardsApiService, Range, Level, UserRewardProgress } from "@/utils/api/rewardsApi";

export default function RewardsPage() {
    const { connected, publicKey } = useWallet();
    const [ranges, setRanges] = useState<Range[]>([]);
    const [levels, setLevels] = useState<Level[]>([]);
    const [userProgress, setUserProgress] = useState<UserRewardProgress | null>(null);
    const [loading, setLoading] = useState(true);
    const [claimingLevels, setClaimingLevels] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (connected && publicKey) {
            loadRewardsData();
        } else {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connected, publicKey]);

    const safeNum = (v: any): number => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    };

    const loadRewardsData = async () => {
        try {
            setLoading(true);
            const [rangesData, levelsData, progress] = await Promise.all([
                RewardsApiService.fetchRanges(),
                RewardsApiService.fetchLevels(),
                publicKey ? RewardsApiService.fetchUserProgress(publicKey.toString()) : null,
            ]);
            setRanges(rangesData.filter((range) => (range as any).isActive ?? true));
            setLevels(levelsData.filter((level) => (level as any).isActive ?? true));
            setUserProgress(progress);
        } catch (error) {
            console.error("Failed to load rewards data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleClaimReward = async (levelId: number) => {
        if (!publicKey || !userProgress || claimingLevels.has(levelId)) return;

        const level = levels.find((l) => (l as any).id === levelId);

        setClaimingLevels((prev) => new Set(prev).add(levelId));
        const claimingToast = ToastService.rewardClaiming((level as any)?.title || "reward");

        try {
            await RewardsApiService.claimReward(publicKey.toString(), levelId);
            ToastService.dismiss(claimingToast);
            ToastService.rewardClaimed((level as any)?.title || "reward");
            await loadRewardsData();
        } catch (error) {
            console.error("Failed to claim reward:", error);
            ToastService.dismiss(claimingToast);
            ToastService.rewardError((level as any)?.title || "reward");
        } finally {
            setClaimingLevels((prev) => {
                const newSet = new Set(prev);
                newSet.delete(levelId);
                return newSet;
            });
        }
    };

    const formatAmount = (amount: number) => {
        const n = safeNum(amount);
        if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
        if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
        return `$${n.toFixed(2)}`;
    };

    const parseWageringAmount = (wagering: string | null | undefined) => {
        if (!wagering) return 0;
        const num = parseFloat(String(wagering).replace(/[^0-9.]/g, ""));
        return Number.isFinite(num) ? num : 0;
    };

    const getProgress = (current: number, wagering: string | null | undefined) => {
        const requirement = parseWageringAmount(wagering);
        if (requirement <= 0) return 100;
        return Math.min((safeNum(current) / requirement) * 100, 100);
    };

    const getCurrentRange = () => {
        if (!userProgress?.currentLevel) return null;
        return ranges.find((range: any) => range.id === (userProgress as any).currentLevel?.range_id) || null;
    };

    const getNextLevel = () => {
        if (!userProgress?.currentLevel) {
            return levels.find((level: any) => level.level_number === 1) || null;
        }
        return levels.find(
            (level: any) => level.level_number === (userProgress as any).currentLevel!.level_number + 1
        ) || null;
    };

    /* ------------------------- Image helpers (API-first) ------------------------- */
    // Try common field names that API might return for images/icons.
    const pickImageField = (obj: any): string | undefined => {
        if (!obj) return undefined;
        const candidate =
            obj.imageUrl ??
            obj.image_url ??
            obj.image ??
            obj.iconUrl ??
            obj.icon_url ??
            obj.icon ??
            obj.avatarUrl ??
            obj.avatar_url ??
            obj.avatar ??
            obj.badgeImage ??
            obj.badge_image;
        return (typeof candidate === "string" && candidate.trim()) ? candidate : undefined;
    };

    const DEFAULT_AVATAR = (id: number | string) => `/assets/Zoggy-rank-icons/avatar${id || 1}.png`;

    // Get rank-based avatar image (same logic as ProfileOverview)
    const getRankAvatar = (level: number) => {
        // Calculate range ID based on level (same as ProfileOverview)
        const rangeId = Math.max(1, Math.ceil(level / 5)); // Every 5 levels = new range
        return `/assets/Zoggy-rank-icons/avatar${rangeId}.png`;
    };

    const getRangeImage = (rangeId?: number | string): string => {
        const range = ranges.find((r: any) => r.id === rangeId);
        const apiImg = pickImageField(range);
        return apiImg || DEFAULT_AVATAR(rangeId ?? 1);
    };

    const getLevelImage = (level: any): string => {
        const apiImg = pickImageField(level);
        if (apiImg) return apiImg;
        return getRangeImage(level?.range_id);
    };

    // Use current user level to get rank avatar (same as ProfileOverview)
    const currentUserLevel = (userProgress as any)?.currentLevel?.level_number ?? 1;
    const currentRangeImage = getRankAvatar(currentUserLevel);

    if (!connected) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center pt-20">
                <div className="text-center">
                    <Wallet size={64} className="mx-auto mb-4 text-purple/50" />
                    <h2 className="text-2xl font-bold text-light mb-2">Connect Your Wallet</h2>
                    <p className="text-soft">Please connect your wallet to view rewards</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pt-12 pb-12 px-4">
            <div className="layout-wrapper">
                <div className="glass rounded-2xl p-6 border border-soft/10 mb-8">
                    {/* Top Progress Section */}
                    {loading ? (
                        <div className="animate-pulse flex flex-col w-full mb-8">
                            <div className="flex gap-8">
                                <div className="h-48 flex items-center">
                                    <div className="w-32 h-32 bg-soft/20 rounded-full"></div>
                                </div>
                                <div className="flex flex-col h-48 justify-center">
                                    <div className="h-8 bg-soft/20 rounded-md w-48 mb-6"></div>
                                    <div className="flex items-center justify-center mb-4 gap-2">
                                        <div className="h-16 bg-soft/20 rounded w-32"></div>
                                        <div className="h-16 bg-soft/20 rounded w-8"></div>
                                        <div className="h-16 bg-soft/20 rounded w-32"></div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-start w-full max-w-5xl">
                                <div className="w-full max-w-5xl">
                                    <div className="h-2 bg-soft/20 rounded-full mb-2"></div>
                                    <div className="flex justify-between">
                                        <div className="h-4 bg-soft/20 rounded w-32"></div>
                                        <div className="h-4 bg-soft/20 rounded w-32"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col w-full mb-8">
                            <div className="flex gap-8">
                                <div className="h-48 flex items-center">
                                    <img
                                        src={currentRangeImage}
                                        alt="Current Rank"
                                        className="w-32 h-32 rounded-full border-2 border-purple-500/30 object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = DEFAULT_AVATAR(Math.max(1, Math.ceil(currentUserLevel / 5)));
                                        }}
                                    />
                                </div>
                                <div className="flex flex-col h-48 justify-center">
                                    <div className="px-4 py-2 max-w-fit rounded-md bg-soft/20 text-light font-bold text-sm mb-6 flex items-center gap-2">
                                        {userProgress?.currentLevel ? (
                                            `${getCurrentRange()?.name} - ${(userProgress as any).currentLevel.title}`
                                        ) : (
                                            <><User className="w-4 h-4" /> New Blood</>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-center mb-4">
                                        <span className="text-6xl font-bold">{formatAmount((userProgress as any)?.currentWagered || 0)}</span>
                                        <span className="mx-2 text-6xl text-soft">/</span>
                                        <span className="text-6xl text-light">
                                            {userProgress?.nextLevel
                                                ? formatAmount(parseWageringAmount((userProgress as any).nextLevel.wagering))
                                                : "Max"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Progress Display */}
                            <div className="flex flex-col items-start w-full ">
                                <div className="w-full">
                                    <div className="h-2 bg-soft/20 rounded-full">
                                        <div
                                            className="h-2 bg-soft rounded-full transition-all duration-300"
                                            style={{
                                                width: userProgress?.nextLevel
                                                    ? `${getProgress(
                                                          (userProgress as any).currentWagered,
                                                          (userProgress as any).nextLevel.wagering
                                                      )}%`
                                                    : "100%",
                                            }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-md text-soft mt-2">
                                        <span className="flex items-center gap-1">
                                            {userProgress?.currentLevel ? (
                                                `${getCurrentRange()?.name} - ${(userProgress as any).currentLevel.title}`
                                            ) : (
                                                <><User className="w-4 h-4" /> New Blood</>
                                            )}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            {userProgress?.nextLevel ? (
                                                `${(ranges as any).find((r: any) => r.id === (userProgress as any).nextLevel?.range_id)?.name} - ${
                                                      (userProgress as any).nextLevel.title
                                                  }`
                                            ) : (
                                                <><Crown className="w-4 h-4" /> Max Rank</>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Levels */}
                <div className="glass rounded-2xl p-6 border border-soft/10 mb-8">
                    <div className="flex mb-8">
                        <div className="py-2 text-white font-medium flex items-center gap-2">👑 Ranks</div>
                    </div>
                    <div className="text-left mb-8">
                        <p className="text-soft max-w-5xl">
                            Progress through different ranges and unlock levels by wagering. Each range represents a tier of
                            achievement, with multiple levels to unlock within each range.
                        </p>
                    </div>

                    {loading ? (
                        <div className="animate-pulse">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="glass h-[450px] rounded-2xl p-2 border border-soft/20">
                                        <div className="w-full h-[70%] bg-soft/20 rounded-xl mb-4"></div>
                                        <div className="px-2">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="h-5 bg-soft/20 rounded w-24"></div>
                                                <div className="h-4 bg-soft/20 rounded w-16"></div>
                                            </div>
                                            <div className="w-full bg-soft/20 rounded-full h-2 mb-4"></div>
                                            <div className="h-10 bg-soft/20 rounded-xl"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {levels.map((level: any) => {
                                const current = safeNum((userProgress as any)?.currentWagered);
                                const requirement = parseWageringAmount(level.wagering);
                                const progress = getProgress(current, level.wagering);
                                const isUnlocked = requirement === 0 || current >= requirement;
                                const isClaimed = (userProgress as any)?.claimedLevels?.includes(level.id) || false;
                                const canClaim = isUnlocked && !isClaimed;
                                const isClaiming = claimingLevels.has(level.id);

                                const levelImg = getLevelImage(level);
                                const fallbackImg = getRangeImage(level?.range_id);

                                return (
                                    <div
                                        key={level.id}
                                        className={`glass h-[450px] rounded-2xl p-2 text-center border border-soft/20 ${
                                            isUnlocked ? "border-green-500/30" : ""
                                        }`}
                                    >
                                        <div className="w-full h-[70%] flex items-center justify-center mx-auto mb-4 overflow-hidden">
                                            <img
                                                src={levelImg}
                                                alt={level.title}
                                                className="w-full rounded-xl border border-soft/20 h-full scale-[97%] object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = fallbackImg || DEFAULT_AVATAR(level?.range_id);
                                                }}
                                            />
                                        </div>

                                        <div className="text-center mb-4">
                                            <div className="flex justify-between items-center">
                                                <div className="mb-2">
                                                    <h3 className="text-light text-md font-bold">{level.title}</h3>
                                                </div>
                                                <div className="text-sm text-soft mb-1">
                                                    {formatAmount(current)} / {formatAmount(requirement)}
                                                </div>
                                            </div>
                                            <div className="w-full bg-soft/20 rounded-full h-2">
                                                <div
                                                    className="bg-soft h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => canClaim && !isClaiming && handleClaimReward(level.id)}
                                            className={`relative w-full py-2.5 px-4 rounded-xl font-medium transition-all duration-200 overflow-hidden ${
                                                isClaiming
                                                    ? "bg-neon-pink/80 cursor-not-allowed text-white"
                                                    : canClaim
                                                    ? "bg-neon-pink cursor-pointer text-white animate-pulse hover:animate-none shadow-[0_0_15px_2px_rgba(255,20,147,0.6)] hover:shadow-[0_0_25px_4px_rgba(255,20,147,0.8)] transform hover:scale-105"
                                                    : isClaimed
                                                    ? "bg-green-600/30 text-green-400 cursor-not-allowed border border-green-500/30"
                                                    : "bg-neon-pink/70 text-light cursor-not-allowed"
                                            }`}
                                            disabled={!canClaim || isClaiming}
                                        >
                                            {isClaiming && (
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                                            )}
                                            <div className="relative flex items-center justify-center gap-2">
                                                {isClaiming ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        <span>Claiming...</span>
                                                    </>
                                                ) : isClaimed ? (
                                                    <>
                                                        <Check className="w-4 h-4 text-green-400" />
                                                        <span>Claimed</span>
                                                    </>
                                                ) : canClaim ? (
                                                    <>
                                                        <Target className="w-4 h-4 animate-bounce" />
                                                        <span>Claim Rank</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Lock className="w-4 h-4" />
                                                        <span>Locked</span>
                                                    </>
                                                )}
                                            </div>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
