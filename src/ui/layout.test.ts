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
});
