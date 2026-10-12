import { reflectValue, type CrcParams, type ParamName } from "../domain/trace";

/**
 * パラメータの説明。title は画面での日本語名、aliases は資料で使われる別の呼び名
 * （英語の呼び名もそのまま載せる）。
 */
export type ParamInfo = Readonly<{ title: string; summary: string; aliases: readonly string[] }>;

export const PARAM_INFO: Record<ParamName, ParamInfo> = {
  width: {
    title: "幅",
    summary: "CRC のビット数。レジスタの個数と同じで、生成多項式の次数でもある。",
    aliases: ["CRC のビット数", "多項式の次数", "width"],
  },
  poly: {
    title: "生成多項式",
    summary: "最上位の x^width の項を除いた係数を、x^(width-1) から x^0 の順に並べた値。ここでは反転していない通常表記で書く。",
    aliases: ["多項式", "通常表記（normal）", "polynomial"],
  },
  init: {
    title: "初期値",
    summary: "最初の入力ビットを投入する前に、レジスタへ入れておく値。",
    aliases: ["初期 CRC 値", "initial value"],
  },
  refin: {
    title: "入力の反転",
    summary: "true なら、入力の各バイトを LSB から投入する。バイト内のビット順を反転してから MSB から投入するのと同じ。",
    aliases: ["入力の反射", "LSB ファースト（true のとき）", "reflected input"],
  },
  refout: {
    title: "出力の反転",
    summary: "true なら、最終 XOR の前にレジスタ全体のビット順を反転する。",
    aliases: ["出力の反射", "reflected output"],
  },
  xorout: {
    title: "最終 XOR 値",
    summary: "最後に CRC と XOR する値。0 なら値は変わらない。",
    aliases: ["出力 XOR", "final XOR", "XorOut"],
  },
};

/** パラメータ以外の設定項目。項目名は英語で示し、日本語名と説明は説明欄に出す。 */
export type FieldName = "preset" | "inputMode" | "input";

/** 説明欄で説明する項目。 */
export type HelpTopic = ParamName | FieldName;

export const FIELD_INFO: Record<FieldName, Readonly<{ label: string; title: string; summary: string }>> = {
  preset: {
    label: "preset",
    title: "プリセット",
    summary: "名前の付いた CRC の設定。選ぶと 6 つのパラメータと、検査値を確かめる入力 123456789 を入れる。",
  },
  inputMode: {
    label: "input mode",
    title: "入力形式",
    summary: "入力の書き方。bits は 0 と 1 の並び、hex は 16 進のバイト列、text は文字列を UTF-8 のバイト列にしたもの。",
  },
  input: {
    label: "input",
    title: "入力",
    summary: "CRC を計算するデータ。入力形式に従って書き、先頭のビットから順にレジスタへ投入する。",
  },
};

const hex = (n: number) => `0x${n.toString(16).toUpperCase()}`;

function shiftDirection({ refin, refout }: CrcParams): string {
  if (refin && refout) return "refin と refout がともに true なので、右送り（LSB から処理する）の実装で計算できる";
  if (!refin && !refout) return "refin と refout がともに false なので、左送り（MSB から処理する）の実装で計算できる";
  return "refin と refout が異なるので、右送りと左送りのどちらの実装でも、どこかでビットの反転が別に要る";
}

/** 今の設定値に応じて、param の説明に添える注記。 */
export function paramNotes(param: ParamName, params: CrcParams): string[] {
  switch (param) {
    case "poly":
      return [`反転表記（右送りの実装で書かれる値）: ${hex(reflectValue(params.poly, params.width))}`];
    case "refin":
    case "refout":
      return [shiftDirection(params)];
    default:
      return [];
  }
}
