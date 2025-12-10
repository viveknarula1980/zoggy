// utils/provablyFair.ts
import { base58Decode, bytesToHex, concatBytes, hexToBytes, hmacSha256, strToBytes } from "./crypto";

function u32be(b: Uint8Array): number {
  return ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
}
function u64FromFirst8BE(b: Uint8Array): bigint {
  return (BigInt(b[0]) << 56n) |
         (BigInt(b[1]) << 48n) |
         (BigInt(b[2]) << 40n) |
         (BigInt(b[3]) << 32n) |
         (BigInt(b[4]) << 24n) |
         (BigInt(b[5]) << 16n) |
         (BigInt(b[6]) << 8n)  |
          BigInt(b[7]);
}

export async function verifyDice(params: { serverSeedHex: string; clientSeed: string; nonce: string | number }) {
  const key = hexToBytes(params.serverSeedHex);
  const msgA = strToBytes(String(params.clientSeed || ""));
  const msgB = strToBytes(String(params.nonce));
  const h = await hmacSha256(key, [msgA, msgB]);
  const v = u32be(h.subarray(0, 4));
  const roll = (v % 100) + 1;
  return { roll, hmacHex: bytesToHex(h) };
}

export async function verifyCrash(params: { serverSeedHex: string; clientSeed: string; nonce: string | number }) {
  const key = hexToBytes(params.serverSeedHex);
  const h = await hmacSha256(key, [String(params.clientSeed || ""), strToBytes(String(params.nonce))]);
  const n64 = u64FromFirst8BE(h);
  const r = Number((n64 >> 11n)) / Math.pow(2, 53);
  const edge = 0.99;
  const m = Math.max(1.01, edge / (1 - Math.min(0.999999999999, r)));
  const crashAtMul = Math.min(m, 10000);
  return { crashAtMul, r, n64: n64.toString(), hmacHex: bytesToHex(h) };
}

export async function verifyCoinflip(params: { serverSeedHex: string; clientSeedA: string; clientSeedB: string; nonce: string | number }) {
  const key = hexToBytes(params.serverSeedHex);
  const h = await hmacSha256(key, [
    String(params.clientSeedA || ""), "|",
    String(params.clientSeedB || ""), "|",
    strToBytes(String(params.nonce)),
  ]);
  const bit = h[0] & 1;
  return { outcome: bit === 0 ? "heads" : "tails", bit, hmacHex: bytesToHex(h) };
}

export async function firstHmac(serverSeedHex: string, clientSeed: string, nonce: string | number) {
  const key = hexToBytes(serverSeedHex);
  const h = await hmacSha256(key, [String(clientSeed || ""), strToBytes(String(nonce))]);
  return bytesToHex(h);
}

export async function verifyMines(params: {
  serverSeedHex: string;
  clientSeed: string;
  nonce: string | number;
  playerPubkeyBase58: string;
  rows: number;
  cols: number;
  mines: number;
  firstSafeIndex?: number | null;
}) {
  const { serverSeedHex, clientSeed, nonce, playerPubkeyBase58, rows, cols, mines, firstSafeIndex } = params;
  const key = hexToBytes(serverSeedHex);
  const pkBytes = base58Decode(playerPubkeyBase58); // 32 bytes
  const seedKey = await hmacSha256(key, [pkBytes, strToBytes(String(nonce)), strToBytes(String(clientSeed || ""))]);

  const total = rows * cols;
  const picked = new Set<number>();
  let i = 0;
  while (picked.size < mines) {
    const h = await hmacSha256(seedKey, [strToBytes(String(i++))]);
    const n = u32be(h.subarray(0, 4));
    const idx = n % total;
    if (firstSafeIndex != null && idx === firstSafeIndex) continue;
    picked.add(idx);
  }
  const bombIndices = [...picked].sort((a, b) => a - b);
  const firstHmacHex = await firstHmac(serverSeedHex, clientSeed, nonce);
  return { bombIndices, firstHmacHex };
}
