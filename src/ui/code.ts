import type { CrcParams, ParamName, Step, StepKind } from "../domain/trace";

/** 擬似コード中のパラメータ。label はコード上の名前（width から作る mask のように param と異なることがある）。 */
export type ParamChip = Readonly<{ param: ParamName; label: string; value: string }>;

export type CodePart = string | ParamChip;

/**
 * 擬似コード 1 行分の表示状態。
 * text: チップを label に置き換えた行の文字列。active: 現在のステップが実行中の行。
 * note: 行末に添える注記。skipped: 分岐で実行されない行。disabled: パラメータが無効で実行されない行。
 */
export type CodeLine = Readonly<{
  parts: readonly CodePart[];
  text: string;
  active: boolean;
  skipped: boolean;
  disabled: boolean;
  note?: string;
}>;

type Template = Readonly<{
  parts: readonly CodePart[];
  runs?: StepKind;
  role?: "if" | "ifBody";
  disabledNote?: string;
}>;

const hex = (n: number) => `0x${n.toString(16).toUpperCase()}`;

function chips(p: CrcParams) {
  const chip = (param: ParamName, value: string, label: string = param): ParamChip => ({ param, label, value });
  return {
    width: chip("width", String(p.width)),
    mask: chip("width", hex(2 ** p.width - 1), "mask"),
    poly: chip("poly", hex(p.poly)),
    init: chip("init", hex(p.init)),
    refin: chip("refin", String(p.refin)),
    refout: chip("refout", String(p.refout)),
    xorout: chip("xorout", hex(p.xorout)),
  };
}

function template(p: CrcParams): Template[] {
  const c = chips(p);
  const pad = p.refin ? "        " : "    ";
  const clock: Template[] = [
    { parts: [`${pad}feedback = ((crc >> (`, c.width, " - 1)) & 1) ^ bit;"], runs: "feedback" },
    { parts: [`${pad}crc = (crc << 1) & `, c.mask, ";"], runs: "shift" },
    { parts: [`${pad}if (feedback == 1) {`], role: "if" },
    { parts: [`${pad}    crc ^= `, c.poly, ";"], runs: "xor", role: "ifBody" },
    { parts: [`${pad}}`] },
  ];
  const reflectIn = (indent: string): Template => ({
    parts: [`${indent}if (`, c.refin, ") byte = reflect(byte, 8);"],
    runs: "reflectIn",
    ...(p.refin ? {} : { disabledNote: "refin が false なので実行しない" }),
  });
  const loop: Template[] = p.refin
    ? [
        { parts: ["for (byte of input) {"] },
        reflectIn("    "),
        { parts: ["    for (bit of bitsMsbFirst(byte)) {"] },
        ...clock,
        { parts: ["    }"] },
        { parts: ["}"] },
      ]
    : [reflectIn(""), { parts: ["for (bit of inputBits) {"] }, ...clock, { parts: ["}"] }];
  return [
    { parts: ["crc = ", c.init, ";"], runs: "init" },
    ...loop,
    {
      parts: ["if (", c.refout, ") crc = reflect(crc, ", c.width, ");"],
      runs: "reflectOut",
      ...(p.refout ? {} : { disabledNote: "refout が false なので実行しない" }),
    },
    {
      parts: ["crc ^= ", c.xorout, ";"],
      runs: "xorOut",
      ...(p.xorout !== 0 ? {} : { disabledNote: "xorout が 0 なので値は変わらない" }),
    },
    { parts: ["return crc;"], runs: "done" },
  ];
}

const lineText = (parts: readonly CodePart[]) => parts.map((p) => (typeof p === "string" ? p : p.label)).join("");

/** 分岐 if (feedback == 1) の評価結果。shift ステップでのみ決まる。 */
const branchTaken = (step: Step): boolean | undefined => (step.kind === "shift" ? step.fb === 1 : undefined);

/** params の擬似コードを、step の実行位置と評価結果つきで返す。 */
export function codeLines(params: CrcParams, step: Step): CodeLine[] {
  const taken = branchTaken(step);
  return template(params).map(({ parts, runs, role, disabledNote }) => {
    const active = runs === step.kind;
    const note =
      disabledNote ??
      (active && step.kind === "feedback"
        ? `msb ${step.msb} ⊕ bit ${step.inBit} = ${step.fb}`
        : role === "if" && taken !== undefined
          ? String(taken)
          : undefined);
    return {
      parts,
      text: lineText(parts),
      active,
      skipped: role === "ifBody" && taken === false,
      disabled: disabledNote !== undefined,
      ...(note === undefined ? {} : { note }),
    };
  });
}
