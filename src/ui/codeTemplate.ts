import type { CrcParams, ParamName, StepKind } from "../domain/trace";

/** コード中のパラメータ。label はコード上の名前（width から作る mask のように param と異なることがある）。 */
export type ParamChip = Readonly<{ param: ParamName; label: string; value: string }>;

export type CodePart = string | ParamChip;

/** コード 1 行の雛形。runs はこの行が実行するステップの種類、role は feedback の分岐での役目。 */
export type Template = Readonly<{
  parts: readonly CodePart[];
  runs?: StepKind;
  role?: "if" | "ifBody";
}>;

/** チップの値の書き方。hex は 16 進の整数、bool は真偽値のリテラル。 */
export type Literals = Readonly<{ hex: (n: number) => string; bool: (b: boolean) => string }>;

/** コードに置くパラメータのチップ。mask は width から作る値で、width のチップとして扱う。 */
export type Chips = Readonly<Record<"width" | "mask" | "poly" | "init" | "refin" | "refout" | "xorout", ParamChip>>;

/** コードを書く 1 つの言語。label は選択肢に出す名前、comment は行コメントの記号、lit はチップの値の書き方。 */
export type LangDef = Readonly<{
  label: string;
  comment: string;
  lit: Literals;
  template: (c: Chips, p: CrcParams) => Template[];
}>;

const upperHex = (n: number) => n.toString(16).toUpperCase();

/** 多くの言語に共通のリテラル（0x1021、true/false）。 */
export const C_LIKE: Literals = { hex: (n) => `0x${upperHex(n)}`, bool: String };

/** 先頭を大文字にした真偽値（True/False）を使う言語のリテラル。 */
export const CAPITAL_BOOL: Literals = { ...C_LIKE, bool: (b) => (b ? "True" : "False") };

/** 接頭辞 prefix・接尾辞 suffix を付けた大文字の 16 進。 */
export const hexWith =
  (prefix: string, suffix = "") =>
  (n: number) =>
    `${prefix}${upperHex(n)}${suffix}`;

/** params の各パラメータを、lit の書き方で値を持つチップにする。 */
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

/** ループの始まり。open は外側の字下げで、bind（ループ変数からビットを取り出す行など）は 1 段深く書く。 */
export type Opener = Readonly<{ open: readonly string[]; bind?: readonly string[] }>;

/**
 * 命令型の言語の書き方。各項目は 1 行分で、擬似コードの同じ行にあたる。
 * endIf・end は分岐とループを閉じる行で、字下げで閉じる言語では省く。
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
 * 命令型の言語の雛形。refin が真なら入力をバイトごとに反転してからビットに分ける 2 重ループ、
 * 偽なら入力ビットを 1 重ループで処理する。
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
