import { toRegister, type Bit, type CrcParams, type Step } from "../domain/trace";

/**
 * Values flowing through the wires of the LFSR diagram. Wires without a key carry nothing.
 * tapIn[i] is the line going down from r[i] to the gate directly below it; tapOut[i] is the line returning from the gate to r[i].
 */
export type WireLevels = Readonly<{
  input?: Bit;
  msb?: Bit;
  result?: Bit;
  feedback?: Bit;
  tapIn: Readonly<Partial<Record<number, Bit>>>;
  tapOut: Readonly<Partial<Record<number, Bit>>>;
}>;

/**
 * A particle moving along a wire. route is "input" (input stream → input gate), "msb" (r[width-1] → input gate),
 * "result" (input gate → feedback box), "tap-i" (feedback box → feedback line → gate directly below r[i]), "in-i" (r[i] → gate) or "out-i" (gate → r[i]).
 * phase is whether it moves in the first half (0) or the second half (1) of the animation.
 */
export type Particle = Readonly<{
  route: `${"tap" | "in" | "out"}-${number}` | "input" | "msb" | "result";
  value: Bit;
  phase: 0 | 1;
}>;

const tapsOf = (params: CrcParams) => toRegister(params.poly, params.width).flatMap((tap, i) => (tap === 1 ? [i] : []));

/** Values flowing through each wire at step. */
export function wireLevels(params: CrcParams, step: Step): WireLevels {
  switch (step.kind) {
    case "feedback":
      return { input: step.inBit, msb: step.msb, result: step.fb, tapIn: {}, tapOut: {} };
    case "xor": {
      const taps = tapsOf(params);
      const tapIn = Object.fromEntries(taps.map((i) => [i, (step.reg[i]! ^ 1) as Bit]));
      const tapOut = Object.fromEntries(taps.map((i) => [i, step.reg[i]!]));
      return { feedback: 1, tapIn, tapOut };
    }
    default:
      return { tapIn: {}, tapOut: {} };
  }
}

/** Particles moving along the wires at step. */
export function particles(params: CrcParams, step: Step): Particle[] {
  switch (step.kind) {
    case "feedback":
      return [
        { route: "input", value: step.inBit, phase: 0 },
        { route: "msb", value: step.msb, phase: 0 },
        { route: "result", value: step.fb, phase: 1 },
      ];
    case "xor": {
      const taps = tapsOf(params);
      return [
        ...taps.map((i): Particle => ({ route: `tap-${i}`, value: 1, phase: 0 })),
        ...taps.map((i): Particle => ({ route: `in-${i}`, value: (step.reg[i]! ^ 1) as Bit, phase: 0 })),
        ...taps.map((i): Particle => ({ route: `out-${i}`, value: step.reg[i]!, phase: 1 })),
      ];
    }
    default:
      return [];
  }
}

/**
 * Name of the wire the particle route travels (data-wire in LfsrView). That wire is painted in the value's colour behind the particle.
 * "feedback-i" is the feedback line from the feedback box to the gate directly below r[i].
 */
export function particleWire(route: Particle["route"]): string {
  const [kind, n] = route.split("-");
  if (kind === "in" || kind === "out") return `tap-${kind}-${n}`;
  return kind === "tap" ? `feedback-${n}` : route;
}

/** Value shown by the feedback box at step. Held from a clock's feedback step through its xor step; undefined otherwise. */
export function heldFeedback(step: Step): Bit | undefined {
  switch (step.kind) {
    case "feedback":
    case "shift":
      return step.fb;
    case "xor":
      return 1;
    default:
      return undefined;
  }
}

/**
 * Values about to enter boxes at the next step next, kept in advance (keyed by the i of r[i]). Only r[0], entering from the right end, when next is shift.
 * Values merely moving from the neighbouring box are already visible, and the xor result is shown by the particle entering the box from the gate, so neither is kept.
 */
export function upcomingValues(next: Step | undefined): Partial<Record<number, Bit>> {
  switch (next?.kind) {
    case "shift":
      return { 0: next.reg[0]! };
    default:
      return {};
  }
}
