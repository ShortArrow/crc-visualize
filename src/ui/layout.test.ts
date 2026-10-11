import { describe, expect, it } from "vitest";
import { lfsrLayout } from "./layout";

describe("lfsrLayout", () => {
  const layout = lfsrLayout({ width: 3, poly: 0b011 });

  it("MSB の r[2] が左端、r[0] が右端に並ぶ", () => {
    const xs = layout.boxes.map((b) => b.x);
    expect(layout.boxes.map((b) => b.bit)).toEqual([0, 1, 2]);
    expect(xs[2]).toBeLessThan(xs[1]!);
    expect(xs[1]).toBeLessThan(xs[0]!);
  });

  it("XOR ゲートは poly[i] = 1 かつ i ≥ 1 の r[i] の入口（右隣）に置く", () => {
    expect(layout.gates.map((g) => g.bit)).toEqual([1]);
    const gate = layout.gates[0]!;
    const r1 = layout.boxes[1]!;
    const r0 = layout.boxes[0]!;
    expect(gate.x).toBeGreaterThan(r1.x + layout.box);
    expect(gate.x).toBeLessThan(r0.x);
  });

  it("フィードバックの分岐先は poly の 1 のビット", () => {
    expect(layout.taps).toEqual([0, 1]);
    expect(lfsrLayout({ width: 3, poly: 0b110 }).taps).toEqual([1, 2]);
  });

  it("フィードバックバスは最も右のタップ（最小の i）の入口まで伸びる", () => {
    expect(layout.busEndX).toBe(layout.entry(0).x);
    const upper = lfsrLayout({ width: 3, poly: 0b110 });
    expect(upper.busEndX).toBe(upper.entry(1).x);
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

  it("タップへの経路は入力ゲートの下端からバスを通り、ゲートの下端か r[0] の入口で終わる", () => {
    const start = { x: layout.inputGate.x, y: layout.inputGate.y + layout.gateR };
    expect(layout.tapRoute(1)[0]).toEqual(start);
    expect(layout.tapRoute(1).at(-1)).toEqual({ x: layout.entry(1).x, y: layout.entry(1).y + layout.gateR });
    expect(layout.tapRoute(0).at(-1)).toEqual(layout.entry(0));
    expect(layout.tapRoute(0).every((p, k) => k === 0 || p.y <= layout.busY)).toBe(true);
  });

  it("タップの入力線は r[i-1] の左辺からゲートの右端まで", () => {
    const r0 = layout.boxes[0]!;
    expect(layout.tapInRoute(1)).toEqual([
      { x: r0.x, y: layout.entry(1).y },
      { x: layout.entry(1).x + layout.gateR, y: layout.entry(1).y },
    ]);
  });

  it("タップの出力線はゲートの左端（i = 0 では入口）から r[i] の右辺まで", () => {
    const [r0, r1] = [layout.boxes[0]!, layout.boxes[1]!];
    const y = layout.entry(0).y;
    expect(layout.outRoute(1)).toEqual([
      { x: layout.entry(1).x - layout.gateR, y },
      { x: r1.x + layout.box, y },
    ]);
    expect(layout.outRoute(0)).toEqual([layout.entry(0), { x: r0.x + layout.box, y }]);
  });

  it("タップの入力線と出力線は、値の色と粒が読める長さを持つ", () => {
    const length = (route: readonly { x: number }[]) => Math.abs(route.at(-1)!.x - route[0]!.x);
    expect(length(layout.tapInRoute(1))).toBeGreaterThanOrEqual(28);
    expect(length(layout.outRoute(1))).toBeGreaterThanOrEqual(28);
    expect(length(layout.outRoute(0))).toBeGreaterThanOrEqual(28);
  });

  it("タップの無い箱どうしは詰めて並べる", () => {
    const sparse = lfsrLayout({ width: 3, poly: 0b001 });
    const gap = (l: typeof sparse, i: number) => l.boxes[i - 1]!.x - (l.boxes[i]!.x + l.box);
    expect(gap(sparse, 1)).toBeLessThan(gap(layout, 1));
  });
});
