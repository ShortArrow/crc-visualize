import { describe, expect, it } from "vitest";
import {
  codeword,
  DEFAULT_GENERATOR,
  findGenerator,
  GENERATORS,
  period,
  powerCycle,
  remainder,
  rotate,
  stateRingSettings,
  wordRingSettings,
} from "./cyclic";
import { registerValue, trace, type Bit } from "./trace";

const bits = (s: string): Bit[] => [...s].map((c) => (c === "1" ? 1 : 0));
const X3_X_1 = { width: 3, poly: 0x3 };

describe("cyclic", () => {
  it("Given the listed generator polynomials, When their periods are computed, Then they are 7, 7, 15, 5 and 31", () => {
    expect(GENERATORS.map(period)).toEqual([7, 7, 15, 5, 31]);
  });

  it("Given x³+x+1, When clocked repeatedly from 1 with input 0, Then it visits the 7 states x^j mod g(x)", () => {
    expect(powerCycle(X3_X_1)).toEqual([0b001, 0b010, 0b100, 0b011, 0b110, 0b111, 0b101]);
  });

  it("Given a generator polynomial without a constant term, When its states are followed, Then it throws because it never returns to 1", () => {
    expect(() => powerCycle({ width: 3, poly: 0x2 })).toThrow();
  });

  it("Given a bit sequence, When divided by g(x), Then the result is the remainder of the polynomial read from the highest degree", () => {
    expect(remainder(X3_X_1, bits("1011"))).toBe(0);
    expect(remainder(X3_X_1, bits("1000"))).toBe(0b011);
    expect(remainder(X3_X_1, bits("110"))).toBe(0b110);
  });

  it.each(GENERATORS)("Given generator polynomial %o, When x^n is divided, Then the remainder is 1", (g) => {
    expect(remainder(g, [1, ...Array<Bit>(period(g)).fill(0)])).toBe(1);
  });

  it("Given x³+x+1, When the codeword is built, Then it is 7 bits: message 1101 followed by CRC 001", () => {
    expect(codeword(X3_X_1)).toEqual(bits("1101001"));
  });

  it("Given x⁴+x+1, When the codeword is built, Then the message is the first 11 bits of repeated 1101", () => {
    expect(codeword({ width: 4, poly: 0x3 }).slice(0, 11)).toEqual(bits("11011101110"));
  });

  it.each(GENERATORS)(
    "Given a codeword of generator polynomial %o, When rotated by any number of bits, Then its remainder modulo g(x) is 0",
    (g) => {
      const word = codeword(g);
      expect(word).toHaveLength(period(g));
      for (let k = 0; k < word.length; k++) expect(remainder(g, rotate(word, k))).toBe(0);
    },
  );

  it("Given a bit sequence, When rotated by k bits, Then each degree rises by k and bits past the highest degree wrap around to x^0", () => {
    expect(rotate(bits("1011000"), 1)).toEqual(bits("0110001"));
    expect(rotate(bits("1011000"), 7)).toEqual(bits("1011000"));
    expect(rotate(bits("1011000"), -1)).toEqual(bits("0101100"));
  });

  it("Given width and poly, When looked up in the list, Then only listed ones are found", () => {
    expect(findGenerator(4, 0x3)).toEqual({ width: 4, poly: 0x3 });
    expect(findGenerator(4, 0x5)).toBeUndefined();
    expect(DEFAULT_GENERATOR).toEqual(X3_X_1);
  });

  it.each(GENERATORS)(
    "Given width $width and poly $poly, When the visualizer runs the state ring's settings, Then the register at the start of each clock goes through the ring's states",
    (g) => {
      const { params, input } = stateRingSettings(g);
      expect(input.mode).toBe("bits");
      const steps = trace(params, bits(input.text));
      const starts = steps.filter((s) => s.kind === "feedback").map((s) => registerValue(s.reg));
      expect(starts).toEqual(powerCycle(g));
    },
  );

  it.each(GENERATORS)(
    "Given width $width and poly $poly, When the visualizer runs the codeword ring's settings at every rotation, Then the input is the rotated codeword and the final register is 0",
    (g) => {
      for (let k = 0; k < period(g); k++) {
        const { params, input } = wordRingSettings(g, k);
        expect(input).toEqual({ mode: "bits", text: rotate(codeword(g), k).join("") });
        const steps = trace(params, bits(input.text));
        expect(registerValue(steps.at(-1)!.reg)).toBe(0);
      }
    },
  );
});
