import { describe, expect, it } from "vitest";
import { AMBIGUOUS_NAMES, aliasIndex, polyFamilies, splitPresetName } from "./naming";
import { CATALOGUE } from "./presets";

describe("splitPresetName", () => {
  it("Given 正式名 CRC-16/KERMIT, When 分解する, Then CRC・幅・後半の名前に分かれる", () => {
    expect(splitPresetName("CRC-16/KERMIT")).toEqual({ head: "CRC", width: "16", origin: "KERMIT" });
  });

  it("Given 後半の名前にハイフンを含む CRC-32/ISO-HDLC, When 分解する, Then 後半はそのまま残る", () => {
    expect(splitPresetName("CRC-32/ISO-HDLC")).toEqual({ head: "CRC", width: "32", origin: "ISO-HDLC" });
  });
});

describe("polyFamilies", () => {
  it("Given reveng カタログのプリセット, When 一族にまとめる, Then 2 つ以上ある幅と poly の組だけを幅・poly の小さい順に並べる", () => {
    const families = polyFamilies(CATALOGUE);

    expect(families.map((f) => [f.width, f.poly])).toEqual([
      [16, 0x1021],
      [16, 0x8005],
      [32, 0x04c11db7],
    ]);
  });

  it("Given reveng カタログのプリセット, When poly 0x1021 の一族を見る, Then プリセットの一覧の順に 6 つ並ぶ", () => {
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

  it("Given reveng カタログのプリセット, When poly 0x1021 の一族を見る, Then 各行は先頭の IBM-3740 と違う列だけを示す", () => {
    const ccitt = polyFamilies(CATALOGUE).find((f) => f.poly === 0x1021)!;
    const differs = Object.fromEntries(ccitt.rows.map((r) => [r.preset.name, r.differs]));

    expect(differs["CRC-16/IBM-3740"]).toEqual({ init: false, reflect: false, xorout: false });
    expect(differs["CRC-16/XMODEM"]).toEqual({ init: true, reflect: false, xorout: false });
    expect(differs["CRC-16/IBM-SDLC"]).toEqual({ init: false, reflect: true, xorout: true });
  });
});

describe("aliasIndex", () => {
  it("Given reveng カタログのプリセット, When 別名の対応表にする, Then 別名を英数字順に並べ、それぞれの正式名を引ける", () => {
    const index = aliasIndex(CATALOGUE);

    const aliases = index.map((e) => e.alias);
    expect(aliases).toEqual([...aliases].sort((a, b) => a.localeCompare(b, "en")));
    expect(index).toContainEqual({ alias: "CRC-32C", name: "CRC-32/ISCSI" });
    expect(index).toContainEqual({ alias: "CRC-16/CCITT-FALSE", name: "CRC-16/IBM-3740" });
  });
});

describe("AMBIGUOUS_NAMES", () => {
  it("Given 流儀で指すものが割れる呼び名, When CRC-16-CCITT を引く, Then 候補はどれもプリセットの正式名", () => {
    const names = CATALOGUE.map((p) => p.name);
    const ccitt = AMBIGUOUS_NAMES.find((a) => a.alias === "CRC-16-CCITT")!;

    expect(ccitt.candidates.length).toBeGreaterThan(1);
    ccitt.candidates.forEach((c) => expect(names).toContain(c));
  });
});
