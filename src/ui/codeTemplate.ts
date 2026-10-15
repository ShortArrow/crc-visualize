import type { CrcParams, ParamName, StepKind } from "../domain/trace";

/** A parameter in the code. label is its name in the code (it can differ from param, as with mask derived from width). */
export type ParamChip = Readonly<{ param: ParamName; label: string; value: string }>;

export type CodePart = string | ParamChip;

/** Template for one line of code. runs are the kinds of step this line executes; role is its role in the feedback branch. */
export type Template = Readonly<{
  parts: readonly CodePart[];
  runs?: StepKind;
  role?: "if" | "ifBody";
}>;

/** How a chip's value is written. hex is a hexadecimal integer; bool is a boolean literal. */
export type Literals = Readonly<{ hex: (n: number) => string; bool: (b: boolean) => string }>;

/** A parameter chip placed in the code. mask is a value derived from width and is treated as a width chip. */
export type Chips = Readonly<Record<"width" | "mask" | "poly" | "init" | "refin" | "refout" | "xorout", ParamChip>>;

/** One language the code is written in. label is the name shown in the selector, comment is the line-comment marker, and lit is how chip values are written. */
export type LangDef = Readonly<{
  label: string;
  comment: string;
  lit: Literals;
  template: (c: Chips, p: CrcParams) => Template[];
}>;

const upperHex = (n: number) => n.toString(16).toUpperCase();

/** Literals shared by many languages (0x1021, true/false). */
export const C_LIKE: Literals = { hex: (n) => `0x${upperHex(n)}`, bool: String };

/** Literals for languages whose booleans are capitalized (True/False). */
export const CAPITAL_BOOL: Literals = { ...C_LIKE, bool: (b) => (b ? "True" : "False") };

/** Uppercase hexadecimal with a prefix and a suffix attached. */
export const hexWith =
  (prefix: string, suffix = "") =>
  (n: number) =>
    `${prefix}${upperHex(n)}${suffix}`;

/** Turns each parameter of params into a chip holding its value written as lit. */
export function chips(p: CrcParams, lit: Literals): Chips {
  const chip = (param: ParamName, value: string, label: string = param): ParamChip => ({ param, label, value });
  return {
    width: chip("width", String(p.width)),
    mask: chip("width", lit.hex(2 ** p.width - 1), "mask"),
    poly: chip("poly", lit.hex(p.poly)),
    init: chip("init", lit.hex(p.init)),
    refin: chip("refin", lit.bool(p.refin)),
    refout: chip("refout", lit.bool(p.refout)),
    xorout: chip("xorout", lit.hex(p.xorout)),
  };
}

type Parts = (c: Chips) => readonly CodePart[];

/** Start of a loop. open is at the outer indentation, and bind (such as the line extracting a bit from the loop variable) is written one level deeper. */
export type Opener = Readonly<{ open: readonly string[]; bind?: readonly string[] }>;

/**
 * How an imperative language is written. Each item is one line and corresponds to the same line of the pseudocode.
 * endIf and end are the lines closing the branch and the loop; languages that close blocks by indentation omit them.
 */
export type Imperative = Readonly<{
  label: string;
  comment: string;
  lit: Literals;
  init: Parts;
  reflectIn: Parts;
  forBytes: Opener;
  forBitsOfByte: Opener;
  forBits: Opener;
  feedback: Parts;
  shift: Parts;
  ifFeedback: string;
  xor: Parts;
  endIf?: string;
  end?: string;
  reflectOut: Parts;
  xorOut: Parts;
  ret: string;
}>;

const STEP = "    ";

const indented = (pad: string, parts: readonly CodePart[]): CodePart[] => {
  const [head, ...rest] = parts;
  return typeof head === "string" ? [pad + head, ...rest] : [pad, ...parts];
};

/**
 * Template for imperative languages. If refin is true, a double loop reflects the input byte by byte and then splits it into bits;
 * if false, a single loop processes the input bits.
 */
export function imperative(s: Imperative): LangDef {
  const template = (c: Chips, p: CrcParams): Template[] => {
    const line = (pad: string, parts: readonly CodePart[], extra: Omit<Template, "parts"> = {}): Template => ({
      parts: indented(pad, parts),
      ...extra,
    });
    const open = (o: Opener, pad: string) => [
      ...o.open.map((t) => line(pad, [t])),
      ...(o.bind ?? []).map((t) => line(pad + STEP, [t])),
    ];
    const close = (closer: string | undefined, pad: string) => (closer === undefined ? [] : [line(pad, [closer])]);
    const clock = (pad: string): Template[] => [
      line(pad, s.feedback(c), { runs: "feedback" }),
      line(pad, s.shift(c), { runs: "shift" }),
      line(pad, [s.ifFeedback], { role: "if" }),
      line(pad + STEP, s.xor(c), { runs: "xor", role: "ifBody" }),
      ...close(s.endIf, pad),
    ];
    const loop = p.refin
      ? [
          ...open(s.forBytes, ""),
          line(STEP, s.reflectIn(c), { runs: "reflectIn" }),
          ...open(s.forBitsOfByte, STEP),
          ...clock(STEP + STEP),
          ...close(s.end, STEP),
          ...close(s.end, ""),
        ]
      : [line("", s.reflectIn(c), { runs: "reflectIn" }), ...open(s.forBits, ""), ...clock(STEP), ...close(s.end, "")];
    return [
      line("", s.init(c), { runs: "init" }),
      ...loop,
      line("", s.reflectOut(c), { runs: "reflectOut" }),
      line("", s.xorOut(c), { runs: "xorOut" }),
      line("", [s.ret], { runs: "done" }),
    ];
  };
  return { label: s.label, comment: s.comment, lit: s.lit, template };
}
