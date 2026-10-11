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
  /** XOR ゲートの半径。 */
  gateR: number;
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
  /** 入力線: 入力ストリームの下から入力ゲートの上端まで。 */
  inputRoute: readonly Point[];
  /** 最上位ビット線: r[width-1] の左辺から入力ゲートの右端まで。 */
  msbRoute: readonly Point[];
  /** フィードバック線: 入力ゲートの下端からバスを通り、r[i] の入口のゲートの下端（i = 0 では r[0] の右辺）まで。 */
  tapRoute: (i: number) => readonly Point[];
}>;

const BOX = 48;
const PITCH = 84;
const GATE_X = 56;
const FIRST_BOX_X = 120;
const GATE_R = 13;

/** width と poly から LFSR 図の配置を決める。 */
export function lfsrLayout({ width, poly }: Pick<CrcParams, "width" | "poly">): LfsrLayout {
  const regY = 140;
  const column = (i: number) => width - 1 - i;
  const boxX = (i: number) => FIRST_BOX_X + column(i) * PITCH;
  const entry = (i: number): Point => ({ x: boxX(i) + BOX + (PITCH - BOX) / 2, y: regY + BOX / 2 });
  const taps = toRegister(poly, width).flatMap((b, i) => (b === 1 ? [i] : []));
  const streamY = 40;
  const busY = regY + BOX + 56;
  const midY = regY + BOX / 2;
  const tapRoute = (i: number): Point[] => {
    const e = entry(i);
    const head = [{ x: GATE_X, y: midY + GATE_R }, { x: GATE_X, y: busY }, { x: e.x, y: busY }];
    return i === 0 ? [...head, { x: e.x, y: midY }, { x: boxX(0) + BOX, y: midY }] : [...head, { x: e.x, y: midY + GATE_R }];
  };
  return {
    box: BOX,
    pitch: PITCH,
    regY,
    streamY,
    busY,
    gateR: GATE_R,
    viewWidth: FIRST_BOX_X + width * PITCH + 24,
    viewHeight: regY + BOX + 80,
    inputGate: { x: GATE_X, y: midY },
    busEndX: taps.length > 0 ? entry(taps[0]!).x : GATE_X,
    entry,
    boxes: Array.from({ length: width }, (_, i) => ({ bit: i, x: boxX(i), y: regY })),
    gates: taps.filter((i) => i >= 1).map((i) => ({ bit: i, ...entry(i) })),
    taps,
    inputRoute: [{ x: GATE_X, y: streamY + 8 }, { x: GATE_X, y: midY - GATE_R }],
    msbRoute: [{ x: boxX(width - 1), y: midY }, { x: GATE_X + GATE_R, y: midY }],
    tapRoute,
  };
}
