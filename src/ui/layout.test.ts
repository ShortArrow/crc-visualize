import { describe, expect, it } from "vitest";
import { lfsrLayout, type Point } from "./layout";

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const pathLength = (route: readonly Point[]) => route.slice(1).reduce((sum, p, k) => sum + dist(route[k]!, p), 0);

/** Layout for width 3, poly 0x3 (taps at r0 and r1). */
const layout = lfsrLayout({ width: 3, poly: 0b011 });
const [r0, r1, r2] = [layout.boxes[0]!, layout.boxes[1]!, layout.boxes[2]!];
const bottom = (box: Point) => ({ x: box.x + layout.box / 2, y: box.y + layout.box });
const { feedbackBox: fb, inputGate } = layout;

describe("lfsrLayout", () => {
  it("Given width 3 and poly 0x3, When laying out the boxes, Then the MSB r2 is leftmost and r0 rightmost", () => {
    expect(layout.boxes.map((b) => b.bit)).toEqual([0, 1, 2]);
    expect(r2.x).toBeLessThan(r1.x);
    expect(r1.x).toBeLessThan(r0.x);
  });

  it("Given width 3 and poly 0x3, When finding the box spacing, Then it equals the distance between the left edges of adjacent boxes", () => {
    expect(layout.pitch).toBe(r0.x - r1.x);
    expect(layout.pitch).toBe(r1.x - r2.x);
  });

  it("Given width 3 and poly 0x3, When placing the gates, Then each sits directly below an r[i] with poly[i] = 1 (including i = 0), above the feedback line", () => {
    expect(layout.gates.map((g) => g.bit)).toEqual([0, 1]);
    for (const gate of layout.gates) {
      const box = layout.boxes[gate.bit]!;
      expect(gate.x).toBe(bottom(box).x);
      expect(gate.y - layout.gateR).toBeGreaterThan(box.y + layout.box);
      expect(gate.y + layout.gateR).toBeLessThan(layout.busY);
    }
  });

  it("Given width 3 and poly 0x3, When finding the taps, Then they are the 1 bits of poly", () => {
    expect(layout.taps).toEqual([0, 1]);
  });

  it("Given width 3 and poly 0x3, When placing the entrance of r0, Then it is level with r0 on its right, one box spacing from r0's center", () => {
    expect(layout.entry(0).y).toBe(r0.y + layout.box / 2);
    expect(layout.entry(0).x).toBe(r0.x + layout.box / 2 + layout.pitch);
  });

  it("Given width 3 and poly 0x3, When placing the input gate, Then it is left of r2", () => {
    expect(inputGate.x).toBeLessThan(r2.x);
  });

  it("Given width 3 and poly 0x3, When placing the feedback box, Then it is directly below the input gate, above the feedback bus, with room on the left for its name", () => {
    expect(fb.x).toBe(inputGate.x);
    expect(fb.y - fb.size / 2).toBeGreaterThan(inputGate.y + layout.gateR);
    expect(fb.y + fb.size / 2).toBeLessThan(layout.busY);
    expect(fb.x - fb.size / 2).toBeGreaterThanOrEqual(64);
  });

  it("Given width 3 and poly 0x3, When drawing the input line, Then it runs from below the input stream to the top of the input gate", () => {
    expect(layout.inputRoute[0]!.y).toBeGreaterThan(layout.streamY);
    expect(layout.inputRoute.at(-1)).toEqual({ x: inputGate.x, y: inputGate.y - layout.gateR });
  });

  it("Given width 3 and poly 0x3, When drawing the MSB line, Then it runs from the left edge of r2 to the right end of the input gate", () => {
    expect(layout.msbRoute[0]).toEqual({ x: r2.x, y: r2.y + layout.box / 2 });
    expect(layout.msbRoute.at(-1)).toEqual({ x: inputGate.x + layout.gateR, y: inputGate.y });
  });

  it("Given width 3 and poly 0x3, When drawing the result line, Then it runs from the bottom of the input gate to the top edge of the feedback box", () => {
    expect(layout.resultRoute).toEqual([
      { x: inputGate.x, y: inputGate.y + layout.gateR },
      { x: fb.x, y: fb.y - fb.size / 2 },
    ]);
  });

  it("Given width 3 and poly 0x3, When drawing the feedback line, Then it runs from the bottom edge of the feedback box through the bus and ends at the bottom of the gate", () => {
    for (const gate of layout.gates) {
      const route = layout.tapRoute(gate.bit);
      expect(route[0]).toEqual({ x: fb.x, y: fb.y + fb.size / 2 });
      expect(route.at(-1)).toEqual({ x: gate.x, y: gate.y + layout.gateR });
      expect(route.every((p) => p.y <= layout.busY)).toBe(true);
    }
  });

  it("Given width 3 and poly 0x3, When drawing the legs of r1, Then the input line goes down from the left part of the bottom edge to the gate's rim and the output line returns from the gate's rim to the right part", () => {
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

  it("Given width 3 and poly 0x3, When drawing the legs of r1, Then they are long enough to show the value's colour and particle", () => {
    expect(pathLength(layout.tapInRoute(1))).toBeGreaterThanOrEqual(24);
    expect(pathLength(layout.outRoute(1))).toBeGreaterThanOrEqual(24);
  });

  it("Given width 3 and poly 0x6, When finding the taps, Then they are r1 and r2", () => {
    expect(lfsrLayout({ width: 3, poly: 0b110 }).taps).toEqual([1, 2]);
  });
});
