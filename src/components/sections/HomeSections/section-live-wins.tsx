"use client";
import { useEffect, useMemo, useState } from "react";
import GameWinCard from "../../common/GameWinCard";

// ⬇️ make sure this path matches where your helpers live
import { subscribeBotActivities, getRecentActivities, isFeedConnected } from "@/utils/api/adminbot";

interface WinCard {
    amount: number; // payout in SOL (wins only)
    image: string; // preview image
    id: string; // truncated username/address like "3A...6Nfh"
    game: string; // game name
}

const MAX_CARDS = 15;

// Map game names to their display images
const imageFor = (game: string) => {
    const gameMap: Record<string, string> = {
        crash: "/assets/display-images/crash.png",
        slots: "/assets/display-images/memeslot.png",
        mines: "/assets/display-images/mines.png",
        dice: "/assets/display-images/dice.png",
        plinko: "/assets/display-images/plinko.png",
        coinflip: "/assets/display-images/coinflip.png",
    };
    return gameMap[game.toLowerCase()] || "/assets/display-images/crash.png";
};

const truncate = (s: string) => {
    const str = String(s || "");
    return str.length <= 8 ? str : `${str.slice(0, 2)}...${str.slice(-4)}`;
};

function toCardFromEvent(ev: any): WinCard | null {
    if (String(ev?.action) !== "win") return null;

    const username = String(ev?.username || ev?.user || "player");
    const game = String(ev?.game || "game");
    const bet = Number(ev?.amount ?? ev?.amountSol ?? 0);
    const mult = typeof ev?.multiplier === "number" ? ev.multiplier : typeof ev?.multiplier === "string" ? Number(ev.multiplier) : 1;

    // Prefer server payout if present; else compute bet * multiplier
    const payout = Number(ev?.result ?? ev?.payoutSol ?? 0) > 0 ? Number(ev?.result ?? ev?.payoutSol ?? 0) : Math.max(0, bet * (mult || 1));

    if (!(payout > 0)) return null;

    return {
        amount: Number(payout < 0.01 ? payout.toFixed(4) : payout < 1 ? payout.toFixed(3) : payout.toFixed(2)),
        image: imageFor(game),
        id: truncate(username),
        game: game,
    };
}

const LiveWinsSection = () => {
    const [winCards, setWinCards] = useState<WinCard[]>([]);
    const feedUp = useMemo(() => isFeedConnected?.() ?? true, []);

    // seed from recent real activities
    useEffect(() => {
        const recent = getRecentActivities?.(200) || [];
        const seeded: WinCard[] = [];
        for (const ev of recent) {
            const card = toCardFromEvent(ev);
            if (card) {
                seeded.push(card);
                if (seeded.length >= MAX_CARDS) break;
            }
        }
        if (seeded.length) setWinCards(seeded);
    }, []);

    // subscribe live
    useEffect(() => {
        const unsub = subscribeBotActivities?.((ev: any) => {
            const card = toCardFromEvent(ev);
            if (!card) return;
            setWinCards((prev) => [card, ...prev].slice(0, MAX_CARDS));
        });
        return () => {
            if (typeof unsub === "function") unsub();
        };
    }, []);

    return (
        <div className="relative flex pt-4 md:pt-10 z-0">
            {/* Decorative spots */}
            <div className="absolute top-0 right-[25%] w-48 h-48 bg-neon-pink/10 rounded-full filter blur-3xl"></div>
            <div className="absolute bottom-0 left-[20%] w-56 h-56 bg-purple/10 rounded-full filter blur-3xl"></div>

            <section className="w-full glass rounded-2xl px-6 pt-4 mx-auto max-w-[1440px] border border-purple/20 relative overflow-hidden">
                {/* Inner glass effect spots */}
                <div className="absolute -top-20 -left-20 w-64 h-64 bg-neon-pink/5 rounded-full filter blur-3xl"></div>
                <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-purple/5 rounded-full filter blur-3xl"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-3 h-3 animate-pulse rounded-full bg-neon-pink"></div>
                        <h2 className="text-light text-xl font-semibold">Live Wins{feedUp ? "" : " "}</h2>
                    </div>

                    <div className="relative overflow-x-hidden">
                        <div className="flex gap-3 min-w-max pb-4">
                            {winCards.map((card, index) => (
                                <GameWinCard key={`${card.id}-${index}`} amount={card.amount} image={card.image} id={card.id} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default LiveWinsSection;
