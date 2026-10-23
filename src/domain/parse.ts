import { frameSpan, type CrcField, type FrameLayout } from "./frames";
import type { InputMode } from "./presets";
import { bitsFromBytes, type Bit, type CrcParams } from "./trace";

export const MAX_INPUT_BITS = 256;
/** Limits on hex input, which bound the work of listing and checking every frame, whatever a shared URL carries. */
export const MAX_FRAMES = 64;
export const MAX_FRAME_BYTES = 256;

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
  /** CRC range and selected frame in hex input; see FrameLayout. Empty to means the range runs to the end. */
  from: string;
  to: string;
  crcField: CrcField;
  frame: string;
}>;

export type ConfigField = "width" | "poly" | "init" | "xorout" | "input" | "range";

/**
 * Field errors. widthRange: width is not an integer from 1 to 32. notHex: not a hex number. tooWide: does not fit in width bits.
 * zero: 0 is not allowed. notBits: contains characters other than 0 and 1. oddHex: odd number of hex digits (not whole bytes).
 * tooLong: input exceeds max bits. refinBytes: refin is used but the input is not a multiple of 8 bits. notIndex: a byte number
 * is not an integer of 0 or more. outsideFrame: the range or the CRC field does not fit the selected frame. tooManyFrames: hex
 * input has more than max lines. frameTooLong: a line of hex input is longer than max bytes.
 */
export type ConfigError =
  | Readonly<{ code: "widthRange" | "notHex" | "zero" | "notBits" | "oddHex" | "refinBytes" | "notIndex" | "outsideFrame" }>
  | Readonly<{ code: "tooWide"; width: number }>
  | Readonly<{ code: "tooLong" | "tooManyFrames" | "frameTooLong"; max: number }>;

/** The frames of hex input, one per non-blank line, the layout shared by all of them, and the frame being visualized. */
export type Frames = Readonly<{ list: readonly (readonly number[])[]; layout: FrameLayout; selected: number }>;

/** bits are what is visualized: the input, or with hex input, the CRC range of the selected frame. */
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
      const frames = parseHexFrames(text);
      return frames.ok ? ok(bitsFromBytes(frames.value.flat())) : frames;
    }
    case "text":
      return ok(bitsFromBytes([...new TextEncoder().encode(text)]));
  }
}

/** Reads hex input as frames: each non-blank line is one frame of whole bytes, whitespace ignored. */
function parseHexFrames(text: string): Parsed<number[][]> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s/g, ""))
    .filter((l) => l !== "");
  if (!lines.every((l) => /^[0-9a-f]*$/i.test(l))) return fail({ code: "notHex" });
  if (!lines.every((l) => l.length % 2 === 0)) return fail({ code: "oddHex" });
  if (lines.length > MAX_FRAMES) return fail({ code: "tooManyFrames", max: MAX_FRAMES });
  if (lines.some((l) => l.length / 2 > MAX_FRAME_BYTES)) return fail({ code: "frameTooLong", max: MAX_FRAME_BYTES });
  return ok(lines.map((l) => l.match(/../g)!.map((h) => Number.parseInt(h, 16))));
}

/** Reads a byte number; empty is undefined. */
function parseIndex(text: string): Parsed<number | undefined> {
  const t = text.trim();
  if (t === "") return ok(undefined);
  return /^\d+$/.test(t) ? ok(Number(t)) : fail({ code: "notIndex" });
}

function parseFrameLayout(form: ConfigForm): Parsed<FrameLayout> {
  const from = parseIndex(form.from);
  const to = parseIndex(form.to);
  if (!from.ok) return from;
  if (!to.ok) return to;
  return ok({ from: from.value ?? 0, crcField: form.crcField, ...(to.value === undefined ? {} : { to: to.value }) });
}

/** Number of the selected frame, clamped to the count frames there are; 0 when it cannot be read. */
function selectedFrame(form: ConfigForm, count: number): number {
  const t = form.frame.trim();
  return Math.max(0, Math.min(/^\d+$/.test(t) ? Number(t) : 0, count - 1));
}

/**
 * The frames of hex input as far as they can be read, so they can be shown while the form has errors: a layout that cannot be read
 * is taken as the whole frame with the CRC field chosen. undefined unless the input mode is hex and the hex can be read.
 */
export function readFrames(form: ConfigForm): Frames | undefined {
  if (form.inputMode !== "hex") return undefined;
  const list = parseHexFrames(form.input);
  if (!list.ok) return undefined;
  const layout = parseFrameLayout(form);
  return {
    list: list.value,
    layout: layout.ok ? layout.value : { from: 0, crcField: form.crcField },
    selected: selectedFrame(form, list.value.length),
  };
}

/** The bits to visualize from hex input: the CRC range of the selected frame, or none with no frames. Errors go on input or range. */
function frameBits(form: ConfigForm, width: number): { input: Parsed<Bit[]>; range?: ConfigError } {
  const list = parseHexFrames(form.input);
  if (!list.ok) return { input: list };
  const layout = parseFrameLayout(form);
  if (!layout.ok) return { input: ok([]), range: layout.error };
  const frame = list.value[selectedFrame(form, list.value.length)];
  if (!frame) return { input: ok([]) };
  const span = frameSpan(frame.length, layout.value, width);
  if (!span) return { input: ok([]), range: { code: "outsideFrame" } };
  return { input: ok(bitsFromBytes(frame.slice(span.from, span.to + 1))) };
}

function checkInput(bits: Parsed<Bit[]>, refin: boolean): Parsed<Bit[]> {
  if (!bits.ok) return bits;
  if (bits.value.length > MAX_INPUT_BITS) return fail({ code: "tooLong", max: MAX_INPUT_BITS });
  if (refin && bits.value.length % 8 !== 0) return fail({ code: "refinBytes" });
  return bits;
}

/** The width of the form when it can be read, so the frame layout can be shown while other fields have errors. */
export function readWidth(form: ConfigForm): number | undefined {
  const width = parseWidth(form.width);
  return width.ok ? width.value : undefined;
}

/** Validates the form values and turns them into CRC parameters and input bits; errors are returned per field. */
export function parseConfig(form: ConfigForm): ConfigResult {
  const errors: Partial<Record<ConfigField, ConfigError>> = {};
  const width = parseWidth(form.width);
  const hex = form.inputMode === "hex" && width.ok ? frameBits(form, width.value) : undefined;
  const input = checkInput(hex?.input ?? parseInputBits(form.inputMode, form.input), form.refin);
  if (!input.ok) errors.input = input.error;
  if (hex?.range) errors.range = hex.range;
  if (!width.ok) {
    return { ok: false, errors: { width: width.error, ...errors } };
  }

  const poly = parseHexBelow(form.poly, width.value, false);
  const init = parseHexBelow(form.init, width.value, true);
  const xorout = parseHexBelow(form.xorout, width.value, true);
  if (!poly.ok) errors.poly = poly.error;
  if (!init.ok) errors.init = init.error;
  if (!xorout.ok) errors.xorout = xorout.error;
  if (!poly.ok || !init.ok || !xorout.ok || !input.ok || hex?.range) return { ok: false, errors };

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
