"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import WinsTable from "../../common/WinsTable";

import {
  subscribeBotActivities,
  subscribeBigWins,
  subscribeJackpotWins,
  getRecentActivities,
  getRecentBigWins,
  getRecentJackpotWins,
  hydrateRecentFromServer,
  hydrateRecentBigWinsFromServer,
  hydrateRecentJackpotWinsFromServer,
} from "@/utils/api/adminbot";

// ------------------ Types ------------------
interface User {
  address: string;
  icon: string;
}
interface Game {
  name: string;
  image: string;
}
interface WinRow {
  user: User;
  game: Game;
  time: string;
  bet: string;
  multiplier: string;
  payout: string;
}

type Category = "Live Wins" | "Big Wins" | "Jackpot Wins";

// ------------------ Helpers ------------------
const CURRENCY = "SOL";
const MAX_ROWS = 8;

const truncate = (s: string) =>
  s?.length > 8 ? `${s.slice(0, 2)}...${s.slice(-4)}` : s || "";
const avatar = (who: string) =>
  `https://picsum.photos/seed/u-${encodeURIComponent(who)}/100/100`;
const banner = (game: string) =>
  `https://picsum.photos/seed/g-${encodeURIComponent(game)}/200/120`;

function prettyGameName(raw: string): string {
  const r = String(raw || "").toLowerCase();
  if (r === "memeslot" || r === "slots") return "Slots";
  if (r === "coinflip") return "Coinflip";
  if (r === "plinko") return "Plinko";
  if (r === "mines") return "Mines";
  if (r === "dice") return "Dice";
  if (r === "crash") return "Crash";
  return r.charAt(0).toUpperCase() + r.slice(1);
}

const fmt = (n: number): string =>
  n === 0 ? "0.00" : n < 0.01 ? n.toFixed(4) : n < 1 ? n.toFixed(3) : n.toFixed(2);

const timeAgoShort = (from: number, now: number): string => {
  const sec = Math.max(0, Math.floor((now - from) / 1000));
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}

// ------------------ Internal Row ------------------
type Internal = {
  id: string;
  receivedAt: number;
  userKey: string;
  gameName: string;
  bet: number;
  multiplier: number;
  payout: number;
};

/** Accepts BotActivity or raw server event; only convert wins for the table */
function fromEvent(ev: any): Internal | null {
  // Only wins for the table
  if (String(ev?.action) !== "win") return null;

  const userKey = String(ev?.username || ev?.user || "player");
  const bet = Number(ev?.amount ?? ev?.amountSol ?? 0);
  const mult =
    typeof ev?.multiplier === "number"
      ? ev.multiplier
      : typeof ev?.multiplier === "string"
      ? Number(ev.multiplier)
      : 1;

  let payout = Number(ev?.result ?? ev?.payoutSol ?? 0);
  if (!(payout > 0)) payout = Math.max(0, bet * (mult || 1));

  const ts = typeof ev?.ts === "number" ? ev.ts : Date.now();

  return {
    id: `${ts}-${Math.random().toString(36).slice(2)}`,
    receivedAt: ts,
    userKey,
    gameName: prettyGameName(String(ev?.game || "game")),
    bet,
    multiplier: mult || 1,
    payout,
  };
}

// ------------------ Component ------------------
const categories: Category[] = ["Live Wins", "Big Wins", "Jackpot Wins"];

const SectionAllWins: React.FC = () => {
  const [liveRows, setLiveRows] = useState<Internal[]>([]);
  const [bigRows, setBigRows] = useState<Internal[]>([]);
  const [jackpotRows, setJackpotRows] = useState<Internal[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>("Live Wins");
  const tickRef = useRef<number>(0);

  // 🔥 Seed all three from SERVER on first mount
  useEffect(() => {
    (async () => {
      // Live (all wins)
      const all = await hydrateRecentFromServer(MAX_ROWS);
      const seededAll: Internal[] = [];
      for (const ev of all) {
        const r = fromEvent(ev);
        if (r) seededAll.push(r);
        if (seededAll.length >= MAX_ROWS) break;
      }
      if (seededAll.length) setLiveRows(seededAll.slice(0, MAX_ROWS));
      else {
        const recent = getRecentActivities(MAX_ROWS);
        const fallback: Internal[] = [];
        for (const ev of recent) {
          const r = fromEvent(ev);
          if (r) fallback.push(r);
          if (fallback.length >= MAX_ROWS) break;
        }
        if (fallback.length) setLiveRows(fallback.slice(0, MAX_ROWS));
      }

      // Big Wins (server-filtered)
      const big = await hydrateRecentBigWinsFromServer(MAX_ROWS);
      const seededBig: Internal[] = [];
      for (const ev of big) {
        const r = fromEvent(ev);
        if (r) seededBig.push(r);
        if (seededBig.length >= MAX_ROWS) break;
      }
      if (seededBig.length) setBigRows(seededBig.slice(0, MAX_ROWS));
      else {
        const recBig = getRecentBigWins(MAX_ROWS);
        const fb: Internal[] = [];
        for (const ev of recBig) {
          const r = fromEvent(ev);
          if (r) fb.push(r);
          if (fb.length >= MAX_ROWS) break;
        }
        if (fb.length) setBigRows(fb.slice(0, MAX_ROWS));
      }

      // Jackpot Wins (server-filtered)
      const jack = await hydrateRecentJackpotWinsFromServer(MAX_ROWS);
      const seededJack: Internal[] = [];
      for (const ev of jack) {
        const r = fromEvent(ev);
        if (r) seededJack.push(r);
        if (seededJack.length >= MAX_ROWS) break;
      }
      if (seededJack.length) setJackpotRows(seededJack.slice(0, MAX_ROWS));
      else {
        const recJack = getRecentJackpotWins(MAX_ROWS);
        const fb: Internal[] = [];
        for (const ev of recJack) {
          const r = fromEvent(ev);
          if (r) fb.push(r);
          if (fb.length >= MAX_ROWS) break;
        }
        if (fb.length) setJackpotRows(fb.slice(0, MAX_ROWS));
      }
    })();
  }, []);

  // ✅ Subscribe to live (all activity wins only)
  useEffect(() => {
    const off = subscribeBotActivities?.((ev: any) => {
      if (String(ev?.action) !== "win") return;
      const r = fromEvent(ev);
      if (!r) return;
      setLiveRows((prev) => [r, ...prev].slice(0, MAX_ROWS));
    });
    return () => {
      if (typeof off === "function") off();
    };
  }, []);

  // ✅ Subscribe to Big Wins (server-filtered)
  useEffect(() => {
    const off = subscribeBigWins?.((ev: any) => {
      const r = fromEvent(ev);
      if (!r) return;
      setBigRows((prev) => [r, ...prev].slice(0, MAX_ROWS));
    });
    return () => {
      if (typeof off === "function") off();
    };
  }, []);

  // ✅ Subscribe to Jackpot Wins (server-filtered)
  useEffect(() => {
    const off = subscribeJackpotWins?.((ev: any) => {
      const r = fromEvent(ev);
      if (!r) return;
      setJackpotRows((prev) => [r, ...prev].slice(0, MAX_ROWS));
    });
    return () => {
      if (typeof off === "function") off();
    };
  }, []);

  // ⏱ 1s heartbeat to refresh “time ago”
  useEffect(() => {
    const id = window.setInterval(() => {
      tickRef.current = Date.now();
      // trigger re-render
      setLiveRows((prev) => prev.slice(0));
      setBigRows((prev) => prev.slice(0));
      setJackpotRows((prev) => prev.slice(0));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const now = Date.now();

  // pick rows by active category (no manual filtering)
  const selectedRows = activeCategory === "Live Wins" ? liveRows : activeCategory === "Big Wins" ? bigRows : jackpotRows;

  const tableData: WinRow[] = useMemo(() => {
    if (!selectedRows.length) return [];
    return selectedRows.map((r) => ({
      user: { address: truncate(r.userKey), icon: avatar(r.userKey) },
      game: { name: r.gameName, image: banner(r.gameName) },
      time: timeAgoShort(r.receivedAt, now),
      bet: fmt(r.bet),
      multiplier: String(r.multiplier),
      payout: fmt(r.payout),
    }));
  }, [selectedRows, now]);

  return (
    <section className="my-3">
      <div className="w-full glass rounded-2xl p-6 mx-auto max-w-[1440px] border border-purple/20 overflow-hidden">
        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 md:gap-4 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 md:gap-4 min-w-max">
              {categories.map((category) => {
                const isActive = activeCategory === category;
                return (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`flex items-center px-3 md:px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap
                      ${isActive ? "bg-soft/20 text-light " : "text-soft hover:text-light hover:bg-soft/10 "}
                    `}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Table */}
        <WinsTable data={tableData} />
      </div>
    </section>
  );
};

export default SectionAllWins;
