const SCENARIO_NAME = /^Given .+, When .+, Then .+$/s;
const SCENARIO_STEPS = /^G(T*)(WT+)*$/;

/** Kinds of E2E steps; given / when / then in e2e/support appear in reports under these words. */
export type StepKeyword = "Given" | "When" | "Then";

function placementViolation(describes: readonly string[]): string | undefined {
  return describes.length === 1
    ? undefined
    : `Place the test directly under describe("<subject>") (current nesting: ${JSON.stringify(describes)})`;
}

/**
 * Returns a description of the violation if a unit test breaks the naming rule, or undefined if it follows it.
 * Rule: the test sits directly under `describe("<subject>")` and is named `Given <precondition>, When <action>, Then <result>`.
 * describes lists the names of the describes enclosing the test, outermost first.
 */
export function scenarioViolation(name: string, describes: readonly string[]): string | undefined {
  const misplaced = placementViolation(describes);
  if (misplaced) return misplaced;
  if (!SCENARIO_NAME.test(name)) {
    return `Name the test "Given …, When …, Then …" (current name: ${JSON.stringify(name)})`;
  }
  return undefined;
}

/**
 * Returns a description of the violation if an E2E test breaks the step rule, or undefined if it follows it.
 * Rule: the test sits directly under `test.describe("<feature>")` and its top-level steps run
 * one Given, then an optional Then checking the precondition, then repeated pairs of a When and one or more Thens, ending with a Then.
 * steps lists the kinds of the test's top-level steps in execution order.
 */
export function scenarioStepsViolation(describes: readonly string[], steps: readonly StepKeyword[]): string | undefined {
  const misplaced = placementViolation(describes);
  if (misplaced) return misplaced;
  const shape = steps.map((k) => k[0]).join("");
  if (!SCENARIO_STEPS.test(shape) || !shape.endsWith("T")) {
    return `Start the steps with one Given, follow each When with one or more Thens, and end with a Then (current steps: ${steps.join(" → ") || "none"})`;
  }
  return undefined;
}
