import type { InputMode } from "./presets";
import { bitsFromBytes, type Bit, type CrcParams } from "./trace";

export const MAX_INPUT_BITS = 256;

/** 設定フォームの生の値。 */
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

export type ConfigResult =
  | { ok: true; params: CrcParams; bits: Bit[] }
  | { ok: false; errors: Partial<Record<ConfigField, string>> };

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const ok = <T>(value: T): Parsed<T> => ({ ok: true, value });
const fail = (error: string): Parsed<never> => ({ ok: false, error });

function parseWidth(text: string): Parsed<number> {
  const t = text.trim();
  if (!/^\d+$/.test(t)) return fail("1〜32 の整数を入れてください");
  const n = Number(t);
  return n >= 1 && n <= 32 ? ok(n) : fail("1〜32 の整数を入れてください");
}

function parseHexBelow(text: string, width: number, allowZero: boolean): Parsed<number> {
  const t = text.trim().replace(/^0x/i, "");
  if (!/^[0-9a-f]+$/i.test(t)) return fail("16 進数で入れてください");
  const n = Number.parseInt(t, 16);
  if (n >= 2 ** width) return fail(`${width} ビットに収まる値にしてください`);
  if (!allowZero && n === 0) return fail("0 は指定できません");
  return ok(n);
}

function parseInputBits(mode: InputMode, text: string): Parsed<Bit[]> {
  switch (mode) {
    case "bits": {
      const t = text.replace(/\s/g, "");
      return /^[01]*$/.test(t) ? ok([...t].map((c) => (c === "1" ? 1 : 0))) : fail("0 と 1 だけで入れてください");
    }
    case "hex": {
      const t = text.replace(/\s/g, "");
      if (!/^[0-9a-f]*$/i.test(t)) return fail("16 進数で入れてください");
      if (t.length % 2 !== 0) return fail("2 桁ずつ（バイト単位）で入れてください");
      return ok(bitsFromBytes(t.match(/../g)?.map((h) => Number.parseInt(h, 16)) ?? []));
    }
    case "text":
      return ok(bitsFromBytes([...new TextEncoder().encode(text)]));
  }
}

function checkInput(bits: Parsed<Bit[]>, refin: boolean): Parsed<Bit[]> {
  if (!bits.ok) return bits;
  if (bits.value.length > MAX_INPUT_BITS) return fail(`入力は ${MAX_INPUT_BITS} ビットまでです`);
  if (refin && bits.value.length % 8 !== 0) return fail("refin を使うときは 8 ビット単位で入れてください");
  return bits;
}

/** フォームの値を検証し、CRC パラメータと入力ビット列にする。誤りは項目ごとに返す。 */
export function parseConfig(form: ConfigForm): ConfigResult {
  const errors: Partial<Record<ConfigField, string>> = {};
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
