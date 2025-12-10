"use client";
import React, { useEffect, useState } from "react";
import FeaturedGameCard from "../../common/FeaturedGameCard";
import GameStats from "../../common/GameStats";
import GameCarousel from "../../common/GameCarousel";
import Link from "next/link";

// UI reference for popular games
const POPULAR_GAMES = [
    {
        id: "crash",
        title: "Crash",
        image: "/assets/display-images/crash.png",
        category: "Slots",
        isPopular: true,
        onlineCount: 1234,
        path: "/crash",
    },
    {
        id: "plinko",
        title: "Plinko",
        image: "/assets/display-images/plinko.png",
        category: "Plinko",
        onlineCount: 856,
        path: "/plinko",
    },
    {
        id: "coinflip",
        title: "Coin Flip",
        image: "/assets/display-images/coinflip.png",
        category: "Dice",
        onlineCount: 2100,
        path: "/coinflip",
    },
    {
        id: "mines",
        title: "Mines",
        image: "/assets/display-images/mines.png",
        category: "Mines",
        isPopular: true,
        onlineCount: 1567,
        path: "/mines",
    },
    {
        id: "dice",
        title: "Dice",
        image: "/assets/display-images/dice.png",
        category: "Dice",
        onlineCount: 945,
        path: "/dice",
    },
    {
        id: "slots",
        title: "Slots",
        image: "/assets/display-images/memeslot.png",
        category: "Slots",
        onlineCount: 1890,
        path: "/slots",
    },
];

const SectionGames = () => {
    const [activeGames, setActiveGames] = useState<typeof POPULAR_GAMES>([]);

    useEffect(() => {
        const fetchGames = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/games`);
                const data = await res.json();


                // filter only enabled & running
                const runningGames = data.filter((g: any) => g.enabled && g.running);

                // match backend IDs with POPULAR_GAMES definitions
                const mapped = POPULAR_GAMES.filter((pg) => runningGames.some((rg: any) => rg.id === pg.id));

                setActiveGames(mapped);
            } catch (err) {
                console.error("Error fetching games:", err);
            }
        };

        fetchGames();
    }, []);

    return (
        <section className="relative my-3">
            {/* Decorative spots */}
            <div className="absolute -top-20 left-[15%] w-60 h-60 bg-purple/10 rounded-full filter blur-3xl"></div>
            <div className="absolute -bottom-20 right-[10%] w-72 h-72 bg-neon-pink/10 rounded-full filter blur-3xl"></div>

            <div className="w-full glass rounded-2xl px-6 pt-6 pb-0 mx-auto max-w-[1440px] border border-purple/20 relative overflow-hidden">
                {/* Inner glass effect spots */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-neon-pink/5 rounded-full filter blur-3xl"></div>
                <div className="absolute -bottom-40 -left-20 w-80 h-80 bg-purple/5 rounded-full filter blur-3xl"></div>

                <div className="relative z-10">
                    {/* Casino Games Carousel - only active from backend */}
                    <GameCarousel games={activeGames} title="Casino Games" indicatorColor="var(--color-neon-pink)" />
                </div>
            </div>
        </section>
    );
};

export default SectionGames;
