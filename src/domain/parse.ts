import { frameSpan, type CrcField, type FrameLayout } from "./frames";
import { elementOf, readBytes, readValue, type Base, type ElementId, type PasteError } from "./paste";
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
  /** The base each field that reads pasted numbers is read in, and the element the hex input is read in. */
  bases: Readonly<Record<BaseField, Base>>;
  element: ElementId;
}>;

/** The fields that read pasted numbers and have a base badge. */
export const BASE_FIELDS = ["input", "poly", "init", "xorout"] as const;
export type BaseField = (typeof BASE_FIELDS)[number];

export type ConfigField = "width" | "poly" | "init" | "xorout" | "input" | "range";

/**
 * Field errors. widthRange: width is not an integer from 1 to 64. The errors of pasted text (see PasteError) are on the hex input
 * and on poly, init and xorout. zero: 0 is not allowed. notBits: contains characters other than 0 and 1. tooLong: input exceeds
 * max bits. refinBytes: refin is used but the input is not a multiple of 8 bits. notIndex: a byte number is not an integer of 0 or
 * more. outsideFrame: the range or the CRC field does not fit the selected frame. tooManyFrames: hex
 * input has more than max lines. frameTooLong: a line of hex input is longer than max bytes.
 */
export type ConfigError =
  | Readonly<{ code: "widthRange" | "zero" | "notBits" | "refinBytes" | "notIndex" | "outsideFrame" }>
  | PasteError
  | Readonly<{ code: "tooLong" | "tooManyFrames" | "frameTooLong"; max: number }>;

/** The frames of hex input, one per non-blank line, the layout shared by all of them, and the frame being visualized. */
export type Frames = Readonly<{ list: readonly (readonly number[])[]; layout: FrameLayout; selected: number }>;

/** bits are what is visualized: the input, or with hex input, the CRC range of the selected frame. */
export type ConfigResult =
  { ok: true; params: CrcParams; bits: Bit[] } | { ok: false; errors: Partial<Record<ConfigField, ConfigError>> };

type Parsed<T> = { ok: true; value: T } | { ok: false; error: ConfigError };

const ok = <T>(value: T): Parsed<T> => ({ ok: true, value });
const fail = (error: ConfigError): Parsed<never> => ({ ok: false, error });

/** Reads a width: a whole number from 1 to 64. */
export function parseWidth(text: string): Parsed<number> {
  const t = text.trim();
  if (!/^\d+$/.test(t)) return fail({ code: "widthRange" });
  const n = Number(t);
  return n >= 1 && n <= 64 ? ok(n) : fail({ code: "widthRange" });
}

function parseValueBelow(text: string, base: Base, width: number, allowZero: boolean): Parsed<bigint> {
  const n = readValue(text, base, width);
  if (!n.ok) return n;
  if (!allowZero && n.value === 0n) return fail({ code: "zero" });
  return n;
}

function parseInputBits(form: ConfigForm): Parsed<Bit[]> {
  const text = form.input;
  switch (form.inputMode) {
    case "bits": {
      const t = text.replace(/\s/g, "");
      return /^[01]*$/.test(t) ? ok([...t].map((c) => (c === "1" ? 1 : 0))) : fail({ code: "notBits" });
    }
    case "hex": {
      const frames = parseHexFrames(form);
      return frames.ok ? ok(bitsFromBytes(frames.value.flat())) : frames;
    }
    case "text":
      return ok(bitsFromBytes([...new TextEncoder().encode(text)]));
  }
}

/** Reads hex input as frames, one per line that holds a number, within the limits on frames. */
function parseHexFrames(form: ConfigForm): Parsed<number[][]> {
  const read = readBytes(form.input, form.bases.input, elementOf(form.element));
  if (!read.ok) return read;
  const lines = read.value;
  if (lines.length > MAX_FRAMES) return fail({ code: "tooManyFrames", max: MAX_FRAMES });
  if (lines.some((l) => l.length > MAX_FRAME_BYTES)) return fail({ code: "frameTooLong", max: MAX_FRAME_BYTES });
  return ok(lines);
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
  const list = parseHexFrames(form);
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
  const list = parseHexFrames(form);
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
  const input = checkInput(hex?.input ?? parseInputBits(form), form.refin);
  if (!input.ok) errors.input = input.error;
  if (hex?.range) errors.range = hex.range;
  if (!width.ok) {
    return { ok: false, errors: { width: width.error, ...errors } };
  }

  const poly = parseValueBelow(form.poly, form.bases.poly, width.value, false);
  const init = parseValueBelow(form.init, form.bases.init, width.value, true);
  const xorout = parseValueBelow(form.xorout, form.bases.xorout, width.value, true);
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
