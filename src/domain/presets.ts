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
  check: bigint;
  input: Readonly<{ mode: InputMode; text: string }>;
}>;

const CHECK_INPUT = { mode: "text", text: "123456789" } as const;

const preset = (
  name: string,
  width: number,
  poly: bigint,
  init: bigint,
  refin: boolean,
  refout: boolean,
  xorout: bigint,
  check: bigint,
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
  ...preset("CRC-3/TUTORIAL", 3, 0x3n, 0x0n, false, false, 0x0n, 0x3n),
  input: { mode: "bits", text: "10101" },
};

export const PRESETS: readonly Preset[] = [
  TUTORIAL,
  preset("CRC-3/GSM", 3, 0x3n, 0x0n, false, false, 0x7n, 0x4n),
  preset("CRC-3/ROHC", 3, 0x3n, 0x7n, true, true, 0x0n, 0x6n),
  preset("CRC-4/G-704", 4, 0x3n, 0x0n, true, true, 0x0n, 0x7n, ["CRC-4/ITU"]),
  preset("CRC-4/INTERLAKEN", 4, 0x3n, 0xfn, false, false, 0xfn, 0xbn),
  preset("CRC-5/EPC-C1G2", 5, 0x9n, 0x9n, false, false, 0x0n, 0x0n, ["CRC-5/EPC"]),
  preset("CRC-5/G-704", 5, 0x15n, 0x0n, true, true, 0x0n, 0x7n, ["CRC-5/ITU"]),
  preset("CRC-5/USB", 5, 0x5n, 0x1fn, true, true, 0x1fn, 0x19n),
  preset("CRC-6/CDMA2000-A", 6, 0x27n, 0x3fn, false, false, 0x0n, 0xdn),
  preset("CRC-6/CDMA2000-B", 6, 0x7n, 0x3fn, false, false, 0x0n, 0x3bn),
  preset("CRC-6/DARC", 6, 0x19n, 0x0n, true, true, 0x0n, 0x26n),
  preset("CRC-6/G-704", 6, 0x3n, 0x0n, true, true, 0x0n, 0x6n, ["CRC-6/ITU"]),
  preset("CRC-6/GSM", 6, 0x2fn, 0x0n, false, false, 0x3fn, 0x13n),
  preset("CRC-7/MMC", 7, 0x9n, 0x0n, false, false, 0x0n, 0x75n, ["CRC-7"]),
  preset("CRC-7/ROHC", 7, 0x4fn, 0x7fn, true, true, 0x0n, 0x53n),
  preset("CRC-7/UMTS", 7, 0x45n, 0x0n, false, false, 0x0n, 0x61n),
  preset("CRC-8/AUTOSAR", 8, 0x2fn, 0xffn, false, false, 0xffn, 0xdfn),
  preset("CRC-8/BLUETOOTH", 8, 0xa7n, 0x0n, true, true, 0x0n, 0x26n),
  preset("CRC-8/CDMA2000", 8, 0x9bn, 0xffn, false, false, 0x0n, 0xdan),
  preset("CRC-8/DARC", 8, 0x39n, 0x0n, true, true, 0x0n, 0x15n),
  preset("CRC-8/DVB-S2", 8, 0xd5n, 0x0n, false, false, 0x0n, 0xbcn),
  preset("CRC-8/GSM-A", 8, 0x1dn, 0x0n, false, false, 0x0n, 0x37n),
  preset("CRC-8/GSM-B", 8, 0x49n, 0x0n, false, false, 0xffn, 0x94n),
  preset("CRC-8/HITAG", 8, 0x1dn, 0xffn, false, false, 0x0n, 0xb4n),
  preset("CRC-8/I-432-1", 8, 0x7n, 0x0n, false, false, 0x55n, 0xa1n, ["CRC-8/ITU"]),
  preset("CRC-8/I-CODE", 8, 0x1dn, 0xfdn, false, false, 0x0n, 0x7en),
  preset("CRC-8/LTE", 8, 0x9bn, 0x0n, false, false, 0x0n, 0xean),
  preset("CRC-8/MAXIM-DOW", 8, 0x31n, 0x0n, true, true, 0x0n, 0xa1n, ["CRC-8/MAXIM", "DOW-CRC"]),
  preset("CRC-8/MIFARE-MAD", 8, 0x1dn, 0xc7n, false, false, 0x0n, 0x99n),
  preset("CRC-8/NRSC-5", 8, 0x31n, 0xffn, false, false, 0x0n, 0xf7n),
  preset("CRC-8/OPENSAFETY", 8, 0x2fn, 0x0n, false, false, 0x0n, 0x3en),
  preset("CRC-8/ROHC", 8, 0x7n, 0xffn, true, true, 0x0n, 0xd0n),
  preset("CRC-8/SAE-J1850", 8, 0x1dn, 0xffn, false, false, 0xffn, 0x4bn),
  preset("CRC-8/SMBUS", 8, 0x7n, 0x0n, false, false, 0x0n, 0xf4n, ["CRC-8"]),
  preset("CRC-8/TECH-3250", 8, 0x1dn, 0xffn, true, true, 0x0n, 0x97n, ["CRC-8/AES", "CRC-8/EBU"]),
  preset("CRC-8/WCDMA", 8, 0x9bn, 0x0n, true, true, 0x0n, 0x25n),
  preset("CRC-10/ATM", 10, 0x233n, 0x0n, false, false, 0x0n, 0x199n, ["CRC-10", "CRC-10/I-610"]),
  preset("CRC-10/CDMA2000", 10, 0x3d9n, 0x3ffn, false, false, 0x0n, 0x233n),
  preset("CRC-10/GSM", 10, 0x175n, 0x0n, false, false, 0x3ffn, 0x12an),
  preset("CRC-11/FLEXRAY", 11, 0x385n, 0x1an, false, false, 0x0n, 0x5a3n, ["CRC-11"]),
  preset("CRC-11/UMTS", 11, 0x307n, 0x0n, false, false, 0x0n, 0x61n),
  preset("CRC-12/CDMA2000", 12, 0xf13n, 0xfffn, false, false, 0x0n, 0xd4dn),
  preset("CRC-12/DECT", 12, 0x80fn, 0x0n, false, false, 0x0n, 0xf5bn, ["X-CRC-12"]),
  preset("CRC-12/GSM", 12, 0xd31n, 0x0n, false, false, 0xfffn, 0xb34n),
  preset("CRC-12/UMTS", 12, 0x80fn, 0x0n, false, true, 0x0n, 0xdafn, ["CRC-12/3GPP"]),
  preset("CRC-13/BBC", 13, 0x1cf5n, 0x0n, false, false, 0x0n, 0x4fan),
  preset("CRC-14/DARC", 14, 0x805n, 0x0n, true, true, 0x0n, 0x82dn),
  preset("CRC-14/GSM", 14, 0x202dn, 0x0n, false, false, 0x3fffn, 0x30aen),
  preset("CRC-15/CAN", 15, 0x4599n, 0x0n, false, false, 0x0n, 0x59en, ["CRC-15"]),
  preset("CRC-15/MPT1327", 15, 0x6815n, 0x0n, false, false, 0x1n, 0x2566n),
  preset("CRC-16/ARC", 16, 0x8005n, 0x0n, true, true, 0x0n, 0xbb3dn, ["CRC-16", "CRC-16/LHA", "CRC-IBM", "ARC"]),
  preset("CRC-16/CDMA2000", 16, 0xc867n, 0xffffn, false, false, 0x0n, 0x4c06n),
  preset("CRC-16/CMS", 16, 0x8005n, 0xffffn, false, false, 0x0n, 0xaee7n),
  preset("CRC-16/DDS-110", 16, 0x8005n, 0x800dn, false, false, 0x0n, 0x9ecfn),
  preset("CRC-16/DECT-R", 16, 0x589n, 0x0n, false, false, 0x1n, 0x7en, ["R-CRC-16"]),
  preset("CRC-16/DECT-X", 16, 0x589n, 0x0n, false, false, 0x0n, 0x7fn, ["X-CRC-16"]),
  preset("CRC-16/DNP", 16, 0x3d65n, 0x0n, true, true, 0xffffn, 0xea82n),
  preset("CRC-16/EN-13757", 16, 0x3d65n, 0x0n, false, false, 0xffffn, 0xc2b7n),
  preset("CRC-16/GENIBUS", 16, 0x1021n, 0xffffn, false, false, 0xffffn, 0xd64en, [
    "CRC-16/EPC",
    "CRC-16/DARC",
    "CRC-16/I-CODE",
    "CRC-16/EPC-C1G2",
  ]),
  preset("CRC-16/GSM", 16, 0x1021n, 0x0n, false, false, 0xffffn, 0xce3cn),
  preset("CRC-16/IBM-3740", 16, 0x1021n, 0xffffn, false, false, 0x0n, 0x29b1n, ["CRC-16/CCITT-FALSE", "CRC-16/AUTOSAR"]),
  preset("CRC-16/IBM-SDLC", 16, 0x1021n, 0xffffn, true, true, 0xffffn, 0x906en, [
    "CRC-16/X-25",
    "CRC-16/ISO-HDLC",
    "CRC-B",
    "CRC-16/ISO-IEC-14443-3-B",
    "X-25",
  ]),
  preset("CRC-16/ISO-IEC-14443-3-A", 16, 0x1021n, 0xc6c6n, true, true, 0x0n, 0xbf05n, ["CRC-A"]),
  preset("CRC-16/KERMIT", 16, 0x1021n, 0x0n, true, true, 0x0n, 0x2189n, [
    "CRC-16/CCITT",
    "CRC-16/CCITT-TRUE",
    "CRC-CCITT",
    "CRC-16/BLUETOOTH",
    "CRC-16/V-41-LSB",
    "KERMIT",
  ]),
  preset("CRC-16/LJ1200", 16, 0x6f63n, 0x0n, false, false, 0x0n, 0xbdf4n),
  preset("CRC-16/M17", 16, 0x5935n, 0xffffn, false, false, 0x0n, 0x772bn),
  preset("CRC-16/MAXIM-DOW", 16, 0x8005n, 0x0n, true, true, 0xffffn, 0x44c2n, ["CRC-16/MAXIM"]),
  preset("CRC-16/MCRF4XX", 16, 0x1021n, 0xffffn, true, true, 0x0n, 0x6f91n),
  preset("CRC-16/MODBUS", 16, 0x8005n, 0xffffn, true, true, 0x0n, 0x4b37n, ["MODBUS"]),
  preset("CRC-16/NRSC-5", 16, 0x80bn, 0xffffn, true, true, 0x0n, 0xa066n),
  preset("CRC-16/OPENSAFETY-A", 16, 0x5935n, 0x0n, false, false, 0x0n, 0x5d38n),
  preset("CRC-16/OPENSAFETY-B", 16, 0x755bn, 0x0n, false, false, 0x0n, 0x20fen),
  preset("CRC-16/PROFIBUS", 16, 0x1dcfn, 0xffffn, false, false, 0xffffn, 0xa819n, ["CRC-16/IEC-61158-2"]),
  preset("CRC-16/RIELLO", 16, 0x1021n, 0xb2aan, true, true, 0x0n, 0x63d0n),
  preset("CRC-16/SPI-FUJITSU", 16, 0x1021n, 0x1d0fn, false, false, 0x0n, 0xe5ccn, ["CRC-16/AUG-CCITT"]),
  preset("CRC-16/T10-DIF", 16, 0x8bb7n, 0x0n, false, false, 0x0n, 0xd0dbn),
  preset("CRC-16/TELEDISK", 16, 0xa097n, 0x0n, false, false, 0x0n, 0xfb3n),
  preset("CRC-16/TMS37157", 16, 0x1021n, 0x89ecn, true, true, 0x0n, 0x26b1n),
  preset("CRC-16/UMTS", 16, 0x8005n, 0x0n, false, false, 0x0n, 0xfee8n, ["CRC-16/BUYPASS", "CRC-16/VERIFONE"]),
  preset("CRC-16/USB", 16, 0x8005n, 0xffffn, true, true, 0xffffn, 0xb4c8n),
  preset("CRC-16/XMODEM", 16, 0x1021n, 0x0n, false, false, 0x0n, 0x31c3n, [
    "XMODEM",
    "ZMODEM",
    "CRC-16/ACORN",
    "CRC-16/LTE",
    "CRC-16/V-41-MSB",
  ]),
  preset("CRC-17/CAN-FD", 17, 0x1685bn, 0x0n, false, false, 0x0n, 0x4f03n),
  preset("CRC-21/CAN-FD", 21, 0x102899n, 0x0n, false, false, 0x0n, 0xed841n),
  preset("CRC-24/BLE", 24, 0x65bn, 0x555555n, true, true, 0x0n, 0xc25a56n),
  preset("CRC-24/FLEXRAY-A", 24, 0x5d6dcbn, 0xfedcban, false, false, 0x0n, 0x7979bdn),
  preset("CRC-24/FLEXRAY-B", 24, 0x5d6dcbn, 0xabcdefn, false, false, 0x0n, 0x1f23b8n),
  preset("CRC-24/INTERLAKEN", 24, 0x328b63n, 0xffffffn, false, false, 0xffffffn, 0xb4f3e6n),
  preset("CRC-24/LTE-A", 24, 0x864cfbn, 0x0n, false, false, 0x0n, 0xcde703n),
  preset("CRC-24/LTE-B", 24, 0x800063n, 0x0n, false, false, 0x0n, 0x23ef52n),
  preset("CRC-24/OPENPGP", 24, 0x864cfbn, 0xb704cen, false, false, 0x0n, 0x21cf02n, ["CRC-24"]),
  preset("CRC-24/OS-9", 24, 0x800063n, 0xffffffn, false, false, 0xffffffn, 0x200fa5n),
  preset("CRC-30/CDMA", 30, 0x2030b9c7n, 0x3fffffffn, false, false, 0x3fffffffn, 0x4c34abfn),
  preset("CRC-31/PHILIPS", 31, 0x4c11db7n, 0x7fffffffn, false, false, 0x7fffffffn, 0xce9e46cn),
  preset("CRC-32/AIXM", 32, 0x814141abn, 0x0n, false, false, 0x0n, 0x3010bf7fn, ["CRC-32Q"]),
  preset("CRC-32/AUTOSAR", 32, 0xf4acfb13n, 0xffffffffn, true, true, 0xffffffffn, 0x1697d06an),
  preset("CRC-32/BASE91-D", 32, 0xa833982bn, 0xffffffffn, true, true, 0xffffffffn, 0x87315576n, ["CRC-32D"]),
  preset("CRC-32/BZIP2", 32, 0x4c11db7n, 0xffffffffn, false, false, 0xffffffffn, 0xfc891918n, [
    "CRC-32/AAL5",
    "B-CRC-32",
    "CRC-32/DECT-B",
  ]),
  preset("CRC-32/CD-ROM-EDC", 32, 0x8001801bn, 0x0n, true, true, 0x0n, 0x6ec2edc4n),
  preset("CRC-32/CKSUM", 32, 0x4c11db7n, 0x0n, false, false, 0xffffffffn, 0x765e7680n, ["CKSUM", "CRC-32/POSIX"]),
  preset("CRC-32/ISCSI", 32, 0x1edc6f41n, 0xffffffffn, true, true, 0xffffffffn, 0xe3069283n, [
    "CRC-32C",
    "CRC-32/CASTAGNOLI",
    "CRC-32/NVME",
    "CRC-32/BASE91-C",
    "CRC-32/INTERLAKEN",
  ]),
  preset("CRC-32/ISO-HDLC", 32, 0x4c11db7n, 0xffffffffn, true, true, 0xffffffffn, 0xcbf43926n, [
    "CRC-32",
    "PKZIP",
    "CRC-32/V-42",
    "CRC-32/ADCCP",
    "CRC-32/XZ",
  ]),
  preset("CRC-32/JAMCRC", 32, 0x4c11db7n, 0xffffffffn, true, true, 0x0n, 0x340bc6d9n, ["JAMCRC"]),
  preset("CRC-32/MEF", 32, 0x741b8cd7n, 0xffffffffn, true, true, 0x0n, 0xd2c22f51n),
  preset("CRC-32/MPEG-2", 32, 0x4c11db7n, 0xffffffffn, false, false, 0x0n, 0x376e6e7n),
  preset("CRC-32/XFER", 32, 0xafn, 0x0n, false, false, 0x0n, 0xbd0be338n, ["XFER"]),
  preset("CRC-40/GSM", 40, 0x4820009n, 0x0n, false, false, 0xffffffffffn, 0xd4164fc646n),
  preset("CRC-64/ECMA-182", 64, 0x42f0e1eba9ea3693n, 0x0n, false, false, 0x0n, 0x6c40df5f0b497347n, ["CRC-64"]),
  preset("CRC-64/GO-ISO", 64, 0x1bn, 0xffffffffffffffffn, true, true, 0xffffffffffffffffn, 0xb90956c775a41001n),
  preset("CRC-64/MS", 64, 0x259c84cba6426349n, 0xffffffffffffffffn, true, true, 0x0n, 0x75d4b74f024eceean),
  preset("CRC-64/NVME", 64, 0xad93d23594c93659n, 0xffffffffffffffffn, true, true, 0xffffffffffffffffn, 0xae8b14860a799888n),
  preset("CRC-64/REDIS", 64, 0xad93d23594c935a9n, 0x0n, true, true, 0x0n, 0xe9c6d914c4b8d9can),
  preset("CRC-64/WE", 64, 0x42f0e1eba9ea3693n, 0xffffffffffffffffn, false, false, 0xffffffffffffffffn, 0x62ec59e3f1a4f00an),
  preset("CRC-64/XZ", 64, 0x42f0e1eba9ea3693n, 0xffffffffffffffffn, true, true, 0xffffffffffffffffn, 0x995dc9bbdf1939fan, [
    "CRC-64/GO-ECMA",
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
