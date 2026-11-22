import { describe, expect, it } from "vitest";
import { checkHints, checkMatches, polyMatches } from "./presetMatch";
import { CATALOGUE } from "./presets";

const names = (presets: readonly { name: string }[]) => presets.map((p) => p.name);

describe("polyMatches", () => {
  it("Given 0x1021 and width 16, When matching, Then CRC-16/XMODEM and CRC-16/KERMIT match in normal notation and no other notation is tried", () => {
    const match = polyMatches(CATALOGUE, 0x1021n, 16);
    expect(names(match.normal)).toEqual(expect.arrayContaining(["CRC-16/XMODEM", "CRC-16/KERMIT"]));
    expect(match.others).toEqual([]);
  });
  it("Given 0x8408 and width 16, When matching, Then nothing matches in normal notation and CRC-16/KERMIT matches in reversed notation", () => {
    const match = polyMatches(CATALOGUE, 0x8408n, 16);
    expect(match.normal).toEqual([]);
    expect(match.others.map((o) => o.notation)).toEqual(["reversed"]);
    expect(names(match.others[0]!.presets)).toContain("CRC-16/KERMIT");
  });
  it("Given 0x8810 and width 16, When matching, Then CRC-16/XMODEM matches in Koopman notation", () => {
    const match = polyMatches(CATALOGUE, 0x8810n, 16);
    expect(match.others.map((o) => o.notation)).toEqual(["koopman"]);
    expect(names(match.others[0]!.presets)).toContain("CRC-16/XMODEM");
  });
  it("Given 0x11021 and width 16, When matching, Then CRC-16/XMODEM matches in the x^width-included notation", () => {
    const match = polyMatches(CATALOGUE, 0x11021n, 16);
    expect(match.others.map((o) => o.notation)).toEqual(["full"]);
    expect(names(match.others[0]!.presets)).toContain("CRC-16/XMODEM");
  });
  it("Given 0x9 and no width, When matching, Then the 5- and 7-bit presets whose normal poly it is match, and the Koopman reading of CRC-4/G-704 is not tried", () => {
    const match = polyMatches(CATALOGUE, 0x9n, undefined);
    expect(names(match.normal)).toEqual(["CRC-5/EPC-C1G2", "CRC-7/MMC"]);
    expect(match.others).toEqual([]);
  });
  it("Given 0x9 and width 4, When matching, Then CRC-4/G-704 and CRC-4/INTERLAKEN match in Koopman notation", () => {
    const match = polyMatches(CATALOGUE, 0x9n, 4);
    expect(match.normal).toEqual([]);
    expect(match.others.map((o) => o.notation)).toEqual(["koopman"]);
    expect(names(match.others[0]!.presets)).toEqual(["CRC-4/G-704", "CRC-4/INTERLAKEN"]);
  });
  it("Given 0x1234 and width 16, When matching, Then no preset matches in any notation", () => {
    expect(polyMatches(CATALOGUE, 0x1234n, 16)).toEqual({ normal: [], others: [] });
  });
});

describe("checkMatches", () => {
  it("Given 0xBB3D and no width, When matching, Then CRC-16/ARC matches", () => {
    expect(names(checkMatches(CATALOGUE, 0xbb3dn, undefined))).toContain("CRC-16/ARC");
  });
  it("Given 0xBB3D and width 32, When matching, Then no preset matches", () => {
    expect(checkMatches(CATALOGUE, 0xbb3dn, 32)).toEqual([]);
  });
});

describe("checkHints", () => {
  const presetsUnder = (value: bigint, width: number | undefined, hint: string) =>
    checkHints(CATALOGUE, value, width).find((h) => h.hint === hint)?.presets ?? [];
  it("Given 0x3DBB and width 16, When trying the hints, Then CRC-16/ARC would match with the bytes in the other order", () => {
    expect(names(presetsUnder(0x3dbbn, 16, "order"))).toContain("CRC-16/ARC");
  });
  it("Given 0x3DBB and width 16, When trying the hints, Then each hint listed has a preset, and the byte order comes first", () => {
    const hints = checkHints(CATALOGUE, 0x3dbbn, 16);
    expect(hints.every((h) => h.presets.length > 0)).toBe(true);
    expect(hints[0]!.hint).toBe("order");
  });
  it("Given the check of CRC-5/USB reflected in 5 bits, When trying the hints with no width, Then no preset of a width below 8 is listed", () => {
    const listed = checkHints(CATALOGUE, 0x13n, undefined).flatMap((h) => h.presets);
    expect(listed.filter((p) => p.params.width < 8)).toEqual([]);
  });
  it("Given 0x13DBB, which does not fit in 16 bits, When trying the hints with no width, Then no 16-bit preset is listed", () => {
    const listed = checkHints(CATALOGUE, 0x13dbbn, undefined).flatMap((h) => h.presets);
    expect(listed.filter((p) => p.params.width === 16)).toEqual([]);
  });
});
