import { describe, expect, it } from "vitest";
import { perByte } from "./perByte";
import { bitEndStep, bitsFromBytes, reflectValue, trace, type Bit, type CrcParams } from "./trace";

const SMBUS: CrcParams = { width: 8, poly: 0x07n, init: 0n, refin: false, refout: false, xorout: 0n };
const ARC: CrcParams = { width: 16, poly: 0x8005n, init: 0n, refin: true, refout: true, xorout: 0n };
const CHECK_BYTES = [..."123456789"].map((c) => c.charCodeAt(0));
const CHECK = bitsFromBytes(CHECK_BYTES);

describe("perByte", () => {
  it("Given whole bytes, When listed, Then each row has the byte number, the byte and the step that ends it", () => {
    const steps = trace(SMBUS, CHECK);
    const rows = perByte(SMBUS, steps, CHECK)!;

    expect(rows.map((r) => r.byte)).toEqual(CHECK_BYTES);
    expect(rows[3]).toMatchObject({ index: 3, step: bitEndStep(steps, 31) });
    expect(rows.at(-1)!.register).toBe(0xf4n);
    expect(rows[0]!.right).toBeUndefined();
  });

  it("Given refin = refout = true, When listed, Then each row also has the register as a right shift holds it", () => {
    const rows = perByte(ARC, trace(ARC, CHECK), CHECK)!;

    expect(rows.at(-1)!.right).toBe(0xbb3dn);
    expect(rows.every((r) => r.right === reflectValue(r.register, 16))).toBe(true);
  });

  it("Given an input that is not whole bytes, When listed, Then there is no per-byte view", () => {
    const bits: Bit[] = [1, 0, 1];

    expect(perByte(SMBUS, trace(SMBUS, bits), bits)).toBeUndefined();
  });
});
