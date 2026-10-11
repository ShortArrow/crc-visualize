import { describe, expect, it } from "vitest";
import { lfsrLayout, type Point } from "./layout";

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const pathLength = (route: readonly Point[]) => route.slice(1).reduce((sum, p, k) => sum + dist(route[k]!, p), 0);

describe("lfsrLayout", () => {
  const layout = lfsrLayout({ width: 3, poly: 0b011 });
  const [r0, r1] = [layout.boxes[0]!, layout.boxes[1]!];
  const bottom = (box: Point) => ({ x: box.x + layout.box / 2, y: box.y + layout.box });

  it("MSB の r[2] が左端、r[0] が右端に並ぶ", () => {
    const xs = layout.boxes.map((b) => b.x);
    expect(layout.boxes.map((b) => b.bit)).toEqual([0, 1, 2]);
    expect(xs[2]).toBeLessThan(xs[1]!);
    expect(xs[1]).toBeLessThan(xs[0]!);
  });

  it("XOR ゲートは poly[i] = 1 の各 r[i]（i = 0 を含む）の真下、フィードバック線より上に置く", () => {
    expect(layout.gates.map((g) => g.bit)).toEqual([0, 1]);
    for (const gate of layout.gates) {
      const box = layout.boxes[gate.bit]!;
      expect(gate.x).toBe(bottom(box).x);
      expect(gate.y - layout.gateR).toBeGreaterThan(box.y + layout.box);
      expect(gate.y + layout.gateR).toBeLessThan(layout.busY);
    }
  });

  it("フィードバックの分岐先は poly の 1 のビット", () => {
    expect(layout.taps).toEqual([0, 1]);
    expect(lfsrLayout({ width: 3, poly: 0b110 }).taps).toEqual([1, 2]);
  });

  it("フィードバックバスは最も右のタップ（最小の i）のゲートまで伸びる", () => {
    expect(layout.busEndX).toBe(bottom(r0).x);
    const upper = lfsrLayout({ width: 3, poly: 0b110 });
    expect(upper.busEndX).toBe(upper.gates.find((g) => g.bit === 1)!.x);
  });

  it("r[0] の入口は r[0] の真横の右にあり、シフトで 0 がここから入る", () => {
    expect(layout.entry(0).y).toBe(r0.y + layout.box / 2);
    expect(layout.entry(0).x).toBeGreaterThan(r0.x + layout.box);
  });

  it("入力 XOR は r[width-1] の左にある", () => {
    expect(layout.inputGate.x).toBeLessThan(layout.boxes[2]!.x);
  });

  it("入力線の経路は入力ストリームの下から入力ゲートの上端まで", () => {
    const route = layout.inputRoute;
    expect(route[0]!.y).toBeGreaterThan(layout.streamY);
    expect(route.at(-1)).toEqual({ x: layout.inputGate.x, y: layout.inputGate.y - layout.gateR });
  });

  it("最上位ビット線の経路は r[width-1] の左辺から入力ゲートの右端まで", () => {
    const msb = layout.boxes[2]!;
    expect(layout.msbRoute[0]).toEqual({ x: msb.x, y: msb.y + layout.box / 2 });
    expect(layout.msbRoute.at(-1)).toEqual({ x: layout.inputGate.x + layout.gateR, y: layout.inputGate.y });
  });

  it("タップへの経路は入力ゲートの下端からバスを通り、ゲートの下端で終わる", () => {
    for (const gate of layout.gates) {
      const route = layout.tapRoute(gate.bit);
      expect(route[0]).toEqual({ x: layout.inputGate.x, y: layout.inputGate.y + layout.gateR });
      expect(route.at(-1)).toEqual({ x: gate.x, y: gate.y + layout.gateR });
      expect(route.every((p) => p.y <= layout.busY)).toBe(true);
    }
  });

  it("タップの入力線は r[i] の下辺の左寄りから下りてゲートの縁で終わり、出力線はゲートの縁から右寄りへ戻る", () => {
    const gate = layout.gates.find((g) => g.bit === 1)!;
    const down = layout.tapInRoute(1);
    const up = layout.outRoute(1);
    expect(down[0]!.y).toBe(r1.y + layout.box);
    expect(down[0]!.x).toBeLessThan(gate.x);
    expect(dist(down.at(-1)!, gate)).toBeCloseTo(layout.gateR);
    expect(dist(up[0]!, gate)).toBeCloseTo(layout.gateR);
    expect(up.at(-1)!.y).toBe(r1.y + layout.box);
    expect(up.at(-1)!.x).toBeGreaterThan(gate.x);
  });

  it("タップの入力線と出力線は、値の色と粒が読める長さを持つ", () => {
    expect(pathLength(layout.tapInRoute(1))).toBeGreaterThanOrEqual(24);
    expect(pathLength(layout.outRoute(1))).toBeGreaterThanOrEqual(24);
  });
});
