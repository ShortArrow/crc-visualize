import { test as base } from "@playwright/test";
import { scenarioStepsViolation, type StepKeyword } from "../../src/testing/scenario";

let topLevelSteps: StepKeyword[] = [];
let depth = 0;

function step(keyword: StepKeyword) {
  return async <T>(title: string, body: () => Promise<T>): Promise<T> => {
    if (depth === 0) topLevelSteps.push(keyword);
    depth++;
    try {
      return await base.step(`${keyword} ${title}`, body);
    } finally {
      depth--;
    }
  };
}

/** 前提を整える手順。Playwright の報告に "Given ..." として出る。 */
export const given = step("Given");
/** 振る舞いを起こす操作。報告に "When ..." として出る。 */
export const when = step("When");
/** 期待する状態の確認。報告に "Then ..." として出る。 */
export const then = step("Then");

/**
 * E2E の test。通ったテストの最上位の手順が書き方の決まり（scenarioStepsViolation）を破っていれば、そのテストを失敗にする。
 * 手順は given / when / then で書いたものだけを数える。
 */
export const test = base.extend<{ scenarioShape: void }>({
  scenarioShape: [
    async ({}, use, testInfo) => {
      topLevelSteps = [];
      depth = 0;
      await use();
      if (testInfo.status !== "passed") return;
      const violation = scenarioStepsViolation(testInfo.titlePath.slice(1, -1), topLevelSteps);
      if (violation) throw new Error(violation);
    },
    { auto: true },
  ],
});
