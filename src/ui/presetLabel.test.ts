import { describe, expect, it } from "vitest";
import { PRESETS } from "../domain/presets";
import { presetLabel } from "./presetLabel";

const named = (name: string) => PRESETS.find((p) => p.name === name)!;

describe("presetLabel", () => {
  it("Given 別名のある CRC-16/KERMIT, When 選択肢の表示名にする, Then 正式名の後に全角括弧で別名を添え、同じ幅の接頭辞 CRC-16/ は省く", () => {
    expect(presetLabel(named("CRC-16/KERMIT"))).toBe("CRC-16/KERMIT（CCITT、CCITT-TRUE、CRC-CCITT）");
  });

  it("Given 接頭辞の無い別名を持つ CRC-32/ISO-HDLC, When 選択肢の表示名にする, Then その別名はそのまま添える", () => {
    expect(presetLabel(named("CRC-32/ISO-HDLC"))).toBe("CRC-32/ISO-HDLC（CRC-32、PKZIP、V-42）");
  });

  it("Given 別名の無い CRC-16/USB, When 選択肢の表示名にする, Then 正式名だけ", () => {
    expect(presetLabel(named("CRC-16/USB"))).toBe("CRC-16/USB");
  });
});
