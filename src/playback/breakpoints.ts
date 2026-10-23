import type { Step, StepKind } from "../domain/trace";

/**
 * A breakpoint. A line breakpoint belongs to the kind of step its line runs, so it stays on the same line in every code language;
 * with hit, it hits only when that kind has been reached exactly hit times. A bit breakpoint hits at the end of the clock of that
 * bit of the input stream (counted from 0), and a byte breakpoint at the end of the clock of the byte's last bit. A disabled
 * breakpoint never hits.
 */
export type Breakpoint = Readonly<
  | { kind: "line"; runs: StepKind; hit?: number; enabled: boolean }
  | { kind: "byte"; byte: number; enabled: boolean }
  | { kind: "bit"; bit: number; enabled: boolean }
>;

const STEP_KINDS: readonly StepKind[] = ["init", "reflectIn", "feedback", "shift", "xor", "reflectOut", "xorOut", "done"];

/**
 * Identity of a breakpoint, as written in the bp parameter (xor, byte3, bit13): there is at most one per line kind, one per byte
 * and one per bit.
 */
export function breakpointKey(bp: Breakpoint): string {
  switch (bp.kind) {
    case "line":
      return bp.runs;
    case "byte":
      return `byte${bp.byte}`;
    case "bit":
      return `bit${bp.bit}`;
  }
}
const keyOf = breakpointKey;

/**
 * Changes the breakpoint with key: enables or disables it, sets its hit count (undefined to hit every time; ignored on a byte
 * or bit breakpoint), or removes it.
 */
export function editBreakpoint(
  breakpoints: readonly Breakpoint[],
  key: string,
  edit: Readonly<{ enabled?: boolean; hit?: number | undefined }> | "remove",
): Breakpoint[] {
  if (edit === "remove") return breakpoints.filter((b) => keyOf(b) !== key);
  return breakpoints.map((b): Breakpoint => {
    if (keyOf(b) !== key) return b;
    const enabled = edit.enabled ?? b.enabled;
    if (b.kind !== "line") return { ...b, enabled };
    const hit = "hit" in edit ? edit.hit : b.hit;
    return { kind: "line", runs: b.runs, enabled, ...(hit === undefined ? {} : { hit }) };
  });
}

/** Number of steps of kind among steps[0..index]. */
export function hitsUpTo(steps: readonly Step[], index: number, kind: StepKind): number {
  return steps.slice(0, index + 1).filter((s) => s.kind === kind).length;
}

/** Index of the step ending the clock of bit of the input stream, or -1 when the input has no such bit. */
function bitEnd(steps: readonly Step[], bit: number): number {
  return steps.findLastIndex((s) => (s.kind === "shift" || s.kind === "xor") && s.cursor === bit + 1);
}

/** Indices of the steps at which any enabled breakpoint hits. */
export function breakIndices(steps: readonly Step[], breakpoints: readonly Breakpoint[]): ReadonlySet<number> {
  const hits = new Set<number>();
  for (const bp of breakpoints) {
    if (!bp.enabled) continue;
    if (bp.kind !== "line") {
      const i = bitEnd(steps, bp.kind === "bit" ? bp.bit : bp.byte * 8 + 7);
      if (i >= 0) hits.add(i);
      continue;
    }
    let count = 0;
    steps.forEach((s, i) => {
      if (s.kind !== bp.runs) return;
      count++;
      if (bp.hit === undefined || bp.hit === count) hits.add(i);
    });
  }
  return new Set([...hits].sort((a, b) => a - b));
}

/** Adds an enabled breakpoint, or removes the one with the same identity if present. */
function toggle(breakpoints: readonly Breakpoint[], bp: Breakpoint): Breakpoint[] {
  const key = keyOf(bp);
  return breakpoints.some((b) => keyOf(b) === key) ? breakpoints.filter((b) => keyOf(b) !== key) : [...breakpoints, bp];
}

/** Sets or removes the line breakpoint on the line running steps of kind runs. */
export const toggleLine = (breakpoints: readonly Breakpoint[], runs: StepKind): Breakpoint[] =>
  toggle(breakpoints, { kind: "line", runs, enabled: true });

/** Sets or removes the breakpoint on byte. */
export const toggleByte = (breakpoints: readonly Breakpoint[], byte: number): Breakpoint[] =>
  toggle(breakpoints, { kind: "byte", byte, enabled: true });

/** Sets or removes the breakpoint on bit of the input stream. */
export const toggleBit = (breakpoints: readonly Breakpoint[], bit: number): Breakpoint[] =>
  toggle(breakpoints, { kind: "bit", bit, enabled: true });

/** Writes breakpoints as the URL parameter bp: comma-separated, such as xor@5,byte3,!feedback (! marks a disabled one). */
export function breakpointsToParam(breakpoints: readonly Breakpoint[]): string {
  return breakpoints
    .map((bp) => `${bp.enabled ? "" : "!"}${keyOf(bp)}${bp.kind === "line" && bp.hit ? `@${bp.hit}` : ""}`)
    .join(",");
}

const POSITIVE = /^[1-9]\d*$/;

/** Reads one entry of the bp parameter, or undefined when it cannot be read. */
function readEntry(entry: string): Breakpoint | undefined {
  const enabled = !entry.startsWith("!");
  const body = enabled ? entry : entry.slice(1);
  const byte = /^byte(\d+)$/.exec(body);
  if (byte) return { kind: "byte", byte: Number(byte[1]), enabled };
  const bit = /^bit(\d+)$/.exec(body);
  if (bit) return { kind: "bit", bit: Number(bit[1]), enabled };
  const [runs, hit, ...rest] = body.split("@");
  if (rest.length > 0 || !STEP_KINDS.includes(runs as StepKind)) return undefined;
  if (hit === undefined) return { kind: "line", runs: runs as StepKind, enabled };
  return POSITIVE.test(hit) ? { kind: "line", runs: runs as StepKind, hit: Number(hit), enabled } : undefined;
}

/** Reads the URL parameter bp; entries that cannot be read and repeats of the same breakpoint are dropped. */
export function breakpointsFromParam(param: string): Breakpoint[] {
  const read = param.split(",").flatMap((entry) => readEntry(entry) ?? []);
  return read.filter((bp, i) => read.findIndex((b) => keyOf(b) === keyOf(bp)) === i);
}
