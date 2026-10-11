import { describe, expect, it } from "vitest";
import { trace } from "../domain/trace";
import { bits, plain3 } from "../testing/fixtures";
import { logEntries } from "./log";

/** CRC-3/TUTORIAL に 10101 を流した 15 ステップ。 */
const tutorial = trace(plain3, bits("10101"));

describe("logEntries", () => {
  it("Given CRC-3/TUTORIAL に 10101 を流した, When 4 番目（xor）まで進む, Then 先頭から現在位置までを新しい順に並べる", () => {
    const entries = logEntries(tutorial, 3, 50);

    expect(entries.map((e) => e.index)).toEqual([3, 2, 1, 0]);
    expect(entries.map((e) => e.title)).toEqual(["多項式と XOR", "シフト", "フィードバックビットの計算", "初期化"]);
  });

  it("Given CRC-3/TUTORIAL に 10101 を流した, When 4 番目（xor）まで進む, Then 最新の行は処理後の crc を 2 進と 16 進で持つ", () => {
    const [latest] = logEntries(tutorial, 3, 50);

    expect(latest).toMatchObject({ bin: "0b011", hex: "0x3" });
  });

  it("Given CRC-3/TUTORIAL に 10101 を流した, When feedback 1 のクロックの shift まで進む, Then シフトに次の XOR を、フィードバックビットの計算に式を添える", () => {
    const [shift, feedback] = logEntries(tutorial, 2, 50);

    expect(shift!.detail).toBe("feedback = 1 なので次に poly と XOR する");
    expect(feedback!.detail).toBe("msb 0 ⊕ bit 1 = feedback 1");
  });

  it("Given CRC-3/TUTORIAL に 10101 を流した, When feedback 0 のクロックの shift まで進む, Then XOR しないと添える", () => {
    const [latest] = logEntries(tutorial, 5, 50);

    expect(latest).toMatchObject({ title: "シフト", detail: "feedback = 0 なので XOR しない" });
  });

  it("Given CRC-3/TUTORIAL に 10101 を流した, When 各位置まで進む, Then クロックの行には入力ビットの番号を添え、init には添えない", () => {
    expect(logEntries(tutorial, 4, 50)[0]!.bitNo).toBe(2);
    expect(logEntries(tutorial, 0, 50)[0]!.bitNo).toBeUndefined();
  });

  it("Given CRC-3/TUTORIAL に 10101 を流した, When 行数の上限を 5 にして末尾まで進む, Then 上限を超える古い行は捨てる", () => {
    expect(logEntries(tutorial, 14, 5).map((e) => e.index)).toEqual([14, 13, 12, 11, 10]);
  });
});
