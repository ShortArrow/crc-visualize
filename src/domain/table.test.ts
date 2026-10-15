import { describe, expect, it } from "vitest";
import { crcOf } from "./equivalence";
import { CATALOGUE } from "./presets";
import { crcTable, entryClocks, tableDirection, tableRun } from "./table";
import { bitsFromBytes, type Bit, type CrcParams } from "./trace";

const text = (s: string): Bit[] => bitsFromBytes([...new TextEncoder().encode(s)]);
const params = (name: string): CrcParams => CATALOGUE.find((p) => p.name === name)!.params;

describe("table", () => {
  it("Given CRC-16/XMODEM, When its table is built, Then it is a left-shift table with T[1] = 0x1021 and T[255] = 0x1EF0", () => {
    const p = params("CRC-16/XMODEM");
    expect(tableDirection(p)).toBe("left");
    const t = crcTable(p);
    expect(t).toHaveLength(256);
    expect([t[0], t[1], t[255]]).toEqual([0, 0x1021, 0x1ef0]);
  });

  it("Given CRC-32/ISO-HDLC, When its table is built, Then it is the well-known right-shift table with T[1] = 0x77073096", () => {
    const p = params("CRC-32/ISO-HDLC");
    expect(tableDirection(p)).toBe("right");
    expect(crcTable(p)[1]).toBe(0x77073096);
    expect(crcTable(p)[255]).toBe(0x2d02ef8d);
  });

  it("Given CRC-16/ARC, When its table is built, Then T[1] = 0xC0C1", () => {
    expect(crcTable(params("CRC-16/ARC"))[1]).toBe(0xc0c1);
  });

  it("Given refin and refout that differ, When the direction is chosen, Then the left-shift table is used", () => {
    expect(tableDirection(params("CRC-12/UMTS"))).toBe("left");
  });

  it("Given CRC-16/XMODEM and index 1, When the 8 clocks that make T[1] are listed, Then the bits of 1 go in MSB first and the last register is T[1]", () => {
    const clocks = entryClocks(params("CRC-16/XMODEM"), 1);
    expect(clocks.map((c) => c.bit)).toEqual([0, 0, 0, 0, 0, 0, 0, 1]);
    expect(clocks[7]!.reg).toBe(0x1021);
  });

  it("Given CRC-32/ISO-HDLC and index 1, When the 8 clocks are listed, Then the bits go in LSB first and the last register is T[1]", () => {
    const clocks = entryClocks(params("CRC-32/ISO-HDLC"), 1);
    expect(clocks.map((c) => c.bit)).toEqual([1, 0, 0, 0, 0, 0, 0, 0]);
    expect(clocks[7]!.reg).toBe(0x77073096);
  });

  it.each(CATALOGUE)("Given $name, When every table value is remade from its 8 clocks, Then it matches the table", (preset) => {
    const t = crcTable(preset.params);
    for (const i of [0, 1, 0x80, 0xa5, 0xff]) expect(entryClocks(preset.params, i)[7]!.reg).toBe(t[i]);
  });

  it.each(CATALOGUE)("Given $name, When 123456789 is computed a byte at a time, Then it equals the check value", (preset) => {
    expect(tableRun(preset.params, text("123456789"))!.result).toBe(preset.check);
  });

  it.each(CATALOGUE)(
    "Given $name, When other inputs are computed a byte at a time, Then they equal the bit-at-a-time CRC",
    (preset) => {
      for (const s of ["", "A", "The quick brown fox"])
        expect(tableRun(preset.params, text(s))!.result).toBe(crcOf(preset.params, text(s)));
    },
  );

  it("Given CRC-16/XMODEM and the input 12, When computed a byte at a time, Then each step chains the crc and indexes the table", () => {
    const run = tableRun(params("CRC-16/XMODEM"), text("12"))!;
    expect(run.start).toBe(0);
    expect(run.steps).toHaveLength(2);
    expect(run.steps[0]).toMatchObject({ byte: 0x31, before: 0, index: 0x31 });
    expect(run.steps[1]!.before).toBe(run.steps[0]!.after);
    expect(run.steps[0]!.entry).toBe(crcTable(params("CRC-16/XMODEM"))[0x31]);
  });

  it("Given an input that is not a multiple of 8 bits, When computed a byte at a time, Then it does not apply", () => {
    expect(tableRun(params("CRC-3/GSM"), [1, 0, 1])).toBeUndefined();
  });
});
