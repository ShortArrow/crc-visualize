import type { CrcParams, Step, StepKind } from "../domain/trace";

/**
 * 擬似コード 1 行分の表示状態。
 * active: 現在のステップが実行中の行。note: 行末に添える評価結果。skipped: 分岐で実行されない行。
 */
export type CodeLine = Readonly<{ text: string; active: boolean; note?: string; skipped: boolean }>;

type Template = Readonly<{ text: string; runs?: StepKind; role?: "if" | "ifBody" }>;

const hex = (n: number) => `0x${n.toString(16).toUpperCase()}`;

function template(p: CrcParams): Template[] {
  const mask = 2 ** p.width - 1;
  const indent = p.refin ? "    " : "";
  const clock: Template[] = [
    { text: `${indent}    fb  = ((crc >> ${p.width - 1}) & 1) ^ b;`, runs: "feedback" },
    { text: `${indent}    crc = (crc << 1) & ${hex(mask)};`, runs: "shift" },
    { text: `${indent}    if (fb == 1) {`, role: "if" },
    { text: `${indent}        crc ^= ${hex(p.poly)};`, runs: "xor", role: "ifBody" },
    { text: `${indent}    }` },
  ];
  const loop: Template[] = p.refin
    ? [
        { text: "for (byte of input) {" },
        { text: "    byte = reflect(byte, 8);", runs: "reflectIn" },
        { text: "    for (b of bitsMsbFirst(byte)) {" },
        ...clock,
        { text: "    }" },
        { text: "}" },
      ]
    : [{ text: "for (b of inputBits) {" }, ...clock, { text: "}" }];
  return [
    { text: `crc = ${hex(p.init)};`, runs: "init" },
    ...loop,
    ...(p.refout ? [{ text: `crc = reflect(crc, ${p.width});`, runs: "reflectOut" } as const] : []),
    ...(p.xorout !== 0 ? [{ text: `crc ^= ${hex(p.xorout)};`, runs: "xorOut" } as const] : []),
    { text: "return crc;", runs: "done" },
  ];
}

/** 分岐 if (fb == 1) の評価結果。shift ステップでのみ決まる。 */
const branchTaken = (step: Step): boolean | undefined => (step.kind === "shift" ? step.fb === 1 : undefined);

/** params の擬似コードを、step の実行位置と評価結果つきで返す。 */
export function codeLines(params: CrcParams, step: Step): CodeLine[] {
  const taken = branchTaken(step);
  return template(params).map(({ text, runs, role }) => {
    const active = runs === step.kind;
    const note =
      active && step.kind === "feedback"
        ? `fb = ${step.msb} ^ ${step.inBit} = ${step.fb}`
        : role === "if" && taken !== undefined
          ? String(taken)
          : undefined;
    return { text, active, skipped: role === "ifBody" && taken === false, ...(note === undefined ? {} : { note }) };
  });
}
