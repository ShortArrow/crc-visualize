import { beforeEach } from "vitest";
import type { TestContext } from "vitest";
import { scenarioViolation } from "./scenario";

/** Lists the names of the describes enclosing a test, outermost first, excluding the file itself. */
function describesOf(test: TestContext["task"]): string[] {
  const names: string[] = [];
  for (let suite = test.suite; suite && suite !== test.file; suite = suite.suite) {
    names.unshift(suite.name);
  }
  return names;
}

/** Checks the naming rule (scenarioViolation) before every unit test and fails the test if it is broken. */
beforeEach(({ task }) => {
  const violation = scenarioViolation(task.name, describesOf(task));
  if (violation) throw new Error(violation);
});
