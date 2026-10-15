import { describe, expect, it } from "vitest";
import { AMBIGUOUS_NAMES, aliasIndex, polyFamilies, splitPresetName } from "./naming";
import { CATALOGUE } from "./presets";

describe("splitPresetName", () => {
  it("Given canonical name CRC-16/KERMIT, When parsed, Then it splits into CRC, width and suffix", () => {
    expect(splitPresetName("CRC-16/KERMIT")).toEqual({ head: "CRC", width: "16", origin: "KERMIT" });
  });

  it("Given CRC-32/ISO-HDLC with a hyphen in the suffix, When parsed, Then the suffix stays intact", () => {
    expect(splitPresetName("CRC-32/ISO-HDLC")).toEqual({ head: "CRC", width: "32", origin: "ISO-HDLC" });
  });
});

describe("polyFamilies", () => {
  it("Given the reveng catalogue presets, When grouped into families, Then only width and poly pairs shared by two or more appear, in ascending order of width then poly", () => {
    const families = polyFamilies(CATALOGUE);

    expect(families.map((f) => [f.width, f.poly])).toEqual([
      [16, 0x1021],
      [16, 0x8005],
      [32, 0x04c11db7],
    ]);
  });

  it("Given the reveng catalogue presets, When the poly 0x1021 family is inspected, Then it has 6 members in preset list order", () => {
    const ccitt = polyFamilies(CATALOGUE).find((f) => f.poly === 0x1021)!;

    expect(ccitt.rows.map((r) => r.preset.name)).toEqual([
      "CRC-16/IBM-3740",
      "CRC-16/XMODEM",
      "CRC-16/KERMIT",
      "CRC-16/IBM-SDLC",
      "CRC-16/SPI-FUJITSU",
      "CRC-16/GENIBUS",
    ]);
  });

  it("Given the reveng catalogue presets, When the poly 0x1021 family is inspected, Then each row shows only the columns that differ from the first, IBM-3740", () => {
    const ccitt = polyFamilies(CATALOGUE).find((f) => f.poly === 0x1021)!;
    const differs = Object.fromEntries(ccitt.rows.map((r) => [r.preset.name, r.differs]));

    expect(differs["CRC-16/IBM-3740"]).toEqual({ init: false, reflect: false, xorout: false });
    expect(differs["CRC-16/XMODEM"]).toEqual({ init: true, reflect: false, xorout: false });
    expect(differs["CRC-16/IBM-SDLC"]).toEqual({ init: false, reflect: true, xorout: true });
  });
});

describe("aliasIndex", () => {
  it("Given the reveng catalogue presets, When turned into an alias table, Then aliases are in alphanumeric order and each maps to its canonical name", () => {
    const index = aliasIndex(CATALOGUE);

    const aliases = index.map((e) => e.alias);
    expect(aliases).toEqual([...aliases].sort((a, b) => a.localeCompare(b, "en")));
    expect(index).toContainEqual({ alias: "CRC-32C", name: "CRC-32/ISCSI" });
    expect(index).toContainEqual({ alias: "CRC-16/CCITT-FALSE", name: "CRC-16/IBM-3740" });
  });
});

describe("AMBIGUOUS_NAMES", () => {
  it("Given a name whose meaning varies by convention, When CRC-16-CCITT is looked up, Then every candidate is a preset canonical name", () => {
    const names = CATALOGUE.map((p) => p.name);
    const ccitt = AMBIGUOUS_NAMES.find((a) => a.alias === "CRC-16-CCITT")!;

    expect(ccitt.candidates.length).toBeGreaterThan(1);
    ccitt.candidates.forEach((c) => expect(names).toContain(c));
  });
});
