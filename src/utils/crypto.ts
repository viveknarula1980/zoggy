// utils/crypto.ts

// ---------- Byte utils ----------
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) throw new Error("Bad hex length");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function bytesToHex(buf: ArrayBuffer | Uint8Array): string {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return [...u8].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function strToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

export function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  const len = chunks.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

// Always give WebCrypto a real ArrayBuffer (not SAB / not ArrayBufferLike)
function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  // Fast path when already an exclusive ArrayBuffer view
  if (
    u8.buffer instanceof ArrayBuffer &&
    u8.byteOffset === 0 &&
    u8.byteLength === u8.buffer.byteLength
  ) {
    return u8.buffer;
  }
  // u8.slice() creates a fresh Uint8Array backed by a real ArrayBuffer
  return u8.slice().buffer;
}

// Get WebCrypto in both browser and Node 18+
function getCrypto(): Crypto {
  const g = globalThis as any;
  if (g?.crypto?.subtle) return g.crypto as Crypto;
  throw new Error("WebCrypto API not available in this environment");
}

// ---------- Hashing / HMAC ----------
export async function hmacSha256(
  keyBytes: Uint8Array,
  messageParts: (Uint8Array | string)[]
): Promise<Uint8Array> {
  const c = getCrypto();

  const cryptoKey = await c.subtle.importKey(
    "raw",
    toArrayBuffer(keyBytes),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const msgU8 = concatBytes(
    ...messageParts.map((p) => (typeof p === "string" ? strToBytes(p) : p))
  );

  const sig = await c.subtle.sign("HMAC", cryptoKey, toArrayBuffer(msgU8));
  return new Uint8Array(sig);
}

export async function sha256(bytes: Uint8Array | string): Promise<Uint8Array> {
  const c = getCrypto();
  const u8 = typeof bytes === "string" ? strToBytes(bytes) : bytes;
  const d = await c.subtle.digest("SHA-256", toArrayBuffer(u8));
  return new Uint8Array(d);
}

// ---------- Minimal Base58 decoder (Solana-compatible alphabet) ----------
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const MAP: Record<string, number> = Object.fromEntries(
  [...ALPHABET].map((c, i) => [c, i])
);

export function base58Decode(s: string): Uint8Array {
  if (!s) return new Uint8Array();
  const bytes: number[] = [0];

  for (const ch of s) {
    const val = MAP[ch];
    if (val === undefined) throw new Error("Invalid base58 char");
    let carry = val;
    for (let j = 0; j < bytes.length; ++j) {
      const x = bytes[j] * 58 + carry;
      bytes[j] = x & 0xff;
      carry = x >> 8;
    }
    while (carry) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  // Each leading '1' encodes a leading 0x00 byte
  const leadingOnes = s.match(/^1+/)?.[0].length ?? 0;
  for (let i = 0; i < leadingOnes; i++) bytes.push(0);

  return new Uint8Array(bytes.reverse());
}
