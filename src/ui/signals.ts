import { toRegister, type Bit, type CrcParams, type Step } from "../domain/trace";

/**
 * LFSR 図の配線に流れている値。キーの無い配線には何も流れていない。
 * tapIn[i] は r[i-1] から r[i] の入口のゲートへの線（1 ≤ i）、tapOut[i] はゲート（i = 0 ではフィードバック線の先端）から r[i] への線。
 */
export type WireLevels = Readonly<{
  input?: Bit;
  msb?: Bit;
  feedback?: Bit;
  tapIn: Readonly<Partial<Record<number, Bit>>>;
  tapOut: Readonly<Partial<Record<number, Bit>>>;
}>;

/**
 * 配線に沿って動く粒。route は "input"（入力ストリーム → 入力ゲート）、"msb"（r[width-1] → 入力ゲート）、
 * "tap-i"（入力ゲート → フィードバック線 → r[i] の入口）、"out-i"（r[i] の入口 → r[i]）。
 * phase はアニメーションの前半（0）と後半（1）のどちらで動くか。
 */
export type Particle = Readonly<{ route: `${"tap" | "out"}-${number}` | "input" | "msb"; value: Bit; phase: 0 | 1 }>;

const tapsOf = (params: CrcParams) => toRegister(params.poly, params.width).flatMap((tap, i) => (tap === 1 ? [i] : []));

/** step で各配線に流れている値。 */
export function wireLevels(params: CrcParams, step: Step): WireLevels {
  switch (step.kind) {
    case "feedback":
      return { input: step.inBit, msb: step.msb, feedback: step.fb, tapIn: {}, tapOut: {} };
    case "shift":
      return { feedback: step.fb, tapIn: {}, tapOut: {} };
    case "xor": {
      const hit = tapsOf(params);
      const tapIn = Object.fromEntries(hit.filter((i) => i >= 1).map((i) => [i, (step.reg[i]! ^ 1) as Bit]));
      const tapOut = Object.fromEntries(hit.map((i) => [i, step.reg[i]!]));
      return { feedback: 1, tapIn, tapOut };
    }
    default:
      return { tapIn: {}, tapOut: {} };
  }
}

/** step で配線に沿って動く粒。 */
export function particles(params: CrcParams, step: Step): Particle[] {
  switch (step.kind) {
    case "feedback":
      return [
        { route: "input", value: step.inBit, phase: 0 },
        { route: "msb", value: step.msb, phase: 0 },
      ];
    case "xor": {
      const taps = tapsOf(params);
      return [
        ...taps.map((i): Particle => ({ route: `tap-${i}`, value: 1, phase: 0 })),
        ...taps.map((i): Particle => ({ route: `out-${i}`, value: step.reg[i]!, phase: 1 })),
      ];
    }
    default:
      return [];
  }
}

/**
 * 次のステップ next で新しく箱に入る値の控え（キーは r[i] の i）。
 * next が shift なら右端から入る r[0]、xor なら値が変わるタップの箱。
 * 隣の箱からそのまま移るだけの値は既に見えているので控えない。
 */
export function upcomingValues(params: CrcParams, next: Step | undefined): Partial<Record<number, Bit>> {
  switch (next?.kind) {
    case "shift":
      return { 0: next.reg[0]! };
    case "xor":
      return Object.fromEntries(tapsOf(params).map((i) => [i, next.reg[i]!]));
    default:
      return {};
  }
}
