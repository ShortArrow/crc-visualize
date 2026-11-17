import { describe, expect, it } from "vitest";
import { constantForm, matchLog, matchTable, matchTableLog } from "./compare";
import { crcTable, tableRun } from "./table";
import { bitEndStep, bitsFromBytes, reflectValue, trace, type Bit, type CrcParams } from "./trace";

const SMBUS: CrcParams = { width: 8, poly: 0x07n, init: 0n, refin: false, refout: false, xorout: 0n };
const ARC: CrcParams = { width: 16, poly: 0x8005n, init: 0n, refin: true, refout: true, xorout: 0n };
const CHECK = bitsFromBytes([..."123456789"].map((c) => c.charCodeAt(0)));

/** The left-shift register after each input bit, by a bit-at-a-time loop written apart from trace. */
function registerAfterEachBit({ width, poly, init, refin }: CrcParams, bits: readonly Bit[]): bigint[] {
  const top = BigInt(width - 1);
  const mask = (1n << BigInt(width)) - 1n;
  let reg = init;
  return bits.map((_, k) => {
    const bit = BigInt(refin ? bits[k - (k % 8) + 7 - (k % 8)]! : bits[k]!);
    const fb = ((reg >> top) & 1n) ^ bit;
    reg = (reg << 1n) & mask;
    if (fb === 1n) reg ^= poly;
    return reg;
  });
}

const perByte = (params: CrcParams, bits: readonly Bit[]) => registerAfterEachBit(params, bits).filter((_, k) => k % 8 === 7);

describe("matchLog: the count of your log chooses what it is compared with", () => {
  it("Given n numbers for n input bytes, When matched, Then they are the register after each byte and all match", () => {
    const log = perByte(SMBUS, CHECK);
    const r = matchLog(SMBUS, trace(SMBUS, CHECK), log);

    expect(r).toMatchObject({ ok: true, value: { unit: "byte", shift: "left", firstDiff: undefined } });
    expect(r.ok && r.value.rows.map((row) => [row.at, row.ok])).toEqual(log.map((_, i) => [i, true]));
    expect(log.at(-1)).toBe(0xf4n);
  });

  it("Given n + 1 numbers, When matched, Then the first is init", () => {
    const r = matchLog(SMBUS, trace(SMBUS, CHECK), [0n, ...perByte(SMBUS, CHECK)]);

    expect(r.ok && r.value.rows[0]).toEqual({ at: "init", yours: 0n, computed: 0n, ok: true, step: 0 });
    expect(r.ok && r.value.rows.every((row) => row.ok)).toBe(true);
  });

  it("Given 8n numbers, When matched, Then they are the register after each bit", () => {
    const steps = trace(SMBUS, CHECK);
    const r = matchLog(SMBUS, steps, registerAfterEachBit(SMBUS, CHECK));

    expect(r).toMatchObject({ ok: true, value: { unit: "bit", firstDiff: undefined } });
    expect(r.ok && r.value.rows[5]).toMatchObject({ at: 5, ok: true, step: bitEndStep(steps, 5) });
  });

  it("Given 8n + 1 numbers, When matched, Then the first is init and the rest are per bit", () => {
    const r = matchLog(SMBUS, trace(SMBUS, CHECK), [0n, ...registerAfterEachBit(SMBUS, CHECK)]);

    expect(r).toMatchObject({ ok: true, value: { unit: "bit", firstDiff: undefined } });
    expect(r.ok && r.value.rows.length).toBe(73);
  });

  it("Given any other count, When matched, Then it is an error giving the count and the counts per byte and per bit", () => {
    expect(matchLog(SMBUS, trace(SMBUS, CHECK), [1n, 2n])).toEqual({
      ok: false,
      error: { code: "logCount", got: 2, bytes: 9, bits: 72 },
    });
  });

  it("Given an input that is not whole bytes, When 2 numbers are matched, Then the error gives the counts per bit only", () => {
    const bits: Bit[] = [1, 0, 1, 0, 1];

    expect(matchLog(SMBUS, trace(SMBUS, bits), [1n, 2n])).toEqual({ ok: false, error: { code: "logCount", got: 2, bits: 5 } });
  });
});

describe("matchLog: the shift direction and the first row that differs", () => {
  it("Given refin = refout = true and a log as a right shift holds it, When matched, Then it is compared as a right shift", () => {
    const log = perByte(ARC, CHECK).map((v) => reflectValue(v, 16));
    const r = matchLog(ARC, trace(ARC, CHECK), log);

    expect(r).toMatchObject({ ok: true, value: { unit: "byte", shift: "right", firstDiff: undefined } });
    expect(log.at(-1)).toBe(0xbb3dn);
  });

  it("Given refin = refout = false, When the first number is the reflected one, Then it is still compared as a left shift", () => {
    const log = perByte(SMBUS, CHECK).map((v) => reflectValue(v, 8));
    const r = matchLog(SMBUS, trace(SMBUS, CHECK), log);

    expect(r).toMatchObject({ ok: true, value: { shift: "left" } });
  });

  it("Given a first number that matches neither shift, When matched, Then it is compared as a left shift", () => {
    const log = perByte(ARC, CHECK).map((v) => reflectValue(v, 16));
    const r = matchLog(ARC, trace(ARC, CHECK), [0x1234n, ...log.slice(1)]);

    expect(r).toMatchObject({ ok: true, value: { shift: "left", firstDiff: 0 } });
  });

  it("Given a log that differs from the 4th byte on, When matched, Then the 4th row is the first that differs, ending at its last bit", () => {
    const steps = trace(SMBUS, CHECK);
    const log = perByte(SMBUS, CHECK).map((v, i) => (i >= 3 ? v ^ 1n : v));
    const r = matchLog(SMBUS, steps, log);

    expect(r).toMatchObject({ ok: true, value: { firstDiff: 3 } });
    expect(r.ok && r.value.rows[3]).toMatchObject({ at: 3, ok: false, step: bitEndStep(steps, 31) });
  });
});

describe("constantForm", () => {
  it("Given 0x1021 pasted for a poly of 0x1021 in 16 bits, When compared, Then it is the setting as it is", () => {
    expect(constantForm(0x1021n, 0x1021n, 16)).toBe("asIs");
  });
  it("Given 0x8408 pasted for a poly of 0x1021 in 16 bits, When compared, Then it is the setting reversed", () => {
    expect(constantForm(0x8408n, 0x1021n, 16)).toBe("reversed");
  });
  it("Given 0x1234 pasted for a poly of 0x1021 in 16 bits, When compared, Then it is neither", () => {
    expect(constantForm(0x1234n, 0x1021n, 16)).toBe("neither");
  });
  it("Given 0x15 pasted for a poly of 0x15 in 5 bits, which reads the same reversed, When compared, Then it is as it is", () => {
    expect(constantForm(0x15n, 0x15n, 5)).toBe("asIs");
  });
});

describe("matchTable", () => {
  const XMODEM: CrcParams = { width: 16, poly: 0x1021n, init: 0n, refin: false, refout: false, xorout: 0n };
  const left = crcTable(XMODEM);
  const right = crcTable({ ...XMODEM, refin: true, refout: true });
  it("Given the left-shift table of poly 0x1021, When matched, Then it is the left shift with no difference", () => {
    expect(matchTable(XMODEM, left)).toEqual({ ok: true, value: { shift: "left", firstDiff: undefined } });
  });
  it("Given the right-shift table of poly 0x1021, When matched, Then it is the right shift with no difference", () => {
    expect(matchTable(XMODEM, right)).toEqual({ ok: true, value: { shift: "right", firstDiff: undefined } });
  });
  it("Given the left-shift table with entry 5 changed, When matched, Then it is the left shift, first differing at 5", () => {
    const pasted = left.map((v, i) => (i === 5 ? v ^ 1n : v));
    expect(matchTable(XMODEM, pasted)).toEqual({
      ok: true,
      value: { shift: "left", firstDiff: { index: 5, yours: left[5]! ^ 1n, computed: left[5]! } },
    });
  });
  it("Given 256 zeros, which match both tables at index 0 only, When matched, Then the tie goes to the left shift, first differing at 1", () => {
    const zeros = Array.from({ length: 256 }, () => 0n);
    expect(matchTable(XMODEM, zeros)).toEqual({
      ok: true,
      value: { shift: "left", firstDiff: { index: 1, yours: 0n, computed: left[1]! } },
    });
  });
  it("Given 255 numbers, When matched, Then it is an error that gives the count", () => {
    expect(matchTable(XMODEM, left.slice(1))).toEqual({ ok: false, error: { code: "tableCount", got: 255 } });
  });
});

describe("matchTableLog", () => {
  const XMODEM: CrcParams = { width: 16, poly: 0x1021n, init: 0n, refin: false, refout: false, xorout: 0n };
  const run = tableRun(XMODEM, CHECK)!;
  const after = run.steps.map((s) => s.after);
  it("Given crc after each of the 9 bytes, When matched, Then 9 byte rows match as a left shift", () => {
    const match = matchTableLog(XMODEM, run, after);
    expect(match.ok && match.value.rows.length).toBe(9);
    expect(match.ok && match.value).toMatchObject({ unit: "byte", shift: "left", firstDiff: undefined });
  });
  it("Given init and then crc after each byte, When matched, Then the first row is init", () => {
    const match = matchTableLog(XMODEM, run, [0n, ...after]);
    expect(match.ok && match.value.rows[0]!.at).toBe("init");
  });
  it("Given crc after each byte with the 4th changed, When matched, Then the 4th row, byte 3, differs first", () => {
    const match = matchTableLog(
      XMODEM,
      run,
      after.map((v, i) => (i === 3 ? v ^ 1n : v)),
    );
    expect(match.ok && match.value.firstDiff).toBe(3);
    expect(match.ok && match.value.rows[3]!.step).toBe(3);
  });
  it("Given CRC-16/ARC, whose table shifts right, When matched against its run, Then it is a right shift", () => {
    const arc = tableRun(ARC, CHECK)!;
    const match = matchTableLog(
      ARC,
      arc,
      arc.steps.map((s) => s.after),
    );
    expect(match.ok && match.value).toMatchObject({ shift: "right", firstDiff: undefined });
  });
  it("Given 5 numbers for 9 bytes, When matched, Then it is an error that gives both counts", () => {
    expect(matchTableLog(XMODEM, run, after.slice(0, 5))).toEqual({
      ok: false,
      error: { code: "byteLogCount", got: 5, bytes: 9 },
    });
  });
});
