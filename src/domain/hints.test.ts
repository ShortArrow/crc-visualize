import { describe, expect, it } from "vitest";
import { crcOf } from "./equivalence";
import { crcRange, presetHints, rangeHints, rowHints, valueHints } from "./hints";
import type { Frames } from "./parse";
import { CATALOGUE } from "./presets";
import { bitsFromBytes, type CrcParams } from "./trace";

describe("valueHints", () => {
  it("Given CRC-16/ARC's 0xBB3D, When 0x3DBB is pasted, Then it would match with its bytes in the other order", () => {
    expect(valueHints(0x3dbbn, 0xbb3dn, 16, 0n)).toEqual(["order"]);
  });
  it("Given 0xBB3D, When 0xBCDD, its 16 bits reflected, is pasted, Then it would match reflected", () => {
    expect(valueHints(0xbcddn, 0xbb3dn, 16, 0n)).toEqual(["reflect"]);
  });
  it("Given xorout 0, When 0xBB3D XOR all ones is pasted, Then only the all-ones XOR is a hint, as the xorout XOR is not tried", () => {
    expect(valueHints(0x44c2n, 0xbb3dn, 16, 0n)).toEqual(["ones"]);
  });
  it("Given CRC-32's xorout of all ones, When the check XOR all ones is pasted, Then it would match XORed with xorout, and all ones is not tried apart", () => {
    expect(valueHints(0x340bc6d9n, 0xcbf43926n, 32, 0xffffffffn)).toEqual(["xorout"]);
  });
  it("Given xorout 0x0F0F, When the value had its bytes swapped after skipping the XOR, Then the order is reversed first and the XOR applied after", () => {
    const computed = 0x1234n;
    const skipped = computed ^ 0x0f0fn;
    const yours = ((skipped & 0xffn) << 8n) | (skipped >> 8n);
    expect(valueHints(yours, computed, 16, 0x0f0fn)).toEqual(["order+xorout"]);
  });
  it("Given 0xBB3D and xorout 0, When its all-ones XOR is pasted with its bytes swapped, Then it would match in the other order XORed with all ones", () => {
    expect(valueHints(0xc244n, 0xbb3dn, 16, 0n)).toEqual(["order+ones"]);
  });
  it("Given xorout 0x0F0F, When the value had its bits reflected after skipping the XOR, Then reflecting and XORing with xorout is a hint", () => {
    const computed = 0x1234n;
    const skipped = computed ^ 0x0f0fn;
    const yours = BigInt(`0b${skipped.toString(2).padStart(16, "0").split("").reverse().join("")}`);
    expect(valueHints(yours, computed, 16, 0x0f0fn)).toEqual(["reflect+xorout"]);
  });
  it("Given a value whose bytes each read the same reflected, When pasted with its bytes swapped, Then both the order and the reflection are hints, in that order", () => {
    expect(valueHints(0x8118n, 0x1881n, 16, 0n)).toEqual(["order", "reflect"]);
  });
  it("Given width 8, When the value reads the same in the other byte order, Then the byte order is not tried", () => {
    expect(valueHints(0x2fn, 0xf4n, 8, 0n)).toEqual(["reflect"]);
  });
  it("Given width 12, When the bytes of 0x0A0B are swapped, Then the result fits in 12 bits and would match", () => {
    expect(valueHints(0x0b0an, 0x0a0bn, 12, 0n)).toEqual(["order"]);
  });
  it("Given width 5, When the value is reflected, Then no hint is given, as a transformed value matches by chance too often", () => {
    expect(valueHints(0b10000n, 0b00001n, 5, 0n)).toEqual([]);
  });
  it("Given equal values, When compared, Then there is no hint", () => {
    expect(valueHints(0xbb3dn, 0xbb3dn, 16, 0n)).toEqual([]);
  });
  it("Given no final XOR, as for a table entry, When the value XOR all ones or in the other byte order is pasted, Then only the byte order is a hint", () => {
    expect(valueHints(0x44c2n, 0xbb3dn, 16, undefined)).toEqual([]);
    expect(valueHints(0x3dbbn, 0xbb3dn, 16, undefined)).toEqual(["order"]);
  });
});

const XMODEM: CrcParams = { width: 16, poly: 0x1021n, init: 0n, refin: false, refout: false, xorout: 0n };
const bytesOf = (text: string) => [...text].map((c) => c.charCodeAt(0));
const crcOfBytes = (params: CrcParams, bytes: readonly number[]) => crcOf(params, bitsFromBytes(bytes));

describe("rangeHints", () => {
  it("Given the whole of 123456789 as the range, When your crc is that of its first 7 bytes, Then it would match ending 2 bytes earlier", () => {
    const bytes = bytesOf("123456789");
    const range = { bytes, from: 0, to: 8, last: 8 };
    expect(rangeHints(XMODEM, range, crcOfBytes(XMODEM, bytes.slice(0, 7)))).toEqual([-2]);
  });
  it("Given a frame with 2 bytes after the range, When your crc takes in one of them, Then it would match ending 1 byte later", () => {
    const bytes = [...bytesOf("123456789"), 0x31, 0xc3];
    const range = { bytes, from: 0, to: 8, last: 10 };
    expect(rangeHints(XMODEM, range, crcOfBytes(XMODEM, bytes.slice(0, 10)))).toEqual([1]);
  });
  it("Given ends both earlier and later that give the same CRC, When listed, Then the earlier ones come first, the nearer first", () => {
    const bytes = [0x00, 0x00, 0x00, 0x00, 0x00];
    const range = { bytes, from: 0, to: 2, last: 4 };
    const yours = crcOfBytes(XMODEM, bytes.slice(0, 2));
    expect(rangeHints(XMODEM, range, yours)).toEqual([-1, -2, 1, 2]);
  });
  it("Given a range of one byte, When your crc is that of no bytes, Then the range is not made shorter than one byte", () => {
    const range = { bytes: [0x31], from: 0, to: 0, last: 0 };
    expect(rangeHints(XMODEM, range, crcOfBytes(XMODEM, []))).toEqual([]);
  });
  it("Given width 5, When the range ending earlier would match, Then no hint is given", () => {
    const usb: CrcParams = { width: 5, poly: 0x5n, init: 0x1fn, refin: true, refout: true, xorout: 0x1fn };
    const bytes = bytesOf("123456789");
    expect(rangeHints(usb, { bytes, from: 0, to: 8, last: 8 }, crcOfBytes(usb, bytes.slice(0, 8)))).toEqual([]);
  });
});

describe("crcRange", () => {
  it("Given text input, When finding the range, Then it is the whole input and cannot end later", () => {
    expect(crcRange(bitsFromBytes([0x31, 0x32]), undefined, 16)).toEqual({ bytes: [0x31, 0x32], from: 0, to: 1, last: 1 });
  });
  it("Given binary input that is not whole bytes, When finding the range, Then there is none", () => {
    expect(crcRange([1, 0, 1], undefined, 16)).toBeUndefined();
  });
  it("Given hex frames with a CRC field, When finding the range, Then it is that of the selected frame, which can end as late as its last byte", () => {
    const frames: Frames = {
      list: [[0x01], [0x31, 0x32, 0x33, 0xaa, 0xbb]],
      layout: { from: 0, crcField: "be" },
      selected: 1,
    };
    expect(crcRange([], frames, 16)).toEqual({ bytes: [0x31, 0x32, 0x33, 0xaa, 0xbb], from: 0, to: 2, last: 4 });
  });
});

describe("rowHints", () => {
  const row = (yours: bigint, computed: bigint) => ({ at: 0, yours, computed, ok: yours === computed, step: 0 });
  it("Given a row whose value is the one computed for the row before, When listed, Then it would match the row before", () => {
    const rows = [row(0x10n, 0x10n), row(0x10n, 0x20n), row(0x30n, 0x30n)];
    expect(rowHints(rows, 1, 8)).toEqual(["before"]);
  });
  it("Given a row whose value is the one computed for the row after, When listed, Then it would match the row after", () => {
    const rows = [row(0x10n, 0x10n), row(0x30n, 0x20n), row(0x30n, 0x30n)];
    expect(rowHints(rows, 1, 8)).toEqual(["after"]);
  });
  it("Given width 5, When the row before matches, Then no hint is given", () => {
    const rows = [row(0x1n, 0x1n), row(0x1n, 0x2n)];
    expect(rowHints(rows, 1, 5)).toEqual([]);
  });
});

describe("presetHints", () => {
  const arc = CATALOGUE.find((p) => p.name === "CRC-16/ARC")!;
  it("Given CRC-16/ARC, When your check is that of CRC-16/MODBUS, Then CRC-16/MODBUS is named and CRC-16/ARC is not", () => {
    const named = presetHints(CATALOGUE, arc.params, 0x4b37n, (p) => p.check).map((p) => p.name);
    expect(named).toContain("CRC-16/MODBUS");
    expect(named).not.toContain("CRC-16/ARC");
  });
  it("Given CRC-16/ARC, When your check is that of a 32-bit preset, Then no preset of another width is named", () => {
    expect(presetHints(CATALOGUE, arc.params, 0xcbf43926n, (p) => p.check)).toEqual([]);
  });
  it("Given CRC-5/USB, When your check is that of another 5-bit preset, Then no hint is given", () => {
    const usb = CATALOGUE.find((p) => p.name === "CRC-5/USB")!;
    const other = CATALOGUE.find((p) => p.params.width === 5 && p !== usb)!;
    expect(presetHints(CATALOGUE, usb.params, other.check, (p) => p.check)).toEqual([]);
  });
});
