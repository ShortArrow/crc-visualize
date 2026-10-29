import { describe, expect, it } from "vitest";
import { crcOf } from "./equivalence";
import { CATALOGUE } from "./presets";
import {
  crcTable,
  entryClocks,
  fillSteps,
  filledEntries,
  tableDirection,
  tablePlay,
  tableRun,
  useSteps,
  valueSteps,
  type TablePlayStep,
} from "./table";
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

  it("Given width 7 and poly 0x9 and index 0x41, When the 8 clocks are listed, Then each shows its feedback, the shifted register and poly XORed in only when the feedback is 1", () => {
    const clocks = entryClocks({ ...params("CRC-16/XMODEM"), width: 7, poly: 0x9 }, 0x41);
    expect(clocks.map((c) => c.feedback)).toEqual([0, 1, 0, 0, 0, 1, 0, 1]);
    expect(clocks.map((c) => c.shifted)).toEqual([0, 0, 0b0010010, 0b0100100, 0b1001000, 0b0010000, 0b0110010, 0b1100100]);
    expect(clocks.map((c) => c.xor)).toEqual([0, 0x9, 0, 0, 0, 0x9, 0, 0x9]);
    expect(clocks.map((c) => c.reg)).toEqual([0, 0b0001001, 0b0010010, 0b0100100, 0b1001000, 0b0011001, 0b0110010, 0x6d]);
  });

  it("Given CRC-32/ISO-HDLC and index 1, When the first clock is listed, Then the bit shifted out on the right sets the feedback and the reversed poly is XORed in", () => {
    const [first] = entryClocks(params("CRC-32/ISO-HDLC"), 1);
    expect(first).toEqual({ bit: 1, feedback: 1, shifted: 0, xor: 0xedb88320, reg: 0xedb88320 });
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

describe("tablePlay", () => {
  const kinds = (steps: readonly TablePlayStep[]) => steps.map((s) => s.kind);

  it("Given CRC-16/XMODEM and 2 bytes, When the steps are made, Then the table is built clock by clock for T[1] and T[2], filled one value at a time, and then used byte by byte", () => {
    const steps = tablePlay(params("CRC-16/XMODEM"), text("12"));
    expect(steps[0]).toEqual({ kind: "start" });
    expect(steps.slice(1, 17)).toEqual(
      [1, 2].flatMap((entry) => Array.from({ length: 8 }, (_, clock) => ({ kind: "clock", entry, clock }))),
    );
    expect(steps.slice(17, 270)).toEqual(Array.from({ length: 253 }, (_, k) => ({ kind: "fill", entry: k + 3 })));
    expect(steps.slice(270)).toEqual([
      { kind: "index", byte: 0 },
      { kind: "lookup", byte: 0 },
      { kind: "update", byte: 0 },
      { kind: "index", byte: 1 },
      { kind: "lookup", byte: 1 },
      { kind: "update", byte: 1 },
      { kind: "xorOut" },
      { kind: "done" },
    ]);
  });

  it("Given a left-shift table with refout, When the steps are made, Then the output reflection comes before xorOut", () => {
    expect(kinds(tablePlay({ ...params("CRC-16/XMODEM"), refout: true }, text("1")).slice(-3))).toEqual([
      "reflectOut",
      "xorOut",
      "done",
    ]);
  });

  it("Given a right-shift table, When the steps are made, Then there is no output reflection", () => {
    expect(kinds(tablePlay(params("CRC-16/ARC"), text("1")).slice(-3))).toEqual(["update", "xorOut", "done"]);
  });

  it("Given an input that is not whole bytes, When the steps are made, Then they end with filling T[255]", () => {
    const steps = tablePlay(params("CRC-3/GSM"), [1, 0, 1]);
    expect(steps).toHaveLength(270);
    expect(steps.at(-1)).toEqual({ kind: "fill", entry: 255 });
  });
});

describe("filledEntries", () => {
  it.each<[TablePlayStep, number]>([
    [{ kind: "start" }, 1],
    [{ kind: "clock", entry: 1, clock: 6 }, 1],
    [{ kind: "clock", entry: 1, clock: 7 }, 2],
    [{ kind: "clock", entry: 2, clock: 0 }, 2],
    [{ kind: "clock", entry: 2, clock: 7 }, 3],
    [{ kind: "fill", entry: 3 }, 4],
    [{ kind: "fill", entry: 255 }, 256],
    [{ kind: "index", byte: 0 }, 256],
    [{ kind: "done" }, 256],
  ])("Given the step %o, When counting the filled cells, Then T[0] to T[%i - 1] are filled", (step, count) => {
    expect(filledEntries(step)).toBe(count);
  });
});

describe("play steps", () => {
  it("Given a value to make, When its steps are made, Then a step with no clock is followed by one step per clock", () => {
    expect(valueSteps()).toEqual(Array.from({ length: 9 }, (_, done) => ({ kind: "clocks", done })));
  });

  it("Given the table to make, When its steps are made, Then the first holds only T[0] and each next one fills one more cell", () => {
    const steps = fillSteps();
    expect(steps).toHaveLength(256);
    expect([steps[0], steps[1], steps.at(-1)]).toEqual([
      { kind: "filled", count: 1 },
      { kind: "filled", count: 2 },
      { kind: "filled", count: 256 },
    ]);
  });

  it("Given CRC-16/XMODEM and 2 bytes, When the steps of using the table are made, Then each byte is index, look-up and update, then xorOut and done", () => {
    expect(useSteps(params("CRC-16/XMODEM"), text("12"))).toEqual([
      { kind: "index", byte: 0 },
      { kind: "lookup", byte: 0 },
      { kind: "update", byte: 0 },
      { kind: "index", byte: 1 },
      { kind: "lookup", byte: 1 },
      { kind: "update", byte: 1 },
      { kind: "xorOut" },
      { kind: "done" },
    ]);
  });

  it("Given a left-shift table with refout, When the steps of using it are made, Then the output reflection comes before xorOut", () => {
    expect(useSteps({ ...params("CRC-16/XMODEM"), refout: true }, text("1"))!.slice(-3)).toEqual([
      { kind: "reflectOut" },
      { kind: "xorOut" },
      { kind: "done" },
    ]);
  });

  it("Given an input that is not whole bytes, When the steps of using the table are made, Then there are none", () => {
    expect(useSteps(params("CRC-3/GSM"), [1, 0, 1])).toBeUndefined();
  });
});
