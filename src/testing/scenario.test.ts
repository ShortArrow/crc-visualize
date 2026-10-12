import { describe, expect, it } from "vitest";
import { scenarioStepsViolation, scenarioViolation, type StepKeyword } from "./scenario";

describe("scenarioViolation", () => {
  it("Given 対象の describe 直下のテスト, When 名前が Given・When・Then の順にそろう, Then 違反なし", () => {
    const violation = scenarioViolation("Given 前提, When 操作, Then 結果", ["対象"]);

    expect(violation).toBeUndefined();
  });

  it.each([
    "When 操作, Then 結果",
    "Given 前提, Then 結果",
    "Given 前提, When 操作",
    "When 操作, Given 前提, Then 結果",
    "前提で操作すると結果になる",
  ])("Given 対象の describe 直下のテスト, When 名前が %j, Then 名前の形の違反になる", (name) => {
    const violation = scenarioViolation(name, ["対象"]);

    expect(violation).toMatch(/Given …, When …, Then …/);
  });

  it.each([[[]], [["対象", "Given 前提"]]])(
    "Given describe の入れ子が %j, When 名前はそろう, Then 入れ子の違反になる",
    (describes) => {
      const violation = scenarioViolation("Given 前提, When 操作, Then 結果", describes);

      expect(violation).toMatch(/describe\("<対象>"\) の直下/);
    },
  );
});

describe("scenarioStepsViolation", () => {
  it.each<StepKeyword[][]>([
    [["Given", "When", "Then"]],
    [["Given", "When", "Then", "Then"]],
    [["Given", "Then", "When", "Then"]],
    [["Given", "When", "Then", "When", "Then", "Then"]],
  ])("Given 対象の describe 直下のテスト, When 手順が %j, Then 違反なし", (steps) => {
    const violation = scenarioStepsViolation(["対象"], steps);

    expect(violation).toBeUndefined();
  });

  it.each<StepKeyword[][]>([
    [[]],
    [["When", "Then"]],
    [["Given", "Given", "When", "Then"]],
    [["Given", "When"]],
    [["Given", "When", "When", "Then"]],
    [["Given", "When", "Then", "When"]],
    [["Given"]],
  ])("Given 対象の describe 直下のテスト, When 手順が %j, Then 手順の並びの違反になる", (steps) => {
    const violation = scenarioStepsViolation(["対象"], steps);

    expect(violation).toMatch(/Given 1 つ/);
  });

  it("Given describe の外のテスト, When 手順はそろう, Then 入れ子の違反になる", () => {
    const violation = scenarioStepsViolation([], ["Given", "When", "Then"]);

    expect(violation).toMatch(/describe\("<対象>"\) の直下/);
  });
});
