// components/proof/ManualVerification.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Copy, CheckCircle, ClipboardCheck, Search } from "lucide-react";
import { firstHmac, verifyCrash, verifyDice, verifyMines, verifyCoinflip } from "@/utils/provablyFair";

type GameType = "crash" | "dice" | "mines" | "coinflip" | "slots" | "plinko";

interface Props {
  /** optional hint from URL (?gameType=... or ?game=...) */
  gameTypeHint?: GameType;
  /** optional initial values from URL (?serverSeed=... etc) */
  initial?: Partial<Record<string, string>>;
}

const gameTypes: { value: GameType; label: string }[] = [
  { value: "crash", label: "Crash" },
  { value: "dice", label: "Dice" },
  { value: "mines", label: "Mines" },
  { value: "coinflip", label: "Coinflip" },
  { value: "slots", label: "Slots (HMAC check)" },
  { value: "plinko", label: "Plinko (HMAC check)" },
];

function toNum(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && !Number.isNaN(n) ? n : fallback;
}

export default function ManualVerification({ gameTypeHint, initial }: Props) {
  // ---------- Game ----------
  const [gameType, setGameType] = useState<GameType>(gameTypeHint || "crash");

  // ---------- Common ----------
  const [clientSeed, setClientSeed] = useState(initial?.clientSeed || "");
  const [serverSeedHex, setServerSeedHex] = useState(
    initial?.serverSeedHex || initial?.serverSeed || ""
  );
  const [nonce, setNonce] = useState(initial?.nonce || "");

  // ---------- Dice / Slots / Plinko ----------
  const [expectedHmac, setExpectedHmac] = useState(initial?.expectedHmac || "");

  // ---------- Mines ----------
  const [playerPk58, setPlayerPk58] = useState(initial?.player || (initial as any)?.playerPk || "");
  const [rows, setRows] = useState<number>(toNum(initial?.rows, 5));
  const [cols, setCols] = useState<number>(toNum(initial?.cols, 5));
  const [mines, setMines] = useState<number>(toNum(initial?.mines, 3));
  const [firstSafeIndex, setFirstSafeIndex] = useState<string>(initial?.firstSafeIndex ?? "");

  // ---------- Coinflip ----------
  const [clientSeedA, setClientSeedA] = useState(initial?.clientSeedA || "");
  const [clientSeedB, setClientSeedB] = useState(initial?.clientSeedB || "");

  // ---------- UI ----------
  const [copied, setCopied] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Lock game from hint (once)
  useEffect(() => {
    if (gameTypeHint) setGameType(gameTypeHint);
  }, [gameTypeHint]);

  // Hydrate whenever parent passes new initial (from URL)
  useEffect(() => {
    if (!initial) return;
    if (initial.serverSeedHex || initial.serverSeed) {
      setServerSeedHex((initial.serverSeedHex || initial.serverSeed) as string);
    }
    if (initial.clientSeed !== undefined) setClientSeed(initial.clientSeed);
    if (initial.nonce !== undefined) setNonce(initial.nonce);
    if (initial.expectedHmac !== undefined) setExpectedHmac(initial.expectedHmac);

    // mines
    if (initial.player || (initial as any).playerPk)
      setPlayerPk58(initial.player || (initial as any).playerPk || "");
    if (initial.rows !== undefined) setRows(toNum(initial.rows, 5));
    if (initial.cols !== undefined) setCols(toNum(initial.cols, 5));
    if (initial.mines !== undefined) setMines(toNum(initial.mines, 3));
    if (initial.firstSafeIndex !== undefined) setFirstSafeIndex(initial.firstSafeIndex);

    // coinflip
    if (initial.clientSeedA !== undefined) setClientSeedA(initial.clientSeedA);
    if (initial.clientSeedB !== undefined) setClientSeedB(initial.clientSeedB);
  }, [initial]);

  const canVerify = useMemo(() => {
    if (!serverSeedHex || !nonce) return false;
    switch (gameType) {
      case "crash":
      case "dice":
      case "slots":
      case "plinko":
        return true;
      case "coinflip":
        return !!clientSeedA || !!clientSeedB;
      case "mines":
        return !!playerPk58 && rows > 0 && cols > 0 && mines > 0;
      default:
        return false;
    }
  }, [gameType, serverSeedHex, nonce, clientSeedA, clientSeedB, playerPk58, rows, cols, mines]);

  async function handleVerify() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      switch (gameType) {
        case "dice": {
          const out = await verifyDice({ serverSeedHex, clientSeed, nonce });
          const ok = expectedHmac ? expectedHmac.trim().toLowerCase() === out.hmacHex : undefined;
          setResult({ ...out, matchExpected: ok });
          break;
        }
        case "crash": {
          const out = await verifyCrash({ serverSeedHex, clientSeed, nonce });
          setResult(out);
          break;
        }
        case "mines": {
          const out = await verifyMines({
            serverSeedHex,
            clientSeed,
            nonce,
            playerPubkeyBase58: playerPk58,
            rows: Number(rows),
            cols: Number(cols),
            mines: Number(mines),
            firstSafeIndex: firstSafeIndex === "" ? null : Number(firstSafeIndex),
          });
          setResult(out);
          break;
        }
        case "coinflip": {
          const out = await verifyCoinflip({ serverSeedHex, clientSeedA, clientSeedB, nonce });
          setResult(out);
          break;
        }
        case "slots":
        case "plinko": {
          const h = await firstHmac(serverSeedHex, clientSeed, nonce);
          const ok = expectedHmac ? expectedHmac.trim().toLowerCase() === h : undefined;
          setResult({
            firstHmacHex: h,
            matchExpected: ok,
            note: "Full outcome replay not shown; firstHMAC matches backend reveal.",
          });
          break;
        }
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  const copy = async (txt: string, key: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch {}
  };

  return (
    <div className="glass rounded-2xl p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-light mb-2 flex items-center gap-2">
          <ClipboardCheck size={24} />
          Manual Verification
        </h2>
        <p className="text-soft">Verify a game result using the exact provably-fair formulas.</p>
      </div>

      {/* Grid layout: 4 inputs (3 text + 1 dropdown) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Game Type Dropdown */}
        <div>
          <label className="block text-sm font-medium text-light mb-2">Game Type</label>
          <div className="relative">
            <select
              value={gameType}
              onChange={(e) => setGameType(e.target.value as GameType)}
              className="w-full glass-dark rounded-xl px-4 py-3 text-light bg-transparent border border-purple/20 focus:border-neon-pink focus:outline-none appearance-none cursor-pointer"
            >
              {gameTypes.map((t) => (
                <option key={t.value} value={t.value} className="bg-background text-light">
                  {t.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 -translate-y-1/2 text-soft pointer-events-none"
              size={20}
            />
          </div>
        </div>

        {/* Server Seed */}
        <div>
          <label className="block text-sm font-medium text-light mb-2">
            Server Seed (Hex)
          </label>
          <input
            value={serverSeedHex}
            onChange={(e) => setServerSeedHex(e.target.value.trim())}
            placeholder="32-byte hex e.g. a1b2..."
            className="w-full glass-dark rounded-xl px-4 py-3 text-light bg-transparent border border-purple/20 focus:border-neon-pink focus:outline-none placeholder-soft/50"
          />
        </div>

        {/* Client Seed */}
        <div>
          <label className="block text-sm font-medium text-light mb-2">Client Seed</label>
          <input
            value={clientSeed}
            onChange={(e) => setClientSeed(e.target.value)}
            placeholder="optional for some games"
            className="w-full glass-dark rounded-xl px-4 py-3 text-light bg-transparent border border-purple/20 focus:border-neon-pink focus:outline-none placeholder-soft/50"
          />
        </div>

        {/* Nonce */}
        <div>
          <label className="block text-sm font-medium text-light mb-2">Nonce</label>
          <input
            value={nonce}
            onChange={(e) => setNonce(e.target.value)}
            placeholder="e.g., 1758392469756"
            className="w-full glass-dark rounded-xl px-4 py-3 text-light bg-transparent border border-purple/20 focus:border-neon-pink focus:outline-none placeholder-soft/50"
          />
        </div>
      </div>

      {/* Additional fields based on game type */}
      {(gameType === "slots" || gameType === "plinko" || gameType === "dice") && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-light mb-2">
            Expected HMAC (from reveal)
          </label>
          <input
            value={expectedHmac}
            onChange={(e) => setExpectedHmac(e.target.value)}
            placeholder="Optional: compare with reveal firstHmacHex"
            className="w-full glass-dark rounded-xl px-4 py-3 text-light bg-transparent border border-purple/20 focus:border-neon-pink focus:outline-none placeholder-soft/50"
          />
        </div>
      )}

      {gameType === "mines" && (
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-light mb-2">
              Player Pubkey (base58)
            </label>
            <input
              value={playerPk58}
              onChange={(e) => setPlayerPk58(e.target.value)}
              placeholder="Your wallet pubkey"
              className="w-full glass-dark rounded-xl px-4 py-3 text-light bg-transparent border border-purple/20 focus:border-neon-pink focus:outline-none placeholder-soft/50"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-light mb-2">Rows</label>
              <input
                type="number"
                value={rows}
                onChange={(e) => setRows(Number(e.target.value))}
                className="w-full glass-dark rounded-xl px-3 py-2 text-light bg-transparent border border-purple/20 focus:border-neon-pink focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-light mb-2">Cols</label>
              <input
                type="number"
                value={cols}
                onChange={(e) => setCols(Number(e.target.value))}
                className="w-full glass-dark rounded-xl px-3 py-2 text-light bg-transparent border border-purple/20 focus:border-neon-pink focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-light mb-2">Mines</label>
              <input
                type="number"
                value={mines}
                onChange={(e) => setMines(Number(e.target.value))}
                className="w-full glass-dark rounded-xl px-3 py-2 text-light bg-transparent border border-purple/20 focus:border-neon-pink focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-light mb-2">
              First Safe Index (optional)
            </label>
            <input
              value={firstSafeIndex}
              onChange={(e) => setFirstSafeIndex(e.target.value)}
              placeholder="0-based tile index of your first click, or leave blank"
              className="w-full glass-dark rounded-xl px-4 py-3 text-light bg-transparent border border-purple/20 focus:border-neon-pink focus:outline-none placeholder-soft/50"
            />
          </div>
        </div>
      )}

      {gameType === "coinflip" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-light mb-2">Client Seed A</label>
            <input
              value={clientSeedA}
              onChange={(e) => setClientSeedA(e.target.value)}
              className="w-full glass-dark rounded-xl px-4 py-3 text-light bg-transparent border border-purple/20 focus:border-neon-pink focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-light mb-2">Client Seed B</label>
            <input
              value={clientSeedB}
              onChange={(e) => setClientSeedB(e.target.value)}
              className="w-full glass-dark rounded-xl px-4 py-3 text-light bg-transparent border border-purple/20 focus:border-neon-pink focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Verify button at bottom */}
      <button
        onClick={handleVerify}
        disabled={busy || !canVerify}
        className="w-full bg-neon-pink text-light py-4 rounded-xl font-medium transition-all duration-300 hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {busy ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-light" /> Verifying…
          </>
        ) : (
          <>
            <Search size={18} /> Verify
          </>
        )}
      </button>

      {/* Result */}
      {error && (
        <div className="mt-6 p-4 glass-dark rounded-xl border border-red-400/30 text-red-300">
          {error}
        </div>
      )}

      {result && !error && (
        <div className="mt-6 p-4 glass-dark rounded-xl border border-purple/20 space-y-3">
          {"roll" in result && (
            <>
              <h3 className="text-lg font-medium text-light">Dice Roll</h3>
              <div className="text-light text-xl font-semibold">{result.roll}</div>
            </>
          )}
          {"crashAtMul" in result && (
            <>
              <h3 className="text-lg font-medium text-light">Crash Multiplier</h3>
              <div className="text-light text-xl font-semibold">
                {Number(result.crashAtMul).toFixed(2)}x
              </div>
              <p className="text-xs text-soft">Derived from HMAC → u64 → r → edge-adjustment.</p>
            </>
          )}
          {"bombIndices" in result && (
            <>
              <h3 className="text-lg font-medium text-light">Mines — Bomb Indices</h3>
              <code className="text-xs text-soft break-words leading-5 block">
                {result.bombIndices.join(", ")}
              </code>
            </>
          )}
          {"outcome" in result && (
            <>
              <h3 className="text-lg font-medium text-light">Coinflip Outcome</h3>
              <div className="text-light text-xl font-semibold capitalize">{result.outcome}</div>
            </>
          )}
          {"firstHmacHex" in result && (
            <>
              <h3 className="text-lg font-medium text-light">First HMAC</h3>
              <div className="flex items-center gap-2">
                <code className="font-mono text-xs text-light bg-background/50 p-2 rounded flex-1 break-all">
                  {result.firstHmacHex}
                </code>
                <button
                  onClick={() => copy(result.firstHmacHex, "firstHmac")}
                  className="text-soft hover:text-neon-pink"
                >
                  {copied === "firstHmac" ? <CheckCircle size={16} /> : <Copy size={16} />}
                </button>
              </div>
              {typeof result.matchExpected === "boolean" && (
                <div className={`text-sm ${result.matchExpected ? "text-green-400" : "text-red-400"}`}>
                  {result.matchExpected ? "Matches expected ✓" : "Does not match expected ✗"}
                </div>
              )}
              {result.note && <p className="text-xs text-soft/80">{result.note}</p>}
            </>
          )}
          {result.hmacHex && (
            <>
              <h3 className="text-lg font-medium text-light">HMAC (Hex)</h3>
              <div className="flex items-center gap-2">
                <code className="font-mono text-xs text-light bg-background/50 p-2 rounded flex-1 break-all">
                  {result.hmacHex}
                </code>
                <button onClick={() => copy(result.hmacHex, "hmac")} className="text-soft hover:text-neon-pink">
                  {copied === "hmac" ? <CheckCircle size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
