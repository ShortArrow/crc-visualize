import type { InputMode } from "./presets";
import { bitsFromBytes, type Bit, type CrcParams } from "./trace";

export const MAX_INPUT_BITS = 256;

/** Raw values of the settings form. */
export type ConfigForm = Readonly<{
  width: string;
  poly: string;
  init: string;
  refin: boolean;
  refout: boolean;
  xorout: string;
  inputMode: InputMode;
  input: string;
}>;

export type ConfigField = "width" | "poly" | "init" | "xorout" | "input";

/**
 * Field errors. widthRange: width is not an integer from 1 to 32. notHex: not a hex number. tooWide: does not fit in width bits.
 * zero: 0 is not allowed. notBits: contains characters other than 0 and 1. oddHex: odd number of hex digits (not whole bytes).
 * tooLong: input exceeds max bits. refinBytes: refin is used but the input is not a multiple of 8 bits.
 */
export type ConfigError =
  | Readonly<{ code: "widthRange" | "notHex" | "zero" | "notBits" | "oddHex" | "refinBytes" }>
  | Readonly<{ code: "tooWide"; width: number }>
  | Readonly<{ code: "tooLong"; max: number }>;

export type ConfigResult =
  { ok: true; params: CrcParams; bits: Bit[] } | { ok: false; errors: Partial<Record<ConfigField, ConfigError>> };

type Parsed<T> = { ok: true; value: T } | { ok: false; error: ConfigError };

const ok = <T>(value: T): Parsed<T> => ({ ok: true, value });
const fail = (error: ConfigError): Parsed<never> => ({ ok: false, error });

function parseWidth(text: string): Parsed<number> {
  const t = text.trim();
  if (!/^\d+$/.test(t)) return fail({ code: "widthRange" });
  const n = Number(t);
  return n >= 1 && n <= 32 ? ok(n) : fail({ code: "widthRange" });
}

function parseHexBelow(text: string, width: number, allowZero: boolean): Parsed<number> {
  const t = text.trim().replace(/^0x/i, "");
  if (!/^[0-9a-f]+$/i.test(t)) return fail({ code: "notHex" });
  const n = Number.parseInt(t, 16);
  if (n >= 2 ** width) return fail({ code: "tooWide", width });
  if (!allowZero && n === 0) return fail({ code: "zero" });
  return ok(n);
}

function parseInputBits(mode: InputMode, text: string): Parsed<Bit[]> {
  switch (mode) {
    case "bits": {
      const t = text.replace(/\s/g, "");
      return /^[01]*$/.test(t) ? ok([...t].map((c) => (c === "1" ? 1 : 0))) : fail({ code: "notBits" });
    }
    case "hex": {
      const t = text.replace(/\s/g, "");
      if (!/^[0-9a-f]*$/i.test(t)) return fail({ code: "notHex" });
      if (t.length % 2 !== 0) return fail({ code: "oddHex" });
      return ok(bitsFromBytes(t.match(/../g)?.map((h) => Number.parseInt(h, 16)) ?? []));
    }
    case "text":
      return ok(bitsFromBytes([...new TextEncoder().encode(text)]));
  }
}

function checkInput(bits: Parsed<Bit[]>, refin: boolean): Parsed<Bit[]> {
  if (!bits.ok) return bits;
  if (bits.value.length > MAX_INPUT_BITS) return fail({ code: "tooLong", max: MAX_INPUT_BITS });
  if (refin && bits.value.length % 8 !== 0) return fail({ code: "refinBytes" });
  return bits;
}

/** Validates the form values and turns them into CRC parameters and input bits; errors are returned per field. */
export function parseConfig(form: ConfigForm): ConfigResult {
  const errors: Partial<Record<ConfigField, ConfigError>> = {};
  const width = parseWidth(form.width);
  const input = checkInput(parseInputBits(form.inputMode, form.input), form.refin);
  if (!input.ok) errors.input = input.error;
  if (!width.ok) {
    return { ok: false, errors: { width: width.error, ...errors } };
  }

  const poly = parseHexBelow(form.poly, width.value, false);
  const init = parseHexBelow(form.init, width.value, true);
  const xorout = parseHexBelow(form.xorout, width.value, true);
  if (!poly.ok) errors.poly = poly.error;
  if (!init.ok) errors.init = init.error;
  if (!xorout.ok) errors.xorout = xorout.error;
  if (!poly.ok || !init.ok || !xorout.ok || !input.ok) return { ok: false, errors };

  return {
    ok: true,
    params: {
      width: width.value,
      poly: poly.value,
      init: init.value,
      refin: form.refin,
      refout: form.refout,
      xorout: xorout.value,
    },
    bits: input.value,
  };
}
