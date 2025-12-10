"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import GameCard from "@/components/admin/GameCard";
import GameManagementModal from "@/components/admin/GameManagementModal";
import GameStats from "@/components/admin/games/GameStats";
import { GameSettings } from "@/components/admin/GameSettingsModal";
import { GamesApiService } from "@/utils/api/gamesApi";
import { LoadingState, StatsGridSkeleton } from "@/components/admin/common/SkeletonLoader";
import { useAdmin } from "@/contexts/AdminContext";

export default function GamesManagement() {
    const [games, setGames] = useState<GameSettings[]>([]);
    const [selectedGame, setSelectedGame] = useState<GameSettings | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // auth
    const { isAuthenticated, isLoading: authLoading } = useAdmin();
    const router = useRouter();

    // Auth guard: redirect to login if unauthenticated after auth check
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            try {
                router.replace("/admin/login");
            } catch {}
        }
    }, [authLoading, isAuthenticated, router]);

    // Fetch games data when authenticated
    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) return;

        loadGames();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, isAuthenticated]);

    const loadGames = async () => {
        try {
            setLoading(true);
            setError(null);
            const gamesData = await GamesApiService.fetchGames();
            console.log("gamesData", gamesData);
            setGames(gamesData);
        } catch (err) {
            setError("Failed to load games data");
            console.error("Error loading games:", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleGameEnabled = async (gameId: string) => {
        try {
            const game = games.find((g) => g.id === gameId);
            if (!game) return;

            const newEnabledState = !game.enabled;

            // Make API call first
            await GamesApiService.toggleGameEnabled(gameId, newEnabledState);

            // Update state only after successful API call
            // When enabling, set running to true. When disabling, set running to false
            setGames(games.map((g) => (g.id === gameId ? { ...g, enabled: newEnabledState, running: newEnabledState } : g)));
        } catch (err) {
            console.error("Error toggling game enabled:", err);
            // No need to revert since we didn't update state yet
        }
    };

    const toggleGameRunning = async (gameId: string) => {
        try {
            const game = games.find((g) => g.id === gameId);
            if (!game) return;

            const newRunningState = !game.running;

            // Make API call first
            await GamesApiService.toggleGameRunning(gameId, newRunningState);

            // Update state only after successful API call
            setGames(games.map((g) => (g.id === gameId ? { ...g, running: newRunningState } : g)));
        } catch (err) {
            console.error("Error toggling game running:", err);
            // No need to revert since we didn't update state yet
        }
    };

    const openGameSettings = (game: GameSettings) => {
        setSelectedGame(game);
        setShowSettings(true);
    };

    const updateGameSettings = async (updatedGame: GameSettings) => {
        try {
            // Find current game to preserve enabled/running state
            const currentGame = games.find((g) => g.id === updatedGame.id);
            if (!currentGame) return;

            // Create final update with preserved states
            const finalUpdate = {
                ...updatedGame,
                enabled: currentGame.enabled,
                running: currentGame.running,
            };

            // Make API call first
            await GamesApiService.updateGame(finalUpdate.id, finalUpdate);

            // Update state after successful API call
            setGames(games.map((game) => (game.id === finalUpdate.id ? finalUpdate : game)));

            setShowSettings(false);
            setSelectedGame(null);
        } catch (err) {
            console.error("Error updating game settings:", err);
            // No need to revert since we update after API call
        }
    };

    const totalRevenue = games.reduce((sum, game) => sum + game.revenue, 0);
    const activeGames = games.filter((game) => game.enabled && game.running).length;
    const totalGames = games.length;
    const totalPlayed = games.reduce((sum, game) => sum + game.totalPlayed, 0);

    // While auth is being checked, show skeleton to avoid flash
    if (authLoading) {
        return (
            <div className="flex h-screen">
                <AdminSidebar />

                <div className="flex-1 flex flex-col overflow-hidden">
                    <AdminHeader title="Games Management" subtitle="Configure and monitor your gaming platform" />

                    <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        <div className="space-y-6">
                            <StatsGridSkeleton columns={4} />
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="glass rounded-xl p-6 border border-soft/10 animate-pulse">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="h-6 bg-soft/20 rounded w-24"></div>
                                                <div className="h-6 bg-soft/20 rounded w-16"></div>
                                            </div>
                                            <div className="h-4 bg-soft/20 rounded w-32"></div>
                                            <div className="space-y-2">
                                                <div className="h-3 bg-soft/20 rounded w-full"></div>
                                                <div className="h-3 bg-soft/20 rounded w-3/4"></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    // If not authenticated (authLoading is false) we've already redirected; return null to avoid UI flash.
    if (!isAuthenticated) return null;

    return (
        <div className="flex h-screen">
            <AdminSidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                <AdminHeader title="Games Management" subtitle="Configure and monitor your gaming platform" />

                <main className="flex-1 overflow-y-auto custom-scrollbar p-6">

                    {/* Overview Stats */}
                    {!loading && !error && (
                        <GameStats 
                            totalGames={totalGames}
                            activeGames={activeGames}
                            totalRevenue={totalRevenue}
                            totalPlayed={totalPlayed}
                        />
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="space-y-6">
                            <StatsGridSkeleton columns={4} />
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="glass rounded-xl p-6 border border-soft/10 animate-pulse">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="h-6 bg-soft/20 rounded w-24"></div>
                                                <div className="h-6 bg-soft/20 rounded w-16"></div>
                                            </div>
                                            <div className="h-4 bg-soft/20 rounded w-32"></div>
                                            <div className="space-y-2">
                                                <div className="h-3 bg-soft/20 rounded w-full"></div>
                                                <div className="h-3 bg-soft/20 rounded w-3/4"></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-6">
                            <p className="text-red-400">{error}</p>
                            <button onClick={loadGames} className="mt-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors">
                                Retry
                            </button>
                        </div>
                    )}

                    {/* Games Grid */}
                    {!loading && !error && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {games.map((game) => (
                                <GameCard key={game.id} game={game} onClick={openGameSettings} />
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {/* Game Management Modal */}
            {showSettings && selectedGame && (
                <GameManagementModal
                    game={selectedGame}
                    onSave={updateGameSettings}
                    onToggleEnabled={toggleGameEnabled}
                    onToggleRunning={toggleGameRunning}
                    onClose={() => {
                        setShowSettings(false);
                        setSelectedGame(null);
                    }}
                />
            )}
        </div>
    );
}
