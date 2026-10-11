import { toRegister, type Bit, type CrcParams, type Step } from "../domain/trace";

/**
 * LFSR 図の配線に流れている値。キーの無い配線には何も流れていない。
 * tapIn[i] は r[i] から真下のゲートへ下りる線、tapOut[i] はゲートから r[i] へ戻る線。
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
 * 配線に沿って動く粒。route は "input"（入力ストリーム → 入力ゲート）、"msb"（r[width-1] → 入力ゲート）、
 * "result"（入力ゲート → feedback の箱）、"tap-i"（feedback の箱 → フィードバック線 → r[i] の真下のゲート）、"in-i"（r[i] → ゲート）、"out-i"（ゲート → r[i]）。
 * phase はアニメーションの前半（0）と後半（1）のどちらで動くか。
 */
export type Particle = Readonly<{ route: `${"tap" | "in" | "out"}-${number}` | "input" | "msb" | "result"; value: Bit; phase: 0 | 1 }>;

const tapsOf = (params: CrcParams) => toRegister(params.poly, params.width).flatMap((tap, i) => (tap === 1 ? [i] : []));

/** step で各配線に流れている値。 */
export function wireLevels(params: CrcParams, step: Step): WireLevels {
  switch (step.kind) {
    case "feedback":
      return { input: step.inBit, msb: step.msb, result: step.fb, tapIn: {}, tapOut: {} };
    case "shift":
      return { feedback: step.fb, tapIn: {}, tapOut: {} };
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

/** step で配線に沿って動く粒。 */
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

/** step で feedback の箱が示す値。クロックの feedback から xor まで保ち、それ以外では undefined。 */
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
 * 次のステップ next で新しく箱に入る値の控え（キーは r[i] の i）。next が shift のときの、右端から入る r[0] だけ。
 * 隣の箱から移るだけの値は既に見えており、xor の結果はゲートから箱へ入る粒が見せるので控えない。
 */
export function upcomingValues(next: Step | undefined): Partial<Record<number, Bit>> {
  switch (next?.kind) {
    case "shift":
      return { 0: next.reg[0]! };
    default:
      return {};
  }
}
