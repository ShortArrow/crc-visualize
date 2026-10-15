import type { CrcParams } from "./trace";

export type InputMode = "bits" | "hex" | "text";

/**
 * A named CRC configuration; name is the canonical name, aliases are names common in the literature (up to 3 representative ones).
 * check is the CRC of the input "123456789" (ASCII). Names and values follow reveng's "Catalogue of parametrised CRC algorithms".
 */
export type Preset = Readonly<{
  name: string;
  aliases: readonly string[];
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
  aliases: readonly string[] = [],
): Preset => ({
  name,
  aliases,
  params: { width, poly, init, refin: reflect, refout: reflect, xorout },
  check,
  input: CHECK_INPUT,
});

export const TUTORIAL: Preset = {
  // CRC-3/GSM without its xorout (0x7); check = 0x4 ^ 0x7.
  ...preset("CRC-3/TUTORIAL", 3, 0x3, 0x0, false, 0x0, 0x3),
  input: { mode: "bits", text: "10101" },
};

export const PRESETS: readonly Preset[] = [
  TUTORIAL,
  preset("CRC-3/GSM", 3, 0x3, 0x0, false, 0x7, 0x4),
  preset("CRC-4/G-704", 4, 0x3, 0x0, true, 0x0, 0x7, ["CRC-4/ITU"]),
  preset("CRC-5/USB", 5, 0x05, 0x1f, true, 0x1f, 0x19),
  preset("CRC-7/MMC", 7, 0x09, 0x00, false, 0x00, 0x75, ["CRC-7"]),
  preset("CRC-8/SMBUS", 8, 0x07, 0x00, false, 0x00, 0xf4, ["CRC-8"]),
  preset("CRC-8/MAXIM-DOW", 8, 0x31, 0x00, true, 0x00, 0xa1, ["CRC-8/MAXIM", "DOW-CRC"]),
  preset("CRC-8/AUTOSAR", 8, 0x2f, 0xff, false, 0xff, 0xdf),
  preset("CRC-8/SAE-J1850", 8, 0x1d, 0xff, false, 0xff, 0x4b),
  preset("CRC-16/ARC", 16, 0x8005, 0x0000, true, 0x0000, 0xbb3d, ["CRC-16", "CRC-16/LHA", "CRC-IBM"]),
  preset("CRC-16/MODBUS", 16, 0x8005, 0xffff, true, 0x0000, 0x4b37, ["MODBUS"]),
  preset("CRC-16/USB", 16, 0x8005, 0xffff, true, 0xffff, 0xb4c8),
  preset("CRC-16/IBM-3740", 16, 0x1021, 0xffff, false, 0x0000, 0x29b1, ["CRC-16/CCITT-FALSE", "CRC-16/AUTOSAR"]),
  preset("CRC-16/XMODEM", 16, 0x1021, 0x0000, false, 0x0000, 0x31c3, ["XMODEM", "ZMODEM", "CRC-16/ACORN"]),
  preset("CRC-16/KERMIT", 16, 0x1021, 0x0000, true, 0x0000, 0x2189, ["CRC-16/CCITT", "CRC-16/CCITT-TRUE", "CRC-CCITT"]),
  preset("CRC-16/IBM-SDLC", 16, 0x1021, 0xffff, true, 0xffff, 0x906e, ["CRC-16/X-25", "CRC-16/ISO-HDLC", "CRC-B"]),
  preset("CRC-16/SPI-FUJITSU", 16, 0x1021, 0x1d0f, false, 0x0000, 0xe5cc, ["CRC-16/AUG-CCITT"]),
  preset("CRC-16/GENIBUS", 16, 0x1021, 0xffff, false, 0xffff, 0xd64e, ["CRC-16/EPC", "CRC-16/DARC", "CRC-16/I-CODE"]),
  preset("CRC-32/ISO-HDLC", 32, 0x04c11db7, 0xffffffff, true, 0xffffffff, 0xcbf43926, ["CRC-32", "PKZIP", "CRC-32/V-42"]),
  preset("CRC-32/BZIP2", 32, 0x04c11db7, 0xffffffff, false, 0xffffffff, 0xfc891918, ["CRC-32/AAL5", "B-CRC-32"]),
  preset("CRC-32/MPEG-2", 32, 0x04c11db7, 0xffffffff, false, 0x00000000, 0x0376e6e7),
  preset("CRC-32/ISCSI", 32, 0x1edc6f41, 0xffffffff, true, 0xffffffff, 0xe3069283, [
    "CRC-32C",
    "CRC-32/CASTAGNOLI",
    "CRC-32/NVME",
  ]),
];

/** Presets in the reveng catalogue, excluding the tutorial TUTORIAL. */
export const CATALOGUE: readonly Preset[] = PRESETS.filter((p) => p !== TUTORIAL);

const sameParams = (a: CrcParams, b: CrcParams) =>
  a.width === b.width &&
  a.poly === b.poly &&
  a.init === b.init &&
  a.refin === b.refin &&
  a.refout === b.refout &&
  a.xorout === b.xorout;

/** The preset whose parameters match exactly, or undefined if none. */
export const findPreset = (params: CrcParams): Preset | undefined => PRESETS.find((p) => sameParams(p.params, params));
