import { describe, expect, it } from "vitest";
import { trace, type Step } from "../domain/trace";
import { bits, plain3 } from "../testing/fixtures";
import { variables, type Variable } from "./variables";

const at = (steps: readonly Step[], kind: Step["kind"], nth = 1) =>
  steps.flatMap((s, i) => (s.kind === kind ? [i] : []))[nth - 1]!;
const valueOf = (vars: readonly Variable[], name: Variable["name"]) => vars.find((v) => v.name === name)?.value;
const changed = (vars: readonly Variable[]) => vars.filter((v) => v.changed).map((v) => v.name);

describe("variables", () => {
  const steps = trace(plain3, bits("1010101111110000"));

  it("Given the init step, When reading the variables, Then crc has its value, the counters are 0 and the loop variables have none", () => {
    const vars = variables(steps, 0);

    expect(valueOf(vars, "crc")).toBe("0b000 0x0");
    expect(valueOf(vars, "byte")).toBeUndefined();
    expect(valueOf(vars, "bit")).toBeUndefined();
    expect(valueOf(vars, "feedback")).toBeUndefined();
    expect(valueOf(vars, "bitsRead")).toBe("0 / 16");
    expect(valueOf(vars, "xorCount")).toBe("0");
  });

  it("Given the 1st feedback step, When reading the variables, Then byte, bit and feedback have the values of the 1st clock", () => {
    const vars = variables(steps, at(steps, "feedback"));

    expect(valueOf(vars, "byte")).toBe("0xAB [0]");
    expect(valueOf(vars, "bit")).toBe("1");
    expect(valueOf(vars, "feedback")).toBe("1");
  });

  it("Given the 1st xor step, When reading the variables, Then the bit just read stays, 1 bit has been read and 1 XOR done", () => {
    const vars = variables(steps, at(steps, "xor"));

    expect(valueOf(vars, "bit")).toBe("1");
    expect(valueOf(vars, "bitsRead")).toBe("1 / 16");
    expect(valueOf(vars, "xorCount")).toBe("1");
  });

  it("Given the 1st feedback step of byte 1, When reading the variables, Then byte is byte 1", () => {
    const i = steps.findIndex((s) => s.kind === "feedback" && s.cursor === 8);

    expect(valueOf(variables(steps, i), "byte")).toBe("0xF0 [1]");
  });

  it("Given the done step, When reading the variables, Then byte, bit and feedback have no value", () => {
    const vars = variables(steps, steps.length - 1);

    expect([valueOf(vars, "byte"), valueOf(vars, "bit"), valueOf(vars, "feedback")]).toEqual([undefined, undefined, undefined]);
  });

  it("Given the 1st xor step, When comparing with the shift step before it, Then only crc and the XOR count have changed", () => {
    expect(changed(variables(steps, at(steps, "xor")))).toEqual(["crc", "xorCount"]);
  });

  it("Given the init step, When reading the variables, Then nothing is marked as changed", () => {
    expect(changed(variables(steps, 0))).toEqual([]);
  });

  it("Given an input that is not a multiple of 8 bits, When reading the variables, Then there is no byte variable", () => {
    const short = trace(plain3, bits("101"));

    expect(variables(short, 1).map((v) => v.name)).not.toContain("byte");
  });
});
