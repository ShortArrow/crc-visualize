import { describe, expect, it } from "vitest";
import { trace } from "../domain/trace";
import { bits, plain3 } from "../testing/fixtures";
import { ja } from "../i18n/ja";
import { logEntries } from "./log";

/** The 15 steps of feeding 10101 into CRC-3/TUTORIAL. */
const tutorial = trace(plain3, bits("10101"));

describe("logEntries", () => {
  it("Given 10101 fed into CRC-3/TUTORIAL, When advancing in Japanese to the 4th step (xor), Then the steps from the start to the current position are listed newest first", () => {
    const entries = logEntries(tutorial, 3, 50, ja);

    expect(entries.map((e) => e.index)).toEqual([3, 2, 1, 0]);
    expect(entries.map((e) => e.title)).toEqual(["多項式と XOR", "シフト", "フィードバックビットの計算", "初期化"]);
  });

  it("Given 10101 fed into CRC-3/TUTORIAL, When advancing to the 4th step (xor), Then the newest line holds crc after processing in binary and hexadecimal", () => {
    const [latest] = logEntries(tutorial, 3, 50, ja);

    expect(latest).toMatchObject({ bin: "0b011", hex: "0x3" });
  });

  it("Given 10101 fed into CRC-3/TUTORIAL, When advancing to the shift of a clock with feedback 1, Then the shift notes the next XOR and the feedback bit calculation notes the formula", () => {
    const [shift, feedback] = logEntries(tutorial, 2, 50, ja);

    expect(shift!.detail).toBe("feedback = 1 なので次に poly と XOR する");
    expect(feedback!.detail).toBe("msb 0 ⊕ bit 1 = feedback 1");
  });

  it("Given 10101 fed into CRC-3/TUTORIAL, When advancing to the shift of a clock with feedback 0, Then it notes that no XOR follows", () => {
    const [latest] = logEntries(tutorial, 5, 50, ja);

    expect(latest).toMatchObject({ title: "シフト", detail: "feedback = 0 なので XOR しない" });
  });

  it("Given 10101 fed into CRC-3/TUTORIAL, When advancing to each position, Then clock lines note the input bit number and init does not", () => {
    expect(logEntries(tutorial, 4, 50, ja)[0]!.bitNo).toBe(2);
    expect(logEntries(tutorial, 0, 50, ja)[0]!.bitNo).toBeUndefined();
  });

  it("Given 10101 fed into CRC-3/TUTORIAL, When advancing to the end with a limit of 5 lines, Then old lines beyond the limit are dropped", () => {
    expect(logEntries(tutorial, 14, 5, ja).map((e) => e.index)).toEqual([14, 13, 12, 11, 10]);
  });
});
