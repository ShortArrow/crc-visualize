import { describe, expect, it } from "vitest";
import { PRESETS } from "../domain/presets";
import { presetLabel } from "./presetLabel";

const named = (name: string) => PRESETS.find((p) => p.name === name)!;

describe("presetLabel", () => {
  it("Given CRC-16/KERMIT with aliases, When making the selector label, Then the aliases follow the official name in full-width parentheses and the same-width prefix CRC-16/ is omitted", () => {
    expect(presetLabel(named("CRC-16/KERMIT"))).toBe("CRC-16/KERMIT（CCITT、CCITT-TRUE、CRC-CCITT）");
  });

  it("Given CRC-32/ISO-HDLC with an alias lacking the prefix, When making the selector label, Then that alias is added as it is", () => {
    expect(presetLabel(named("CRC-32/ISO-HDLC"))).toBe("CRC-32/ISO-HDLC（CRC-32、PKZIP、V-42）");
  });

  it("Given CRC-16/USB without aliases, When making the selector label, Then only the official name", () => {
    expect(presetLabel(named("CRC-16/USB"))).toBe("CRC-16/USB");
  });
});
