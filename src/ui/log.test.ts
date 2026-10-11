import { describe, expect, it } from "vitest";
import { trace } from "../domain/trace";
import { bits, plain3 } from "../testing/fixtures";
import { logEntries } from "./log";

describe("logEntries", () => {
  describe("Given CRC-3/TUTORIAL に 10101 を流した 15 ステップ", () => {
    const steps = trace(plain3, bits("10101"));

    it("When 4 番目（xor）まで進む, Then 先頭から現在位置までを新しい順に並べる", () => {
      const entries = logEntries(steps, 3, 50);

      expect(entries.map((e) => e.index)).toEqual([3, 2, 1, 0]);
      expect(entries.map((e) => e.title)).toEqual(["多項式と XOR", "シフト", "フィードバックビットの計算", "初期化"]);
    });

    it("When 4 番目（xor）まで進む, Then 最新の行は処理後の crc を 2 進と 16 進で持つ", () => {
      const [latest] = logEntries(steps, 3, 50);

      expect(latest).toMatchObject({ bin: "0b011", hex: "0x3" });
    });

    it("When feedback 1 のクロックの shift まで進む, Then シフトに次の XOR を、フィードバックビットの計算に式を添える", () => {
      const [shift, feedback] = logEntries(steps, 2, 50);

      expect(shift!.detail).toBe("feedback = 1 なので次に poly と XOR する");
      expect(feedback!.detail).toBe("msb 0 ⊕ bit 1 = feedback 1");
    });

    it("When feedback 0 のクロックの shift まで進む, Then XOR しないと添える", () => {
      const [latest] = logEntries(steps, 5, 50);

      expect(latest).toMatchObject({ title: "シフト", detail: "feedback = 0 なので XOR しない" });
    });

    it("When 各位置まで進む, Then クロックの行には入力ビットの番号を添え、init には添えない", () => {
      expect(logEntries(steps, 4, 50)[0]!.bitNo).toBe(2);
      expect(logEntries(steps, 0, 50)[0]!.bitNo).toBeUndefined();
    });

    it("When 行数の上限を 5 にして末尾まで進む, Then 上限を超える古い行は捨てる", () => {
      expect(logEntries(steps, 14, 5).map((e) => e.index)).toEqual([14, 13, 12, 11, 10]);
    });
  });
});
