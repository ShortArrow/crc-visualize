import { toRegister, type CrcParams } from "../domain/trace";

export type Point = Readonly<{ x: number; y: number }>;

/**
 * LFSR 図の配置（SVG 座標）。
 * boxes[i] が r[i] で、x は箱の左端。gates は poly[i] = 1 の r[i] の真下にある XOR ゲート中心。
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
  /** 変数 feedback の値を示す箱。入力ゲートの真下にあり、x・y は中心、size は一辺。 */
  feedbackBox: Point & { size: number };
  /** r[0] の入口（r[0] の右辺の中点から右）。シフトで入る 0 はここから真横に r[0] へ入る。 */
  entry: (i: 0) => Point;
  boxes: readonly (Point & { bit: number })[];
  gates: readonly (Point & { bit: number })[];
  taps: readonly number[];
  /** 入力線: 入力ストリームの下から入力ゲートの上端まで。 */
  inputRoute: readonly Point[];
  /** 結果線: 入力ゲートの下端から feedback の箱の上辺まで。 */
  resultRoute: readonly Point[];
  /** 最上位ビット線: r[width-1] の左辺から入力ゲートの右端まで。 */
  msbRoute: readonly Point[];
  /** フィードバック線: feedback の箱の下辺からバスを通り、r[i] の真下のゲートの下端まで。 */
  tapRoute: (i: number) => readonly Point[];
  /** タップの入力線（左の脚）: r[i] の下辺の左寄りから下りてゲートの縁まで。 */
  tapInRoute: (i: number) => readonly Point[];
  /** タップの出力線（右の脚）: ゲートの縁から上がって r[i] の下辺の右寄りまで。 */
  outRoute: (i: number) => readonly Point[];
}>;

const BOX = 48;
const PITCH = 84;
/** 入力ゲートの x。左に feedback の箱の名前を書く余白を取る。 */
const GATE_X = 96;
const FIRST_BOX_X = 160;
const GATE_R = 13;
const FB_BOX = 30;
/** r[0] の右辺からその入口までの長さ。 */
const ENTRY_WIRE = 32;
/** 箱の下辺からタップのゲート中心までの高さ。 */
const GATE_DROP = 66;
/** 左右の脚が箱の下辺に付く位置の、箱の中心からの横のずれ。 */
const LEG_OFFSET = 16;
/** 脚を箱の下辺から真下へ伸ばしてから斜めにゲートへ向かう長さ。 */
const STUB = 18;

/** from から center へ向かう線が、半径 r の円の縁と交わる点。 */
function rim(center: Point, from: Point, r: number): Point {
  const d = Math.hypot(from.x - center.x, from.y - center.y);
  return { x: center.x + ((from.x - center.x) * r) / d, y: center.y + ((from.y - center.y) * r) / d };
}

/** width と poly から LFSR 図の配置を決める。 */
export function lfsrLayout({ width, poly }: Pick<CrcParams, "width" | "poly">): LfsrLayout {
  const regY = 140;
  const taps = toRegister(poly, width).flatMap((b, i) => (b === 1 ? [i] : []));
  const boxX = (i: number) => FIRST_BOX_X + (width - 1 - i) * PITCH;
  const streamY = 40;
  const midY = regY + BOX / 2;
  const boxBottom = regY + BOX;
  const gateY = boxBottom + GATE_DROP;
  const busY = gateY + GATE_R + 24;
  const feedbackBox = { x: GATE_X, y: (midY + GATE_R + busY) / 2, size: FB_BOX };
  const entry = (): Point => ({ x: boxX(0) + BOX + ENTRY_WIRE, y: midY });
  const gate = (i: number): Point => ({ x: boxX(i) + BOX / 2, y: gateY });
  const leg = (i: number, side: -1 | 1): [Point, Point, Point] => {
    const x = gate(i).x + side * LEG_OFFSET;
    const bend = { x, y: boxBottom + STUB };
    return [{ x, y: boxBottom }, bend, rim(gate(i), bend, GATE_R)];
  };
  const tapRoute = (i: number): Point[] => [
    { x: GATE_X, y: feedbackBox.y + FB_BOX / 2 },
    { x: GATE_X, y: busY },
    { x: gate(i).x, y: busY },
    { x: gate(i).x, y: gateY + GATE_R },
  ];
  const tapInRoute = (i: number): Point[] => leg(i, -1);
  const outRoute = (i: number): Point[] => leg(i, 1).reverse();
  return {
    box: BOX,
    regY,
    streamY,
    busY,
    gateR: GATE_R,
    viewWidth: entry().x + 24,
    viewHeight: busY + 24,
    inputGate: { x: GATE_X, y: midY },
    feedbackBox,
    entry,
    boxes: Array.from({ length: width }, (_, i) => ({ bit: i, x: boxX(i), y: regY })),
    gates: taps.map((i) => ({ bit: i, ...gate(i) })),
    taps,
    inputRoute: [{ x: GATE_X, y: streamY + 8 }, { x: GATE_X, y: midY - GATE_R }],
    resultRoute: [{ x: GATE_X, y: midY + GATE_R }, { x: GATE_X, y: feedbackBox.y - FB_BOX / 2 }],
    msbRoute: [{ x: boxX(width - 1), y: midY }, { x: GATE_X + GATE_R, y: midY }],
    tapRoute,
    tapInRoute,
    outRoute,
  };
}
