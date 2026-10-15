import { CATALOGUE, type Preset } from "./presets";
import type { CrcParams } from "./trace";

/** A pair of data (bytes) and its CRC. */
export type Sample = Readonly<{ data: readonly number[]; crc: number }>;

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

const reflect = (value: number, width: number): number => {
  let out = 0;
  for (let i = 0; i < width; i++) out = out * 2 + ((value >>> i) & 1);
  return out;
};

/** CRC of bytes, a bit at a time like the register of chapter 3, without building steps (fast enough for brute force). */
export function crcBytes(params: CrcParams, bytes: readonly number[]): number {
  const { width, poly, refin, refout, xorout } = params;
  const top = 2 ** (width - 1);
  const size = 2 ** width;
  let reg = params.init;
  for (const byte of bytes) {
    for (let k = 0; k < 8; k++) {
      const bit = refin ? (byte >> k) & 1 : (byte >> (7 - k)) & 1;
      const feedback = (reg >= top ? 1 : 0) ^ bit;
      reg = ((reg * 2) % size) ^ (feedback ? poly : 0);
      reg >>>= 0;
    }
  }
  return ((refout ? reflect(reg, width) : reg) ^ xorout) >>> 0;
}

/** Bytes of text written in format, or undefined when it cannot be read (hex must be whole bytes; spaces are ignored). */
export function parseData(format: DataFormat, text: string): number[] | undefined {
  if (format === "text") return [...new TextEncoder().encode(text)];
  const digits = text.replace(/\s+/g, "");
  if (!/^([0-9a-f]{2})*$/i.test(digits)) return undefined;
  return Array.from({ length: digits.length / 2 }, (_, i) => parseInt(digits.slice(2 * i, 2 * i + 2), 16));
}

/** A CRC written in hexadecimal (with or without 0x), or undefined when unreadable or not fitting in width bits. */
export function parseCrc(text: string, width: number): number | undefined {
  const digits = text.trim().replace(/^0x/i, "");
  if (!/^[0-9a-f]+$/i.test(digits)) return undefined;
  const value = parseInt(digits, 16);
  return value < 2 ** width ? value : undefined;
}

/** Presets of width whose CRC of the data equals the CRC for every sample. */
export const catalogueMatches = (samples: readonly Sample[], width: number, presets: readonly Preset[] = CATALOGUE): Preset[] =>
  presets.filter((p) => p.params.width === width && samples.every((s) => crcBytes(p.params, s.data) === s.crc));

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
    group.slice(1).map((s) => ({ data: xorBytes(group[0]!.data, s.data), crc: (group[0]!.crc ^ s.crc) >>> 0 })),
  );
  if (pairs.length === 0) return { status: "needPair", candidates: [] };
  const [first] = samples;
  const candidates: Candidate[] = [];
  for (const refin of [false, true]) {
    for (const refout of [false, true]) {
      for (let poly = 1; poly < 2 ** width; poly += 2) {
        const zero: CrcParams = { width, poly, init: 0, refin, refout, xorout: 0 };
        if (!pairs.every((p) => crcBytes(zero, p.data) === p.crc)) continue;
        if (byLength.size < 2) {
          candidates.push({ params: { ...zero, xorout: (first!.crc ^ crcBytes(zero, first!.data)) >>> 0 }, initKnown: false });
          continue;
        }
        for (let init = 0; init < 2 ** width; init++) {
          const xorout = (first!.crc ^ crcBytes({ ...zero, init }, first!.data)) >>> 0;
          const params = { ...zero, init, xorout };
          if (samples.every((s) => crcBytes(params, s.data) === s.crc)) candidates.push({ params, initKnown: true });
        }
      }
    }
  }
  return { status: "ok", candidates };
}
