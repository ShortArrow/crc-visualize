import { toRegister, type CrcParams } from "../domain/trace";

export type Point = Readonly<{ x: number; y: number }>;

/**
 * LFSR 図の配置（SVG 座標）。
 * boxes[i] が r[i] で、x は箱の左端。gates は r[i] の入口の XOR ゲート中心。
 * taps はフィードバック線を受けるビット位置 i（poly[i] = 1）の昇順。
 */
export type LfsrLayout = Readonly<{
  box: number;
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
  /** r[i] の入口（箱の右隣のすき間の中央）。i = 0 では右端の入力点。 */
  entry: (i: number) => Point;
  boxes: readonly (Point & { bit: number })[];
  gates: readonly (Point & { bit: number })[];
  taps: readonly number[];
  /** 入力線: 入力ストリームの下から入力ゲートの上端まで。 */
  inputRoute: readonly Point[];
  /** 最上位ビット線: r[width-1] の左辺から入力ゲートの右端まで。 */
  msbRoute: readonly Point[];
  /** フィードバック線: 入力ゲートの下端からバスを通り、r[i] の入口のゲートの下端（i = 0 では入口）まで。 */
  tapRoute: (i: number) => readonly Point[];
  /** タップの入力線: r[i-1] の左辺から r[i] の入口のゲートの右端まで（1 ≤ i）。 */
  tapInRoute: (i: number) => readonly Point[];
  /** タップの出力線: r[i] の入口のゲートの左端（i = 0 では入口）から r[i] の右辺まで。 */
  outRoute: (i: number) => readonly Point[];
}>;

const BOX = 48;
const GATE_X = 56;
const FIRST_BOX_X = 120;
const GATE_R = 13;
/** タップの入力線・出力線の長さ。値の色と粒が読める長さを取る。 */
const TAP_WIRE = 32;
/** タップの無い箱どうしのすき間。 */
const PLAIN_GAP = 36;

/** width と poly から LFSR 図の配置を決める。 */
export function lfsrLayout({ width, poly }: Pick<CrcParams, "width" | "poly">): LfsrLayout {
  const regY = 140;
  const taps = toRegister(poly, width).flatMap((b, i) => (b === 1 ? [i] : []));
  const gapRight = (i: number) =>
    !taps.includes(i) ? PLAIN_GAP : i === 0 ? 2 * TAP_WIRE : 2 * TAP_WIRE + 2 * GATE_R;
  const xs: number[] = [];
  for (let i = width - 1; i >= 0; i--) xs[i] = i === width - 1 ? FIRST_BOX_X : xs[i + 1]! + BOX + gapRight(i + 1);
  const boxX = (i: number) => xs[i]!;
  const entry = (i: number): Point => ({ x: boxX(i) + BOX + gapRight(i) / 2, y: regY + BOX / 2 });
  const streamY = 40;
  const busY = regY + BOX + 56;
  const midY = regY + BOX / 2;
  const tapRoute = (i: number): Point[] => {
    const e = entry(i);
    const head = [{ x: GATE_X, y: midY + GATE_R }, { x: GATE_X, y: busY }, { x: e.x, y: busY }];
    return [...head, i === 0 ? e : { x: e.x, y: midY + GATE_R }];
  };
  const tapInRoute = (i: number): Point[] => [{ x: boxX(i - 1), y: midY }, { x: entry(i).x + GATE_R, y: midY }];
  const outRoute = (i: number): Point[] => [
    i === 0 ? entry(0) : { x: entry(i).x - GATE_R, y: midY },
    { x: boxX(i) + BOX, y: midY },
  ];
  return {
    box: BOX,
    regY,
    streamY,
    busY,
    gateR: GATE_R,
    viewWidth: boxX(0) + BOX + gapRight(0) + 24,
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
    tapInRoute,
    outRoute,
  };
}
