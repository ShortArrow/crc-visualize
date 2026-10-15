import type { CrcParams } from "./trace";

export type InputMode = "bits" | "hex" | "text";

/**
 * A named CRC configuration; name is the canonical name, aliases are all of its aliases in the catalogue, the ones most used in the literature first.
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
  refin: boolean,
  refout: boolean,
  xorout: number,
  check: number,
  aliases: readonly string[] = [],
): Preset => ({
  name,
  aliases,
  params: { width, poly, init, refin, refout, xorout },
  check,
  input: CHECK_INPUT,
});

export const TUTORIAL: Preset = {
  // CRC-3/GSM without its xorout (0x7); check = 0x4 ^ 0x7.
  ...preset("CRC-3/TUTORIAL", 3, 0x3, 0x0, false, false, 0x0, 0x3),
  input: { mode: "bits", text: "10101" },
};

export const PRESETS: readonly Preset[] = [
  TUTORIAL,
  preset("CRC-3/GSM", 3, 0x3, 0x0, false, false, 0x7, 0x4),
  preset("CRC-3/ROHC", 3, 0x3, 0x7, true, true, 0x0, 0x6),
  preset("CRC-4/G-704", 4, 0x3, 0x0, true, true, 0x0, 0x7, ["CRC-4/ITU"]),
  preset("CRC-4/INTERLAKEN", 4, 0x3, 0xf, false, false, 0xf, 0xb),
  preset("CRC-5/EPC-C1G2", 5, 0x9, 0x9, false, false, 0x0, 0x0, ["CRC-5/EPC"]),
  preset("CRC-5/G-704", 5, 0x15, 0x0, true, true, 0x0, 0x7, ["CRC-5/ITU"]),
  preset("CRC-5/USB", 5, 0x5, 0x1f, true, true, 0x1f, 0x19),
  preset("CRC-6/CDMA2000-A", 6, 0x27, 0x3f, false, false, 0x0, 0xd),
  preset("CRC-6/CDMA2000-B", 6, 0x7, 0x3f, false, false, 0x0, 0x3b),
  preset("CRC-6/DARC", 6, 0x19, 0x0, true, true, 0x0, 0x26),
  preset("CRC-6/G-704", 6, 0x3, 0x0, true, true, 0x0, 0x6, ["CRC-6/ITU"]),
  preset("CRC-6/GSM", 6, 0x2f, 0x0, false, false, 0x3f, 0x13),
  preset("CRC-7/MMC", 7, 0x9, 0x0, false, false, 0x0, 0x75, ["CRC-7"]),
  preset("CRC-7/ROHC", 7, 0x4f, 0x7f, true, true, 0x0, 0x53),
  preset("CRC-7/UMTS", 7, 0x45, 0x0, false, false, 0x0, 0x61),
  preset("CRC-8/AUTOSAR", 8, 0x2f, 0xff, false, false, 0xff, 0xdf),
  preset("CRC-8/BLUETOOTH", 8, 0xa7, 0x0, true, true, 0x0, 0x26),
  preset("CRC-8/CDMA2000", 8, 0x9b, 0xff, false, false, 0x0, 0xda),
  preset("CRC-8/DARC", 8, 0x39, 0x0, true, true, 0x0, 0x15),
  preset("CRC-8/DVB-S2", 8, 0xd5, 0x0, false, false, 0x0, 0xbc),
  preset("CRC-8/GSM-A", 8, 0x1d, 0x0, false, false, 0x0, 0x37),
  preset("CRC-8/GSM-B", 8, 0x49, 0x0, false, false, 0xff, 0x94),
  preset("CRC-8/HITAG", 8, 0x1d, 0xff, false, false, 0x0, 0xb4),
  preset("CRC-8/I-432-1", 8, 0x7, 0x0, false, false, 0x55, 0xa1, ["CRC-8/ITU"]),
  preset("CRC-8/I-CODE", 8, 0x1d, 0xfd, false, false, 0x0, 0x7e),
  preset("CRC-8/LTE", 8, 0x9b, 0x0, false, false, 0x0, 0xea),
  preset("CRC-8/MAXIM-DOW", 8, 0x31, 0x0, true, true, 0x0, 0xa1, ["CRC-8/MAXIM", "DOW-CRC"]),
  preset("CRC-8/MIFARE-MAD", 8, 0x1d, 0xc7, false, false, 0x0, 0x99),
  preset("CRC-8/NRSC-5", 8, 0x31, 0xff, false, false, 0x0, 0xf7),
  preset("CRC-8/OPENSAFETY", 8, 0x2f, 0x0, false, false, 0x0, 0x3e),
  preset("CRC-8/ROHC", 8, 0x7, 0xff, true, true, 0x0, 0xd0),
  preset("CRC-8/SAE-J1850", 8, 0x1d, 0xff, false, false, 0xff, 0x4b),
  preset("CRC-8/SMBUS", 8, 0x7, 0x0, false, false, 0x0, 0xf4, ["CRC-8"]),
  preset("CRC-8/TECH-3250", 8, 0x1d, 0xff, true, true, 0x0, 0x97, ["CRC-8/AES", "CRC-8/EBU"]),
  preset("CRC-8/WCDMA", 8, 0x9b, 0x0, true, true, 0x0, 0x25),
  preset("CRC-10/ATM", 10, 0x233, 0x0, false, false, 0x0, 0x199, ["CRC-10", "CRC-10/I-610"]),
  preset("CRC-10/CDMA2000", 10, 0x3d9, 0x3ff, false, false, 0x0, 0x233),
  preset("CRC-10/GSM", 10, 0x175, 0x0, false, false, 0x3ff, 0x12a),
  preset("CRC-11/FLEXRAY", 11, 0x385, 0x1a, false, false, 0x0, 0x5a3, ["CRC-11"]),
  preset("CRC-11/UMTS", 11, 0x307, 0x0, false, false, 0x0, 0x61),
  preset("CRC-12/CDMA2000", 12, 0xf13, 0xfff, false, false, 0x0, 0xd4d),
  preset("CRC-12/DECT", 12, 0x80f, 0x0, false, false, 0x0, 0xf5b, ["X-CRC-12"]),
  preset("CRC-12/GSM", 12, 0xd31, 0x0, false, false, 0xfff, 0xb34),
  preset("CRC-12/UMTS", 12, 0x80f, 0x0, false, true, 0x0, 0xdaf, ["CRC-12/3GPP"]),
  preset("CRC-13/BBC", 13, 0x1cf5, 0x0, false, false, 0x0, 0x4fa),
  preset("CRC-14/DARC", 14, 0x805, 0x0, true, true, 0x0, 0x82d),
  preset("CRC-14/GSM", 14, 0x202d, 0x0, false, false, 0x3fff, 0x30ae),
  preset("CRC-15/CAN", 15, 0x4599, 0x0, false, false, 0x0, 0x59e, ["CRC-15"]),
  preset("CRC-15/MPT1327", 15, 0x6815, 0x0, false, false, 0x1, 0x2566),
  preset("CRC-16/ARC", 16, 0x8005, 0x0, true, true, 0x0, 0xbb3d, ["CRC-16", "CRC-16/LHA", "CRC-IBM", "ARC"]),
  preset("CRC-16/CDMA2000", 16, 0xc867, 0xffff, false, false, 0x0, 0x4c06),
  preset("CRC-16/CMS", 16, 0x8005, 0xffff, false, false, 0x0, 0xaee7),
  preset("CRC-16/DDS-110", 16, 0x8005, 0x800d, false, false, 0x0, 0x9ecf),
  preset("CRC-16/DECT-R", 16, 0x589, 0x0, false, false, 0x1, 0x7e, ["R-CRC-16"]),
  preset("CRC-16/DECT-X", 16, 0x589, 0x0, false, false, 0x0, 0x7f, ["X-CRC-16"]),
  preset("CRC-16/DNP", 16, 0x3d65, 0x0, true, true, 0xffff, 0xea82),
  preset("CRC-16/EN-13757", 16, 0x3d65, 0x0, false, false, 0xffff, 0xc2b7),
  preset("CRC-16/GENIBUS", 16, 0x1021, 0xffff, false, false, 0xffff, 0xd64e, [
    "CRC-16/EPC",
    "CRC-16/DARC",
    "CRC-16/I-CODE",
    "CRC-16/EPC-C1G2",
  ]),
  preset("CRC-16/GSM", 16, 0x1021, 0x0, false, false, 0xffff, 0xce3c),
  preset("CRC-16/IBM-3740", 16, 0x1021, 0xffff, false, false, 0x0, 0x29b1, ["CRC-16/CCITT-FALSE", "CRC-16/AUTOSAR"]),
  preset("CRC-16/IBM-SDLC", 16, 0x1021, 0xffff, true, true, 0xffff, 0x906e, [
    "CRC-16/X-25",
    "CRC-16/ISO-HDLC",
    "CRC-B",
    "CRC-16/ISO-IEC-14443-3-B",
    "X-25",
  ]),
  preset("CRC-16/ISO-IEC-14443-3-A", 16, 0x1021, 0xc6c6, true, true, 0x0, 0xbf05, ["CRC-A"]),
  preset("CRC-16/KERMIT", 16, 0x1021, 0x0, true, true, 0x0, 0x2189, [
    "CRC-16/CCITT",
    "CRC-16/CCITT-TRUE",
    "CRC-CCITT",
    "CRC-16/BLUETOOTH",
    "CRC-16/V-41-LSB",
    "KERMIT",
  ]),
  preset("CRC-16/LJ1200", 16, 0x6f63, 0x0, false, false, 0x0, 0xbdf4),
  preset("CRC-16/M17", 16, 0x5935, 0xffff, false, false, 0x0, 0x772b),
  preset("CRC-16/MAXIM-DOW", 16, 0x8005, 0x0, true, true, 0xffff, 0x44c2, ["CRC-16/MAXIM"]),
  preset("CRC-16/MCRF4XX", 16, 0x1021, 0xffff, true, true, 0x0, 0x6f91),
  preset("CRC-16/MODBUS", 16, 0x8005, 0xffff, true, true, 0x0, 0x4b37, ["MODBUS"]),
  preset("CRC-16/NRSC-5", 16, 0x80b, 0xffff, true, true, 0x0, 0xa066),
  preset("CRC-16/OPENSAFETY-A", 16, 0x5935, 0x0, false, false, 0x0, 0x5d38),
  preset("CRC-16/OPENSAFETY-B", 16, 0x755b, 0x0, false, false, 0x0, 0x20fe),
  preset("CRC-16/PROFIBUS", 16, 0x1dcf, 0xffff, false, false, 0xffff, 0xa819, ["CRC-16/IEC-61158-2"]),
  preset("CRC-16/RIELLO", 16, 0x1021, 0xb2aa, true, true, 0x0, 0x63d0),
  preset("CRC-16/SPI-FUJITSU", 16, 0x1021, 0x1d0f, false, false, 0x0, 0xe5cc, ["CRC-16/AUG-CCITT"]),
  preset("CRC-16/T10-DIF", 16, 0x8bb7, 0x0, false, false, 0x0, 0xd0db),
  preset("CRC-16/TELEDISK", 16, 0xa097, 0x0, false, false, 0x0, 0xfb3),
  preset("CRC-16/TMS37157", 16, 0x1021, 0x89ec, true, true, 0x0, 0x26b1),
  preset("CRC-16/UMTS", 16, 0x8005, 0x0, false, false, 0x0, 0xfee8, ["CRC-16/BUYPASS", "CRC-16/VERIFONE"]),
  preset("CRC-16/USB", 16, 0x8005, 0xffff, true, true, 0xffff, 0xb4c8),
  preset("CRC-16/XMODEM", 16, 0x1021, 0x0, false, false, 0x0, 0x31c3, [
    "XMODEM",
    "ZMODEM",
    "CRC-16/ACORN",
    "CRC-16/LTE",
    "CRC-16/V-41-MSB",
  ]),
  preset("CRC-17/CAN-FD", 17, 0x1685b, 0x0, false, false, 0x0, 0x4f03),
  preset("CRC-21/CAN-FD", 21, 0x102899, 0x0, false, false, 0x0, 0xed841),
  preset("CRC-24/BLE", 24, 0x65b, 0x555555, true, true, 0x0, 0xc25a56),
  preset("CRC-24/FLEXRAY-A", 24, 0x5d6dcb, 0xfedcba, false, false, 0x0, 0x7979bd),
  preset("CRC-24/FLEXRAY-B", 24, 0x5d6dcb, 0xabcdef, false, false, 0x0, 0x1f23b8),
  preset("CRC-24/INTERLAKEN", 24, 0x328b63, 0xffffff, false, false, 0xffffff, 0xb4f3e6),
  preset("CRC-24/LTE-A", 24, 0x864cfb, 0x0, false, false, 0x0, 0xcde703),
  preset("CRC-24/LTE-B", 24, 0x800063, 0x0, false, false, 0x0, 0x23ef52),
  preset("CRC-24/OPENPGP", 24, 0x864cfb, 0xb704ce, false, false, 0x0, 0x21cf02, ["CRC-24"]),
  preset("CRC-24/OS-9", 24, 0x800063, 0xffffff, false, false, 0xffffff, 0x200fa5),
  preset("CRC-30/CDMA", 30, 0x2030b9c7, 0x3fffffff, false, false, 0x3fffffff, 0x4c34abf),
  preset("CRC-31/PHILIPS", 31, 0x4c11db7, 0x7fffffff, false, false, 0x7fffffff, 0xce9e46c),
  preset("CRC-32/AIXM", 32, 0x814141ab, 0x0, false, false, 0x0, 0x3010bf7f, ["CRC-32Q"]),
  preset("CRC-32/AUTOSAR", 32, 0xf4acfb13, 0xffffffff, true, true, 0xffffffff, 0x1697d06a),
  preset("CRC-32/BASE91-D", 32, 0xa833982b, 0xffffffff, true, true, 0xffffffff, 0x87315576, ["CRC-32D"]),
  preset("CRC-32/BZIP2", 32, 0x4c11db7, 0xffffffff, false, false, 0xffffffff, 0xfc891918, [
    "CRC-32/AAL5",
    "B-CRC-32",
    "CRC-32/DECT-B",
  ]),
  preset("CRC-32/CD-ROM-EDC", 32, 0x8001801b, 0x0, true, true, 0x0, 0x6ec2edc4),
  preset("CRC-32/CKSUM", 32, 0x4c11db7, 0x0, false, false, 0xffffffff, 0x765e7680, ["CKSUM", "CRC-32/POSIX"]),
  preset("CRC-32/ISCSI", 32, 0x1edc6f41, 0xffffffff, true, true, 0xffffffff, 0xe3069283, [
    "CRC-32C",
    "CRC-32/CASTAGNOLI",
    "CRC-32/NVME",
    "CRC-32/BASE91-C",
    "CRC-32/INTERLAKEN",
  ]),
  preset("CRC-32/ISO-HDLC", 32, 0x4c11db7, 0xffffffff, true, true, 0xffffffff, 0xcbf43926, [
    "CRC-32",
    "PKZIP",
    "CRC-32/V-42",
    "CRC-32/ADCCP",
    "CRC-32/XZ",
  ]),
  preset("CRC-32/JAMCRC", 32, 0x4c11db7, 0xffffffff, true, true, 0x0, 0x340bc6d9, ["JAMCRC"]),
  preset("CRC-32/MEF", 32, 0x741b8cd7, 0xffffffff, true, true, 0x0, 0xd2c22f51),
  preset("CRC-32/MPEG-2", 32, 0x4c11db7, 0xffffffff, false, false, 0x0, 0x376e6e7),
  preset("CRC-32/XFER", 32, 0xaf, 0x0, false, false, 0x0, 0xbd0be338, ["XFER"]),
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
