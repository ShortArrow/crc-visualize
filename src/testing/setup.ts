import { beforeEach } from "vitest";
import type { TestContext } from "vitest";
import { scenarioViolation } from "./scenario";

/** テストを囲む describe の名前を外側から並べる。ファイル自体は含めない。 */
function describesOf(test: TestContext["task"]): string[] {
  const names: string[] = [];
  for (let suite = test.suite; suite && suite !== test.file; suite = suite.suite) {
    names.unshift(suite.name);
  }
  return names;
}

/** 全単体テストの前に書き方の決まり（scenarioViolation）を確かめ、破っていればそのテストを失敗にする。 */
beforeEach(({ task }) => {
  const violation = scenarioViolation(task.name, describesOf(task));
  if (violation) throw new Error(violation);
});
