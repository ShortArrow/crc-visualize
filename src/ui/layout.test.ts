import { describe, expect, it } from "vitest";
import { lfsrLayout, type Point } from "./layout";

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const pathLength = (route: readonly Point[]) => route.slice(1).reduce((sum, p, k) => sum + dist(route[k]!, p), 0);

describe("lfsrLayout", () => {
  describe("Given width 3、poly 0x3（タップは r0 と r1）", () => {
    const layout = lfsrLayout({ width: 3, poly: 0b011 });
    const [r0, r1, r2] = [layout.boxes[0]!, layout.boxes[1]!, layout.boxes[2]!];
    const bottom = (box: Point) => ({ x: box.x + layout.box / 2, y: box.y + layout.box });
    const { feedbackBox: fb, inputGate } = layout;

    it("When 箱を並べる, Then MSB の r2 が左端、r0 が右端になる", () => {
      expect(layout.boxes.map((b) => b.bit)).toEqual([0, 1, 2]);
      expect(r2.x).toBeLessThan(r1.x);
      expect(r1.x).toBeLessThan(r0.x);
    });

    it("When ゲートを置く, Then poly[i] = 1 の各 r[i]（i = 0 を含む）の真下、フィードバック線より上に置く", () => {
      expect(layout.gates.map((g) => g.bit)).toEqual([0, 1]);
      for (const gate of layout.gates) {
        const box = layout.boxes[gate.bit]!;
        expect(gate.x).toBe(bottom(box).x);
        expect(gate.y - layout.gateR).toBeGreaterThan(box.y + layout.box);
        expect(gate.y + layout.gateR).toBeLessThan(layout.busY);
      }
    });

    it("When タップを求める, Then poly の 1 のビットになる", () => {
      expect(layout.taps).toEqual([0, 1]);
    });

    it("When r0 の入口を置く, Then r0 の真横の右にある", () => {
      expect(layout.entry(0).y).toBe(r0.y + layout.box / 2);
      expect(layout.entry(0).x).toBeGreaterThan(r0.x + layout.box);
    });

    it("When 入力ゲートを置く, Then r2 の左にある", () => {
      expect(inputGate.x).toBeLessThan(r2.x);
    });

    it("When feedback の箱を置く, Then 入力ゲートの真下、フィードバックバスより上で、左に名前を書く余白がある", () => {
      expect(fb.x).toBe(inputGate.x);
      expect(fb.y - fb.size / 2).toBeGreaterThan(inputGate.y + layout.gateR);
      expect(fb.y + fb.size / 2).toBeLessThan(layout.busY);
      expect(fb.x - fb.size / 2).toBeGreaterThanOrEqual(64);
    });

    it("When 入力線を引く, Then 入力ストリームの下から入力ゲートの上端まで", () => {
      expect(layout.inputRoute[0]!.y).toBeGreaterThan(layout.streamY);
      expect(layout.inputRoute.at(-1)).toEqual({ x: inputGate.x, y: inputGate.y - layout.gateR });
    });

    it("When 最上位ビット線を引く, Then r2 の左辺から入力ゲートの右端まで", () => {
      expect(layout.msbRoute[0]).toEqual({ x: r2.x, y: r2.y + layout.box / 2 });
      expect(layout.msbRoute.at(-1)).toEqual({ x: inputGate.x + layout.gateR, y: inputGate.y });
    });

    it("When 結果線を引く, Then 入力ゲートの下端から feedback の箱の上辺まで", () => {
      expect(layout.resultRoute).toEqual([
        { x: inputGate.x, y: inputGate.y + layout.gateR },
        { x: fb.x, y: fb.y - fb.size / 2 },
      ]);
    });

    it("When フィードバック線を引く, Then feedback の箱の下辺からバスを通り、ゲートの下端で終わる", () => {
      for (const gate of layout.gates) {
        const route = layout.tapRoute(gate.bit);
        expect(route[0]).toEqual({ x: fb.x, y: fb.y + fb.size / 2 });
        expect(route.at(-1)).toEqual({ x: gate.x, y: gate.y + layout.gateR });
        expect(route.every((p) => p.y <= layout.busY)).toBe(true);
      }
    });

    it("When r1 の脚を引く, Then 入力線は下辺の左寄りから下りてゲートの縁へ、出力線はゲートの縁から右寄りへ戻る", () => {
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

    it("When r1 の脚を引く, Then 値の色と粒が読める長さがある", () => {
      expect(pathLength(layout.tapInRoute(1))).toBeGreaterThanOrEqual(24);
      expect(pathLength(layout.outRoute(1))).toBeGreaterThanOrEqual(24);
    });
  });

  describe("Given width 3、poly 0x6", () => {
    it("When タップを求める, Then r1 と r2 になる", () => {
      expect(lfsrLayout({ width: 3, poly: 0b110 }).taps).toEqual([1, 2]);
    });
  });
});
