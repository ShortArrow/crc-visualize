import { describe, expect, it } from "vitest";
import { scenarioStepsViolation, scenarioViolation, type StepKeyword } from "./scenario";

describe("scenarioViolation", () => {
  it("Given a test directly under the subject describe, When its name has Given, When and Then in order, Then there is no violation", () => {
    const violation = scenarioViolation("Given precondition, When action, Then result", ["subject"]);

    expect(violation).toBeUndefined();
  });

  it.each([
    "When action, Then result",
    "Given precondition, Then result",
    "Given precondition, When action",
    "When action, Given precondition, Then result",
    "acting on the precondition gives the result",
  ])("Given a test directly under the subject describe, When its name is %j, Then it violates the name shape", (name) => {
    const violation = scenarioViolation(name, ["subject"]);

    expect(violation).toMatch(/Given …, When …, Then …/);
  });

  it.each([[[]], [["subject", "Given precondition"]]])(
    "Given describe nesting %j, When the name is well-formed, Then it violates the nesting",
    (describes) => {
      const violation = scenarioViolation("Given precondition, When action, Then result", describes);

      expect(violation).toMatch(/directly under describe\("<subject>"\)/);
    },
  );
});

describe("scenarioStepsViolation", () => {
  it.each<StepKeyword[][]>([
    [["Given", "When", "Then"]],
    [["Given", "When", "Then", "Then"]],
    [["Given", "Then", "When", "Then"]],
    [["Given", "When", "Then", "When", "Then", "Then"]],
  ])("Given a test directly under the subject describe, When its steps are %j, Then there is no violation", (steps) => {
    const violation = scenarioStepsViolation(["subject"], steps);

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
  ])("Given a test directly under the subject describe, When its steps are %j, Then it violates the step order", (steps) => {
    const violation = scenarioStepsViolation(["subject"], steps);

    expect(violation).toMatch(/one Given/);
  });

  it("Given a test outside any describe, When its steps are well-formed, Then it violates the nesting", () => {
    const violation = scenarioStepsViolation([], ["Given", "When", "Then"]);

    expect(violation).toMatch(/directly under describe\("<subject>"\)/);
  });
});
