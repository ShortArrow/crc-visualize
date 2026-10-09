import { toRegister, type CrcParams } from "../domain/trace";

export type Point = Readonly<{ x: number; y: number }>;

/**
 * LFSR 図の配置（SVG 座標）。
 * boxes[i] が r[i] で、x は箱の左端。gates は r[i] の入口の XOR ゲート中心。
 * taps はフィードバック線を受けるビット位置 i（poly[i] = 1）の昇順。
 */
export type LfsrLayout = Readonly<{
  box: number;
  pitch: number;
  regY: number;
  streamY: number;
  busY: number;
  viewWidth: number;
  viewHeight: number;
  inputGate: Point;
  /** フィードバックバスの右端の x。最も右のタップ（最小の i）の入口。 */
  busEndX: number;
  /** r[i] の入口（箱の右辺の中点から pitch/2 右）。i = 0 では右端の入力点。 */
  entry: (i: number) => Point;
  boxes: readonly (Point & { bit: number })[];
  gates: readonly (Point & { bit: number })[];
  taps: readonly number[];
}>;

const BOX = 48;
const PITCH = 84;
const GATE_X = 56;
const FIRST_BOX_X = 120;

/** width と poly から LFSR 図の配置を決める。 */
export function lfsrLayout({ width, poly }: Pick<CrcParams, "width" | "poly">): LfsrLayout {
  const regY = 140;
  const column = (i: number) => width - 1 - i;
  const boxX = (i: number) => FIRST_BOX_X + column(i) * PITCH;
  const entry = (i: number): Point => ({ x: boxX(i) + BOX + (PITCH - BOX) / 2, y: regY + BOX / 2 });
  const taps = toRegister(poly, width).flatMap((b, i) => (b === 1 ? [i] : []));
  return {
    box: BOX,
    pitch: PITCH,
    regY,
    streamY: 40,
    busY: regY + BOX + 56,
    viewWidth: FIRST_BOX_X + width * PITCH + 24,
    viewHeight: regY + BOX + 80,
    inputGate: { x: GATE_X, y: regY + BOX / 2 },
    busEndX: taps.length > 0 ? entry(taps[0]!).x : GATE_X,
    entry,
    boxes: Array.from({ length: width }, (_, i) => ({ bit: i, x: boxX(i), y: regY })),
    gates: taps.filter((i) => i >= 1).map((i) => ({ bit: i, ...entry(i) })),
    taps,
  };
}
