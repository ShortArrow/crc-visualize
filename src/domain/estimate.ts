import { CATALOGUE, type Preset } from "./presets";
import { reflectValue, type CrcParams } from "./trace";

/** A pair of data (bytes) and its CRC. */
export type Sample = Readonly<{ data: readonly number[]; crc: bigint }>;

/** A candidate found by brute force. initKnown is false when init and xorout could not be told apart (shown with init = 0). */
export type Candidate = Readonly<{ params: CrcParams; initKnown: boolean }>;

/**
 * Result of the brute force. tooWide: width is over MAX_BRUTE_WIDTH. needPair: no two pairs have the same length.
 * ok: candidates are every combination that satisfies all pairs.
 */
export type BruteForce = Readonly<{ status: "ok" | "tooWide" | "needPair"; candidates: readonly Candidate[] }>;

/** Widest CRC searched by brute force. */
export const MAX_BRUTE_WIDTH = 16;

/** How the data of a pair is written: text is UTF-8, hex is bytes in hexadecimal. */
export type DataFormat = "text" | "hex";

/** CRC of bytes, a bit at a time like the register of chapter 3, without building steps (fast enough for brute force). */
export function crcBytes(params: CrcParams, bytes: readonly number[]): bigint {
  const { width, poly, refin, refout, xorout } = params;
  const top = 1n << BigInt(width - 1);
  const mask = (1n << BigInt(width)) - 1n;
  let reg = params.init;
  for (const byte of bytes) {
    for (let k = 0; k < 8; k++) {
      const bit = refin ? (byte >> k) & 1 : (byte >> (7 - k)) & 1;
      const feedback = ((reg & top) === 0n ? 0 : 1) ^ bit;
      reg = (reg << 1n) & mask;
      if (feedback) reg ^= poly;
    }
  }
  return (refout ? reflectValue(reg, width) : reg) ^ xorout;
}

/** Bytes of text written in format, or undefined when it cannot be read (hex must be whole bytes; spaces are ignored). */
export function parseData(format: DataFormat, text: string): number[] | undefined {
  if (format === "text") return [...new TextEncoder().encode(text)];
  const digits = text.replace(/\s+/g, "");
  if (!/^([0-9a-f]{2})*$/i.test(digits)) return undefined;
  return Array.from({ length: digits.length / 2 }, (_, i) => parseInt(digits.slice(2 * i, 2 * i + 2), 16));
}

/** A CRC written in hexadecimal (with or without 0x), or undefined when unreadable or not fitting in width bits. */
export function parseCrc(text: string, width: number): bigint | undefined {
  const digits = text.trim().replace(/^0x/i, "");
  if (!/^[0-9a-f]+$/i.test(digits)) return undefined;
  const value = BigInt(`0x${digits}`);
  return value < 1n << BigInt(width) ? value : undefined;
}

/** Presets of width whose CRC of the data equals the CRC for every sample. */
export const catalogueMatches = (samples: readonly Sample[], width: number, presets: readonly Preset[] = CATALOGUE): Preset[] =>
  presets.filter((p) => p.params.width === width && samples.every((s) => crcBytes(p.params, s.data) === s.crc));

/** The catalogue with the presets of width first, then the others, each part in catalogue order. */
export const catalogueByWidth = (width: number, presets: readonly Preset[] = CATALOGUE): Preset[] => [
  ...presets.filter((p) => p.params.width === width),
  ...presets.filter((p) => p.params.width !== width),
];

const xorBytes = (a: readonly number[], b: readonly number[]) => a.map((x, i) => x ^ b[i]!);

/**
 * Tries every poly with its lowest bit set and every refin/refout. Same-length pairs a, b must satisfy
 * crc(a) ⊕ crc(b) = crc(a ⊕ b) with init = xorout = 0, which narrows poly and reflection regardless of init and xorout.
 * With pairs of two or more lengths, every init is tried and xorout follows; otherwise init is left undetermined (0).
 */
export function bruteForce(samples: readonly Sample[], width: number): BruteForce {
  if (width > MAX_BRUTE_WIDTH) return { status: "tooWide", candidates: [] };
  const byLength = new Map<number, Sample[]>();
  for (const s of samples) byLength.set(s.data.length, [...(byLength.get(s.data.length) ?? []), s]);
  const pairs = [...byLength.values()].flatMap((group) =>
    group.slice(1).map((s) => ({ data: xorBytes(group[0]!.data, s.data), crc: group[0]!.crc ^ s.crc })),
  );
  if (pairs.length === 0) return { status: "needPair", candidates: [] };
  const [first] = samples;
  const candidates: Candidate[] = [];
  for (const refin of [false, true]) {
    for (const refout of [false, true]) {
      for (let poly = 1n; poly < 1n << BigInt(width); poly += 2n) {
        const zero: CrcParams = { width, poly, init: 0n, refin, refout, xorout: 0n };
        if (!pairs.every((p) => crcBytes(zero, p.data) === p.crc)) continue;
        if (byLength.size < 2) {
          candidates.push({ params: { ...zero, xorout: first!.crc ^ crcBytes(zero, first!.data) }, initKnown: false });
          continue;
        }
        for (let init = 0n; init < 1n << BigInt(width); init++) {
          const xorout = first!.crc ^ crcBytes({ ...zero, init }, first!.data);
          const params = { ...zero, init, xorout };
          if (samples.every((s) => crcBytes(params, s.data) === s.crc)) candidates.push({ params, initKnown: true });
        }
      }
    }
  }
  return { status: "ok", candidates };
}
