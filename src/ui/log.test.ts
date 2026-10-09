import { describe, expect, it } from "vitest";
import { trace, type Bit, type CrcParams } from "../domain/trace";
import { logEntries } from "./log";

const plain3: CrcParams = { width: 3, poly: 0b011, init: 0, refin: false, refout: false, xorout: 0 };
const bits = (s: string): Bit[] => [...s].map((c) => (c === "1" ? 1 : 0));
const steps = trace(plain3, bits("10101"));

describe("logEntries", () => {
  it("先頭から現在位置までを新しい順に並べる", () => {
    const entries = logEntries(steps, 3, 50);
    expect(entries.map((e) => e.index)).toEqual([3, 2, 1, 0]);
    expect(entries.map((e) => e.title)).toEqual(["多項式と XOR", "シフト", "フィードバックビットの計算", "初期化"]);
  });

  it("各行は処理後の crc を 2 進と 16 進で持つ", () => {
    const [latest] = logEntries(steps, 3, 50);
    expect(latest).toMatchObject({ bin: "0b011", hex: "0x3" });
  });

  it("フィードバックビットの計算には式を、シフトにはフィードバックビットを添える", () => {
    const entries = logEntries(steps, 2, 50);
    expect(entries[0]!.detail).toBe("feedback = 1 なので次に poly と XOR する");
    expect(entries[1]!.detail).toBe("msb 0 ⊕ bit 1 = feedback 1");
    const noXor = logEntries(steps, 5, 50)[0]!;
    expect(noXor).toMatchObject({ title: "シフト", detail: "feedback = 0 なので XOR しない" });
  });

  it("入力ビットの番号を添える", () => {
    expect(logEntries(steps, 4, 50)[0]!.bitNo).toBe(2);
    expect(logEntries(steps, 0, 50)[0]!.bitNo).toBeUndefined();
  });

  it("limit を超える古い行は捨てる", () => {
    expect(logEntries(steps, 14, 5).map((e) => e.index)).toEqual([14, 13, 12, 11, 10]);
  });
});
