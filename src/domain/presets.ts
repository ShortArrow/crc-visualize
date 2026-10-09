import type { CrcParams } from "./trace";

export type InputMode = "bits" | "hex" | "text";

/**
 * 名前付きの CRC 設定。check は入力 "123456789"（ASCII）の CRC で、
 * 値は reveng の "Catalogue of parametrised CRC algorithms" による。
 */
export type Preset = Readonly<{
  name: string;
  params: CrcParams;
  check: number;
  input: Readonly<{ mode: InputMode; text: string }>;
}>;

const CHECK_INPUT = { mode: "text", text: "123456789" } as const;

const preset = (
  name: string,
  width: number,
  poly: number,
  init: number,
  reflect: boolean,
  xorout: number,
  check: number,
): Preset => ({
  name,
  params: { width, poly, init, refin: reflect, refout: reflect, xorout },
  check,
  input: CHECK_INPUT,
});

export const TUTORIAL: Preset = {
  // CRC-3/GSM から xorout (0x7) を外したもの。check = 0x4 ^ 0x7。
  ...preset("CRC-3/TUTORIAL", 3, 0x3, 0x0, false, 0x0, 0x3),
  input: { mode: "bits", text: "10101" },
};

export const PRESETS: readonly Preset[] = [
  TUTORIAL,
  preset("CRC-3/GSM", 3, 0x3, 0x0, false, 0x7, 0x4),
  preset("CRC-4/G-704", 4, 0x3, 0x0, true, 0x0, 0x7),
  preset("CRC-5/USB", 5, 0x05, 0x1f, true, 0x1f, 0x19),
  preset("CRC-7/MMC", 7, 0x09, 0x00, false, 0x00, 0x75),
  preset("CRC-8/SMBUS", 8, 0x07, 0x00, false, 0x00, 0xf4),
  preset("CRC-8/MAXIM-DOW", 8, 0x31, 0x00, true, 0x00, 0xa1),
  preset("CRC-16/ARC", 16, 0x8005, 0x0000, true, 0x0000, 0xbb3d),
  preset("CRC-16/IBM-3740", 16, 0x1021, 0xffff, false, 0x0000, 0x29b1),
  preset("CRC-16/XMODEM", 16, 0x1021, 0x0000, false, 0x0000, 0x31c3),
  preset("CRC-16/KERMIT", 16, 0x1021, 0x0000, true, 0x0000, 0x2189),
  preset("CRC-32/ISO-HDLC", 32, 0x04c11db7, 0xffffffff, true, 0xffffffff, 0xcbf43926),
  preset("CRC-32/BZIP2", 32, 0x04c11db7, 0xffffffff, false, 0xffffffff, 0xfc891918),
];

const sameParams = (a: CrcParams, b: CrcParams) =>
  a.width === b.width &&
  a.poly === b.poly &&
  a.init === b.init &&
  a.refin === b.refin &&
  a.refout === b.refout &&
  a.xorout === b.xorout;

/** パラメータが完全に一致するプリセット。無ければ undefined。 */
export const findPreset = (params: CrcParams): Preset | undefined => PRESETS.find((p) => sameParams(p.params, params));
