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
    expect(lfsrLayout({ width: 3, poly: 0b110 }).busEndX).toBe(layout.entry(1).x);
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

  it("タップへの経路は入力ゲートの下端からバスを通り、ゲートの下端か r[0] の右辺で終わる", () => {
    const start = { x: layout.inputGate.x, y: layout.inputGate.y + layout.gateR };
    const r0 = layout.boxes[0]!;
    expect(layout.tapRoute(1)[0]).toEqual(start);
    expect(layout.tapRoute(1).at(-1)).toEqual({ x: layout.entry(1).x, y: layout.entry(1).y + layout.gateR });
    expect(layout.tapRoute(0).at(-1)).toEqual({ x: r0.x + layout.box, y: r0.y + layout.box / 2 });
    expect(layout.tapRoute(0).every((p, k) => k === 0 || p.y <= layout.busY)).toBe(true);
  });
});
