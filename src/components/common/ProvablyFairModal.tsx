// components/common/ProvablyFairModal.tsx
"use client";

import React, { useMemo, useState } from "react";
import Modal from "./Modal";
import { Copy, Check, ExternalLink, ClipboardCheck } from "lucide-react";

/** ========= Types ========= */

export interface MinesProvablyFairData {
  // Game config / state
  nonce: string;
  rows: number;
  cols: number;
  mines: number;
  opened: number[];
  bombIndices: number[];
  firstSafeIndex: number | null;

  // Seeds / proof
  serverSeedHex: string | null;
  serverSeedHash: string; // SHA-256(serverSeedHex) commitment
  clientSeed: string;
  firstHmacHex: string | null; // optional: HMAC(serverSeed, playerPk + nonce + clientSeed)
  formula: string;

  // Result / chain
  payoutLamports: number;
  safeSteps: number;
  tx?: string;
}

export interface DiceRevealSeed {
  nonce: string;
  clientSeed: string;
  formula: string;
  serverSeedHashed: string; // SHA-256(serverSeedHex) commitment
  serverSeedHex?: string;   // revealed after resolve
  hmacHex?: string;         // optional: HMAC(serverSeed, clientSeed + nonce)
  nonce_value?: string;     // legacy compatibility (unused)

  /** Some backends might ALSO tuck coinflip A/B here */
  clientSeedA?: string;
  clientSeedB?: string;
  firstHmacHex?: string | null;
}

export interface DiceRevealProvablyFairData {
  dicereveal_seed?: DiceRevealSeed;
}

export type ProvablyFairUnion = MinesProvablyFairData | DiceRevealProvablyFairData;

type GameType = "crash" | "slots" | "mines" | "dice" | "plinko" | "coinflip";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: ProvablyFairUnion | null;
  /** Defaults to process.env.NEXT_PUBLIC_SOLANA_CLUSTER or "mainnet" */
  solanaCluster?: "mainnet" | "devnet" | "testnet" | string;
  /**
   * Optional hint from the caller telling which game this round belonged to.
   * Use this to disambiguate Crash vs Dice (both have similar seed shapes).
   */
  gameTypeHint?: GameType;
}

/** ========= Type Guards ========= */

const isMinesData = (d: ProvablyFairUnion | null): d is MinesProvablyFairData =>
  !!d && typeof (d as any).bombIndices !== "undefined" && Array.isArray((d as any).bombIndices);

const hasDiceSeed = (d: ProvablyFairUnion | null): d is DiceRevealProvablyFairData =>
  !!d && "dicereveal_seed" in (d as any);

/** Robust coinflip detector: supports root-level and nested-in-dicereveal_seed A/B seeds */
const isCoinflipData = (d: ProvablyFairUnion | null | any): boolean => {
  if (!d || typeof d !== "object") return false;
  // Root-level presence (some apps pass A/B directly on the modal data)
  if (typeof d.clientSeedA === "string" && d.clientSeedA.length) return true;
  if (typeof d.clientSeedB === "string" && d.clientSeedB.length) return true;
  // Nested inside dicereveal_seed (common if you reuse Dice reveal struct for Coinflip)
  if (d.dicereveal_seed && typeof d.dicereveal_seed === "object") {
    const a = d.dicereveal_seed.clientSeedA;
    const b = d.dicereveal_seed.clientSeedB;
    if (typeof a === "string" && a.length) return true;
    if (typeof b === "string" && b.length) return true;
  }
  return false;
};

/** ========= Utils ========= */

const formatLamports = (lamports: number) =>
  (lamports / 1e9).toFixed(9).replace(/0+$/, "").replace(/\.$/, "");

/** Prefer site origin; fallback to localhost */
const getBaseUrl = () => {
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  return "";
};

/** Helper to extract coinflip fields regardless of where they live (root or dicereveal_seed) */
function getCoinflipPieces(d: any) {
  if (!d || typeof d !== "object") return {};
  const seed = d.dicereveal_seed && typeof d.dicereveal_seed === "object" ? d.dicereveal_seed : d;
  return {
    clientSeedA: seed.clientSeedA as string | undefined,
    clientSeedB: seed.clientSeedB as string | undefined,
    serverSeedHex: (seed.serverSeedHex ?? d.serverSeedHex) as string | undefined,
    nonce: (seed.nonce ?? d.nonce) as string | undefined,
    expectedHmac: (seed.firstHmacHex ?? seed.hmacHex ?? d.firstHmacHex) as string | undefined,
  };
}

/** Build manual verify URL (+ prefill). */
function buildManualVerifyUrl(
  d: ProvablyFairUnion | null,
  hint?: GameType
): string {
  const base = `${getBaseUrl()}/fairness`;
  const params = new URLSearchParams();
  params.set("tab", "manual");

  // ===== Decide game type (ORDER MATTERS) =====
  // 1) Explicit hint
  // 2) Mines
  // 3) Coinflip (checks root and nested shapes)
  // 4) Dice (last)
  let inferred: GameType | undefined = undefined;
  if (hint) {
    inferred = hint;
  } else if (isMinesData(d)) {
    inferred = "mines";
  } else if (isCoinflipData(d)) {
    inferred = "coinflip";
  } else if (hasDiceSeed(d)) {
    inferred = "dice";
  }

  if (inferred) {
    // Be generous: some routers read `game`, some read `gameType`
    params.set("gameType", inferred);
    params.set("game", inferred);
  }

  // ===== Prefill seeds where available =====
  if (isMinesData(d)) {
    if (d.clientSeed) params.set("clientSeed", d.clientSeed);
    if (d.serverSeedHex) params.set("serverSeed", d.serverSeedHex);
    if (d.nonce) params.set("nonce", d.nonce);
    if (d.firstHmacHex) params.set("expectedHmac", d.firstHmacHex);
    params.set("rows", String(d.rows));
    params.set("cols", String(d.cols));
    params.set("mines", String(d.mines));
    if (d.firstSafeIndex !== null && d.firstSafeIndex !== undefined) {
      params.set("firstSafeIndex", String(d.firstSafeIndex));
    }
  } else if (isCoinflipData(d)) {
    const cf = getCoinflipPieces(d);
    if (cf.clientSeedA) params.set("clientSeedA", cf.clientSeedA);
    if (cf.clientSeedB) params.set("clientSeedB", cf.clientSeedB);
    if (cf.serverSeedHex) params.set("serverSeed", cf.serverSeedHex);
    if (cf.nonce) params.set("nonce", cf.nonce);
    if (cf.expectedHmac) params.set("expectedHmac", cf.expectedHmac);
  } else if (hasDiceSeed(d) && d?.dicereveal_seed) {
    const seed = d.dicereveal_seed;
    if (seed.clientSeed) params.set("clientSeed", seed.clientSeed);
    if (seed.serverSeedHex) params.set("serverSeed", seed.serverSeedHex);
    if (seed.nonce) params.set("nonce", seed.nonce);
    if (seed.hmacHex) params.set("expectedHmac", seed.hmacHex);
  }

  return `${base}?${params.toString()}`;
}

/** ========= Component ========= */

const ProvablyFairModal: React.FC<Props> = ({
  isOpen,
  onClose,
  data,
  solanaCluster,
  gameTypeHint,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const cluster = solanaCluster || process.env.NEXT_PUBLIC_SOLANA_CLUSTER || "mainnet";

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 1800);
    } catch {
      // no-op
    }
  };

  const CopyButton = ({ text, fieldName }: { text: string; fieldName: string }) => (
    <button
      onClick={() => copyToClipboard(text, fieldName)}
      className="p-1 text-soft hover:text-neon-pink transition-colors cursor-pointer"
      title="Copy to clipboard"
      type="button"
    >
      {copiedField === fieldName ? (
        <Check className="w-4 h-4 text-green-400" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );

  const DataRow = ({
    label,
    value,
    fieldName,
  }: {
    label: string;
    value: string;
    fieldName: string;
  }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-light">{label}</label>
      <div className="flex items-center gap-2 bg-background-secondary border border-purple/30 rounded-lg p-3">
        <code className="flex-1 text-xs text-soft font-mono break-all">{value}</code>
        <CopyButton text={value} fieldName={fieldName} />
      </div>
    </div>
  );

  const explorerHref = (sig: string) =>
    `https://explorer.solana.com/tx/${sig}?cluster=${encodeURIComponent(cluster as string)}`;

  const title = isMinesData(data) ? "Provably Fair — Mines" : "Provably Fair Details";

  const manualVerifyUrl = useMemo(
    () => buildManualVerifyUrl(data, gameTypeHint),
    [data, gameTypeHint]
  );

  const ManualVerifyCta = () => (
    <a
      href={manualVerifyUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-purple/40 bg-background-secondary/60 hover:bg-soft/10 text-light text-sm transition-colors"
      title="Open manual verification page (prefilled)"
    >
      <ClipboardCheck className="w-4 h-4" />
      Manual Verify
      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
    </a>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      {!data ? (
        <div className="text-center py-8">
          <div className="text-soft">No provably fair data yet</div>
          <div className="text-xs text-soft/70 mt-2">
            Finish a round or place a bet to see the commitment &amp; reveal.
          </div>
        </div>
      ) : isMinesData(data) ? (
        /* ======== Mines layout ======== */
        <div className="space-y-5">
          {/* Top actions */}
          <div className="flex items-center justify-end">
            <ManualVerifyCta />
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-background-secondary border border-purple/30 rounded-lg p-3">
              <div className="text-[11px] text-soft uppercase tracking-wide">Nonce</div>
              <div className="text-sm text-light font-mono">{data.nonce}</div>
            </div>
            <div className="bg-background-secondary border border-purple/30 rounded-lg p-3">
              <div className="text-[11px] text-soft uppercase tracking-wide">Grid</div>
              <div className="text-sm text-light">
                {data.rows}×{data.cols}
              </div>
            </div>
            <div className="bg-background-secondary border border-purple/30 rounded-lg p-3">
              <div className="text-[11px] text-soft uppercase tracking-wide">Mines</div>
              <div className="text-sm text-light">{data.mines}</div>
            </div>
            <div className="bg-background-secondary border border-purple/30 rounded-lg p-3">
              <div className="text-[11px] text-soft uppercase tracking-wide">Safe Steps</div>
              <div className="text-sm text-light">{data.safeSteps}</div>
            </div>
          </div>

          {/* Result / Tx */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-background-secondary border border-purple/30 rounded-lg p-3">
              <div className="text-[11px] text-soft uppercase tracking-wide">Payout</div>
              <div className="text-sm text-light font-semibold">
                {formatLamports(data.payoutLamports)} SOL
              </div>
            </div>
            {data.tx ? (
              <div className="bg-background-secondary border border-purple/30 rounded-lg p-3">
                <div className="text-[11px] text-soft uppercase tracking-wide">Resolve Tx</div>
                <div className="text-sm text-light flex items-center gap-2">
                  <a
                    href={explorerHref(data.tx)}
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-neon-pink break-all"
                  >
                    {data.tx}
                  </a>
                  <ExternalLink className="w-4 h-4 text-soft" />
                </div>
              </div>
            ) : null}
          </div>

          {/* Proof */}
          <DataRow
            label="Server Seed (SHA-256, commitment)"
            value={data.serverSeedHash}
            fieldName="serverSeedHash"
          />
          {data.serverSeedHex ? (
            <>
              <DataRow
                label="Server Seed (Hex, revealed)"
                value={data.serverSeedHex}
                fieldName="serverSeedHex"
              />
              {data.firstHmacHex && (
                <DataRow
                  label="HMAC(serverSeed, playerPk + nonce + clientSeed)"
                  value={data.firstHmacHex}
                  fieldName="hmacHex"
                />
              )}
            </>
          ) : (
            <div className="text-xs text-soft/70">
              Server seed reveals after the round resolves.
            </div>
          )}
          <DataRow label="Client Seed" value={data.clientSeed || ""} fieldName="clientSeed" />
          <DataRow label="Formula" value={data.formula} fieldName="formula" />

          {/* Indices */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="text-sm font-medium text-light">Opened (safe) indices</div>
              <div className="bg-background-secondary border border-purple/30 rounded-lg p-3">
                <code className="text-xs text-soft break-words leading-5">
                  {data.opened.length ? data.opened.join(", ") : "—"}
                </code>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-light">Bomb indices</div>
              <div className="bg-background-secondary border border-purple/30 rounded-lg p-3">
                <code className="text-xs text-soft break-words leading-5">
                  {data.bombIndices.length ? data.bombIndices.join(", ") : "—"}
                </code>
              </div>
            </div>
          </div>

          <div className="text-xs text-soft/70">
            First safe index:{" "}
            <span className="font-mono text-light">{data.firstSafeIndex ?? "n/a"}</span>
          </div>
        </div>
      ) : isCoinflipData(data) || gameTypeHint === "coinflip" ? (
        /* ======== Coinflip summary (checked BEFORE dice) ======== */
        <div className="space-y-4">
          <div className="flex items-center justify-end">
            <ManualVerifyCta />
          </div>
          <div className="text-sm text-soft">
            Coinflip provably fair details available. Use <span className="font-medium">Manual Verify</span> to reproduce the outcome.
          </div>
          {(() => {
            const cf = getCoinflipPieces(data);
            return (
              <>
                {cf.clientSeedA && (
                  <DataRow label="Client Seed A" value={cf.clientSeedA} fieldName="clientSeedA" />
                )}
                {cf.clientSeedB && (
                  <DataRow label="Client Seed B" value={cf.clientSeedB} fieldName="clientSeedB" />
                )}
                {cf.serverSeedHex && (
                  <DataRow
                    label="Server Seed (Hex, revealed)"
                    value={cf.serverSeedHex}
                    fieldName="serverSeedHex"
                  />
                )}
                {cf.nonce && <DataRow label="Nonce" value={cf.nonce} fieldName="nonce" />}
              </>
            );
          })()}
        </div>
      ) : hasDiceSeed(data) ? (
        /* ======== Dice/Crash style layout (now AFTER coinflip) ======== */
        <div className="space-y-4">
          {/* Top actions */}
          <div className="flex items-center justify-end">
            <ManualVerifyCta />
          </div>

          {data.dicereveal_seed ? (
            <>
              <div className="text-sm text-soft mb-2">
                Verify using the formula below with the committed server seed and your client seed.
              </div>

              <DataRow label="Nonce" value={data.dicereveal_seed.nonce} fieldName="nonce" />
              <DataRow
                label="Client Seed"
                value={data.dicereveal_seed.clientSeed}
                fieldName="clientSeed"
              />
              <DataRow
                label="Server Seed (SHA-256, commitment)"
                value={data.dicereveal_seed.serverSeedHashed}
                fieldName="serverSeedHashed"
              />

              {data.dicereveal_seed.serverSeedHex ? (
                <>
                  <DataRow
                    label="Server Seed (Hex, revealed)"
                    value={data.dicereveal_seed.serverSeedHex}
                    fieldName="serverSeedHex"
                  />
                  {data.dicereveal_seed.hmacHex && (
                    <DataRow
                      label="HMAC(serverSeed, clientSeed + nonce)"
                      value={data.dicereveal_seed.hmacHex}
                      fieldName="hmacHex"
                    />
                  )}
                </>
              ) : (
                <div className="text-xs text-soft/70">
                  Seed will be revealed immediately after resolution.
                </div>
              )}

              <DataRow label="Formula" value={data.dicereveal_seed.formula} fieldName="formula" />
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-soft">No provably fair data available</div>
              <div className="text-xs text-soft/70 mt-2">
                Place a bet to see the hash commitment, then resolve to see the reveal.
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Fallback if shape is unknown */
        <div className="text-center py-8">
          <div className="text-soft">Unsupported provably fair payload</div>
          <div className="text-xs text-soft/70 mt-2">
            The provided data does not match a known schema.
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ProvablyFairModal;
