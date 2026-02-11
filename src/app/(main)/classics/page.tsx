"use client";

import React, { useEffect, useState } from "react";
import ClassicsHeader from "@/components/sections/classics/ClassicsHeader";
import ClassicsGamesGrid from "@/components/sections/classics/ClassicsGamesGrid";
import ClassicsCallToAction from "@/components/sections/classics/ClassicsCallToAction";
import WalletConnectPopup from "@/components/wallet-connect/WalletConnectPopup";
import { useWallet } from "@solana/wallet-adapter-react";

interface GameData {
    id: string;
    title: string;
    image: string;
    path: string;
}

const ClassicsPage = () => {
    const [isWalletPopupOpen, setIsWalletPopupOpen] = useState(false);
    const [games, setGames] = useState<GameData[]>([]);
    const { connected } = useWallet();
    useEffect(() => {
        const fetchGames = async () => {
            try {
                // Use Next.js API proxy to avoid CORS
                const res = await fetch('/api/admin/games');
                const data = await res.json();


                // Filter only enabled & running games
                const activeGames = data.filter((g: any) => g.enabled && g.running);

                // Map API response -> GameData format
                const mapped: GameData[] = activeGames.map((g: any) => {
                    switch (g.id) {
                        case "coinflip":
                            return {
                                id: g.id,
                                title: "Coin Flip",
                                image: "/assets/display-images/coinflip.png",
                                path: "/coinflip",
                            };
                        case "crash":
                            return {
                                id: g.id,
                                title: "Crash",
                                image: "/assets/display-images/crash.png",
                                path: "/crash",
                            };
                        case "mines":
                            return {
                                id: g.id,
                                title: "Mines",
                                image: "/assets/display-images/mines.png",
                                path: "/mines",
                            };
                        case "plinko":
                            return {
                                id: g.id,
                                title: "Plinko",
                                image: "/assets/display-images/plinko.png",
                                path: "/plinko",
                            };
                        case "dice":
                            return {
                                id: g.id,
                                title: "Dice Roll",
                                image: "/assets/display-images/dice.png",
                                path: "/dice",
                            };
                        case "slots":
                            return {
                                id: g.id,
                                title: "Slot Machine",
                                image: "/assets/display-images/memeslot.png",
                                path: "/slots",
                            };
                        default:
                            return null;
                    }
                }).filter(Boolean); // remove nulls

                setGames(mapped);
            } catch (err) {
                console.error("Error fetching games:", err);
            }
        };

        fetchGames();
    }, []);

    const handleConnectWallet = () => {
        setIsWalletPopupOpen(true);
    };

    return (
        <>
            <div className="min-h-screen bg-background pt-4 md:pt-16 pb-12 md:px-4">
                {/* Background decorative elements */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-20 left-10 w-64 h-64 bg-neon-pink/5 rounded-full filter blur-3xl"></div>
                    <div className="absolute top-40 right-20 w-80 h-80 bg-purple/5 rounded-full filter blur-3xl"></div>
                    <div className="absolute bottom-20 left-1/3 w-96 h-96 bg-neon-pink/3 rounded-full filter blur-3xl"></div>
                </div>

                <div className="max-w-7xl mx-auto relative z-10">
                    {/* <ClassicsHeader /> */}
                    <ClassicsGamesGrid games={games} />
                    {!connected && <ClassicsCallToAction onConnectWallet={handleConnectWallet} />}
                </div>
            </div>

            {/* Wallet Connect Popup */}
            {isWalletPopupOpen && <WalletConnectPopup isOpen={isWalletPopupOpen} onClose={() => setIsWalletPopupOpen(false)} />}
        </>
    );
};

export default ClassicsPage;
