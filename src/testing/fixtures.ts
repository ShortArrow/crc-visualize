import { CATALOGUE, type Preset } from "../domain/presets";
import { trace, type Bit, type CrcParams, type Step } from "../domain/trace";

/** Turns a 0/1 string such as "10101" into bits; any character other than 1 becomes 0. */
export const bits = (s: string): Bit[] => [...s].map((c) => (c === "1" ? 1 : 0));

/** CRC-3 with no reflection and no final XOR (poly 0x3, init 0); the same parameters as the tutorial preset CRC-3/TUTORIAL. */
export const plain3: CrcParams = { width: 3, poly: 0b011, init: 0, refin: false, refout: false, xorout: 0 };

/** The first step of kind `kind` in steps. */
export const stepOf = (steps: readonly Step[], kind: Step["kind"]): Step => steps.find((s) => s.kind === kind)!;

/** The first step of kind `kind` when input is fed through params. */
export const firstStep = (params: CrcParams, input: string, kind: Step["kind"]): Step => stepOf(trace(params, bits(input)), kind);

/**
 * A fixed sample of 21 catalogue presets, in this order. Tests of grouping and narrowing use it so that their expectations
 * do not change when presets are added to the catalogue.
 */
export const SAMPLE_PRESETS: readonly Preset[] = [
  "CRC-3/GSM",
  "CRC-4/G-704",
  "CRC-5/USB",
  "CRC-7/MMC",
  "CRC-8/SMBUS",
  "CRC-8/MAXIM-DOW",
  "CRC-8/AUTOSAR",
  "CRC-8/SAE-J1850",
  "CRC-16/ARC",
  "CRC-16/MODBUS",
  "CRC-16/USB",
  "CRC-16/IBM-3740",
  "CRC-16/XMODEM",
  "CRC-16/KERMIT",
  "CRC-16/IBM-SDLC",
  "CRC-16/SPI-FUJITSU",
  "CRC-16/GENIBUS",
  "CRC-32/ISO-HDLC",
  "CRC-32/BZIP2",
  "CRC-32/MPEG-2",
  "CRC-32/ISCSI",
].map((name) => CATALOGUE.find((p) => p.name === name)!);
