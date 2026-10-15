import { toRegister, type CrcParams } from "../domain/trace";

export type Point = Readonly<{ x: number; y: number }>;

/**
 * Layout of the LFSR diagram (SVG coordinates).
 * boxes[i] is r[i], with x at the box's left edge. gates are the centers of the XOR gates directly below each r[i] where poly[i] = 1.
 * taps are the bit positions i that receive the feedback line (poly[i] = 1), in ascending order.
 */
export type LfsrLayout = Readonly<{
  box: number;
  /** Distance between the left edges of adjacent boxes; how far a value travels when shift moves it to the next box. */
  pitch: number;
  regY: number;
  streamY: number;
  busY: number;
  /** Radius of an XOR gate. */
  gateR: number;
  viewWidth: number;
  viewHeight: number;
  inputGate: Point;
  /** Box showing the value of the variable feedback. It sits directly below the input gate; x and y are its center and size is its side length. */
  feedbackBox: Point & { size: number };
  /** Entrance of r[0]: one box spacing right of r[0]'s center, where a neighbouring box would be. The 0 shifted in enters r[0] horizontally from here. */
  entry: (i: 0) => Point;
  boxes: readonly (Point & { bit: number })[];
  gates: readonly (Point & { bit: number })[];
  taps: readonly number[];
  /** Input line: from below the input stream to the top of the input gate. */
  inputRoute: readonly Point[];
  /** Result line: from the bottom of the input gate to the top edge of the feedback box. */
  resultRoute: readonly Point[];
  /** MSB line: from the left edge of r[width-1] to the right end of the input gate. */
  msbRoute: readonly Point[];
  /** Feedback line: from the bottom edge of the feedback box through the bus to the bottom of the gate directly below r[i]. */
  tapRoute: (i: number) => readonly Point[];
  /** Tap input line (left leg): down from the left part of r[i]'s bottom edge to the gate's rim. */
  tapInRoute: (i: number) => readonly Point[];
  /** Tap output line (right leg): up from the gate's rim to the right part of r[i]'s bottom edge. */
  outRoute: (i: number) => readonly Point[];
}>;

const BOX = 48;
const PITCH = 84;
/** x of the input gate. Leaves room on the left for the name of the feedback box. */
const GATE_X = 96;
const FIRST_BOX_X = 160;
const GATE_R = 13;
const FB_BOX = 30;
/** Height from a box's bottom edge to the center of its tap gate. */
const GATE_DROP = 66;
/** Horizontal offset from the box's center at which the left and right legs meet the box's bottom edge. */
const LEG_OFFSET = 16;
/** Length a leg runs straight down from the box's bottom edge before slanting toward the gate. */
const STUB = 18;

/** Point where the line from from toward center crosses the rim of the circle of radius r. */
function rim(center: Point, from: Point, r: number): Point {
  const d = Math.hypot(from.x - center.x, from.y - center.y);
  return { x: center.x + ((from.x - center.x) * r) / d, y: center.y + ((from.y - center.y) * r) / d };
}

/** Determines the LFSR diagram layout from width and poly. */
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
  const entry = (): Point => ({ x: boxX(0) + BOX / 2 + PITCH, y: midY });
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
    pitch: PITCH,
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
    inputRoute: [
      { x: GATE_X, y: streamY + 8 },
      { x: GATE_X, y: midY - GATE_R },
    ],
    resultRoute: [
      { x: GATE_X, y: midY + GATE_R },
      { x: GATE_X, y: feedbackBox.y - FB_BOX / 2 },
    ],
    msbRoute: [
      { x: boxX(width - 1), y: midY },
      { x: GATE_X + GATE_R, y: midY },
    ],
    tapRoute,
    tapInRoute,
    outRoute,
  };
}
