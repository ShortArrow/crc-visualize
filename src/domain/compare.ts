import { bitEndStep, reflectValue, registerValue, type CrcParams, type Step } from "./trace";

/** The shift a register value is held by: left as the hardware model holds it, right reflected in width bits. */
export type Shift = "left" | "right";

/** One number of your log against the register at the same point; step is the step that ends there (0 for init). */
export type LogRow = Readonly<{ at: "init" | number; yours: bigint; computed: bigint; ok: boolean; step: number }>;

/** A log compared row by row, after each byte or each bit; firstDiff is the index of the first row that differs. */
export type LogMatch = Readonly<{ unit: "byte" | "bit"; shift: Shift; rows: readonly LogRow[]; firstDiff: number | undefined }>;

/** A log whose count fits neither the bytes nor the bits of the input; bytes is left out when the input is not whole bytes. */
export type LogError = Readonly<{ code: "logCount"; got: number; bytes?: number; bits: number }>;

/** A received frame pasted on the Check page that is shorter than the CRC; bytes is the least it can be. */
export type ReceivedError = Readonly<{ code: "receivedShort"; bytes: number }>;

/** The errors of comparing pasted values beyond reading them. */
export type CompareError = LogError | ReceivedError;

type Point = Readonly<{ at: "init" | number; step: number }>;

/** The points a log of count numbers stands for, or undefined when count fits none of n, n + 1, 8n and 8n + 1. */
function pointsOf(steps: readonly Step[], count: number): Readonly<{ unit: "byte" | "bit"; points: Point[] }> | undefined {
  const bits = steps[0]!.stream.length;
  const ends = (unit: "byte" | "bit", n: number, withInit: boolean) => ({
    unit,
    points: [
      ...(withInit ? [{ at: "init" as const, step: 0 }] : []),
      ...Array.from({ length: n }, (_, k) => ({ at: k, step: bitEndStep(steps, unit === "byte" ? 8 * k + 7 : k) })),
    ],
  });
  if (bits % 8 === 0 && (count === bits / 8 || count === bits / 8 + 1)) return ends("byte", bits / 8, count === bits / 8 + 1);
  if (count === bits || count === bits + 1) return ends("bit", bits, count === bits + 1);
  return undefined;
}

/**
 * Compares your log with the register of steps after each byte or bit, as spec chapter 16 says: its count tells which, and an
 * extra first number is init. With refin = refout = true it is compared as a right shift holds the register when its first number
 * matches that and not the left shift.
 */
export function matchLog(
  params: CrcParams,
  steps: readonly Step[],
  log: readonly bigint[],
): { ok: true; value: LogMatch } | { ok: false; error: LogError } {
  const bits = steps[0]!.stream.length;
  const found = pointsOf(steps, log.length);
  if (!found)
    return { ok: false, error: { code: "logCount", got: log.length, ...(bits % 8 === 0 ? { bytes: bits / 8 } : {}), bits } };
  const left = found.points.map((p) => registerValue(steps[p.step]!.reg));
  const right = left.map((v) => reflectValue(v, params.width));
  const shift: Shift = params.refin && params.refout && log[0] === right[0] && log[0] !== left[0] ? "right" : "left";
  const computed = shift === "right" ? right : left;
  const rows = found.points.map((p, i) => ({ ...p, yours: log[i]!, computed: computed[i]!, ok: log[i] === computed[i] }));
  const firstDiff = rows.findIndex((r) => !r.ok);
  return { ok: true, value: { unit: found.unit, shift, rows, firstDiff: firstDiff >= 0 ? firstDiff : undefined } };
}
