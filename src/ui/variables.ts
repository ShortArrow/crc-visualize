import { registerValue, type Bit, type Step } from "../domain/trace";
import { toBinary, toHex } from "./format";

/**
 * One variable at a step. crc, byte, bit and feedback are the code's variables; bitsRead and xorCount are counters.
 * value is undefined while the variable has none (byte, bit and feedback outside their loop). changed marks a value that differs
 * from the previous step.
 */
export type Variable = Readonly<{
  name: "crc" | "byte" | "bit" | "feedback" | "bitsRead" | "xorCount";
  value?: string;
  changed: boolean;
}>;

type Values = Readonly<Partial<Record<Variable["name"], string | undefined>>>;

/** Position of the input bit the step's clock reads, or of the byte reflectIn reflects; undefined outside the loop. */
function readingAt(step: Step): number | undefined {
  switch (step.kind) {
    case "reflectIn":
    case "feedback":
      return step.cursor;
    case "shift":
    case "xor":
      return step.cursor - 1;
    default:
      return undefined;
  }
}

const byteText = (stream: readonly Bit[], k: number) =>
  `0x${registerValue(stream.slice(k * 8, k * 8 + 8).toReversed())
    .toString(16)
    .toUpperCase()
    .padStart(2, "0")} [${k}]`;

/** Values of the variables at steps[index]; byte only when the input is whole bytes. */
function valuesAt(steps: readonly Step[], index: number): Values {
  const step = steps[index]!;
  const p = readingAt(step);
  const wholeBytes = step.stream.length > 0 && step.stream.length % 8 === 0;
  const clock = p !== undefined && step.kind !== "reflectIn";
  const fb = step.kind === "feedback" || step.kind === "shift" ? step.fb : step.kind === "xor" ? 1 : undefined;
  return {
    crc: `0b${toBinary(step.reg)} ${toHex(step.reg)}`,
    ...(wholeBytes ? { byte: p === undefined ? undefined : byteText(step.stream, Math.floor(p / 8)) } : {}),
    bit: clock ? String(step.stream[p]) : undefined,
    feedback: fb === undefined ? undefined : String(fb),
    bitsRead: `${step.cursor} / ${step.stream.length}`,
    xorCount: String(steps.slice(0, index + 1).filter((s) => s.kind === "xor").length),
  };
}

const ORDER: readonly Variable["name"][] = ["crc", "byte", "bit", "feedback", "bitsRead", "xorCount"];

/** The variables at steps[index], in display order; byte is left out when the input is not whole bytes. */
export function variables(steps: readonly Step[], index: number): Variable[] {
  const now = valuesAt(steps, index);
  const before = index > 0 ? valuesAt(steps, index - 1) : now;
  return ORDER.filter((name) => name in now).map((name) => ({
    name,
    ...(now[name] === undefined ? {} : { value: now[name] }),
    changed: now[name] !== before[name],
  }));
}
