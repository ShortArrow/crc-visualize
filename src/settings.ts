import type { ConfigForm } from "./domain/parse";
import type { InputMode } from "./domain/presets";
import { isLocale, type Locale } from "./i18n/locale";
import { breakpointsFromParam, breakpointsToParam, type Breakpoint } from "./playback/breakpoints";
import type { SpeedMode } from "./playback/playback";
import { CODE_LANGS, type CodeLang } from "./ui/codeLangs";
import { RATES } from "./ui/Controls";

/** Settings restored on the next visit; the playback position is not included. */
export type Settings = Readonly<{
  form: ConfigForm;
  speedMode: SpeedMode;
  rate: number;
  loop: boolean;
  codeLang: CodeLang;
  locale: Locale;
  breakpoints: readonly Breakpoint[];
}>;

/** localStorage key; bump the version when the stored format changes. */
export const SETTINGS_KEY = "crc-visualize:settings:v1";

const INPUT_MODES: readonly InputMode[] = ["bits", "hex", "text"];
const SPEED_MODES: readonly SpeedMode[] = ["auto", "steady"];
const CODE_LANG_IDS = Object.keys(CODE_LANGS) as CodeLang[];

type Fields = Readonly<Record<string, unknown>>;
const isRecord = (v: unknown): v is Fields => typeof v === "object" && v !== null && !Array.isArray(v);
const pick = <T>(v: unknown, valid: (x: unknown) => x is T, fallback: T): T => (valid(v) ? v : fallback);
const isString = (x: unknown): x is string => typeof x === "string";
const isBoolean = (x: unknown): x is boolean => typeof x === "boolean";
const oneOf =
  <T>(options: readonly T[]) =>
  (x: unknown): x is T =>
    options.includes(x as T);

function restoreForm(v: unknown, d: ConfigForm): ConfigForm {
  const f = isRecord(v) ? v : {};
  return {
    width: pick(f.width, isString, d.width),
    poly: pick(f.poly, isString, d.poly),
    init: pick(f.init, isString, d.init),
    refin: pick(f.refin, isBoolean, d.refin),
    refout: pick(f.refout, isBoolean, d.refout),
    xorout: pick(f.xorout, isString, d.xorout),
    inputMode: pick(f.inputMode, oneOf(INPUT_MODES), d.inputMode),
    input: pick(f.input, isString, d.input),
  };
}

/** Breakpoints of unknown shape, kept only where they read back the same through the bp parameter. */
const restoreBreakpoints = (v: unknown, d: readonly Breakpoint[]): readonly Breakpoint[] =>
  Array.isArray(v) && v.every(isRecord) ? breakpointsFromParam(breakpointsToParam(v as Breakpoint[])) : d;

/** Restores settings from the stored string raw; unreadable items and items with the wrong shape or range take the defaults value. */
export function restoreSettings(raw: string | null, defaults: Settings): Settings {
  let parsed: unknown;
  try {
    parsed = raw === null ? undefined : JSON.parse(raw);
  } catch {
    parsed = undefined;
  }
  return validate(parsed, defaults);
}

/** Validates a value v of unknown shape as settings; invalid items take the defaults value. */
function validate(v: unknown, defaults: Settings): Settings {
  const s = isRecord(v) ? v : {};
  return {
    form: restoreForm(s.form, defaults.form),
    speedMode: pick(s.speedMode, oneOf(SPEED_MODES), defaults.speedMode),
    rate: pick(s.rate, oneOf<number>(RATES), defaults.rate),
    loop: pick(s.loop, isBoolean, defaults.loop),
    codeLang: pick(s.codeLang, oneOf(CODE_LANG_IDS), defaults.codeLang),
    locale: pick(s.locale, isLocale, defaults.locale),
    breakpoints: restoreBreakpoints(s.breakpoints, defaults.breakpoints),
  };
}

const TEXT_FIELDS = ["width", "poly", "init", "xorout", "inputMode", "input"] as const;
const FLAG_FIELDS = ["refin", "refout"] as const;
const flag = (b: boolean) => (b ? "1" : "0");
const unflag = (v: string): unknown => (v === "1" ? true : v === "0" ? false : v);

/** Turns settings into a URL query string (without the leading ?); booleans are 1/0, the speed mode is speed, the code language is code, the display language is lang, the breakpoints are bp. */
export function settingsToQuery({ form, speedMode, rate, loop, codeLang, locale, breakpoints }: Settings): string {
  const q = new URLSearchParams();
  for (const k of TEXT_FIELDS) q.set(k, form[k]);
  for (const k of FLAG_FIELDS) q.set(k, flag(form[k]));
  q.set("speed", speedMode);
  q.set("rate", String(rate));
  q.set("loop", flag(loop));
  q.set("code", codeLang);
  q.set("lang", locale);
  q.set("bp", breakpointsToParam(breakpoints));
  return q.toString();
}

/** Reads settings from the URL query search; items missing from the query and invalid items take the base value. */
export function settingsFromQuery(search: string, base: Settings): Settings {
  const q = new URLSearchParams(search);
  const has = (k: string) => q.has(k);
  const get = (k: string) => q.get(k)!;
  const form: Record<string, unknown> = { ...base.form };
  for (const k of TEXT_FIELDS) if (has(k)) form[k] = get(k);
  for (const k of FLAG_FIELDS) if (has(k)) form[k] = unflag(get(k));
  return validate(
    {
      form,
      speedMode: has("speed") ? get("speed") : base.speedMode,
      rate: has("rate") ? Number(get("rate")) : base.rate,
      loop: has("loop") ? unflag(get("loop")) : base.loop,
      codeLang: has("code") ? get("code") : base.codeLang,
      locale: has("lang") ? get("lang") : base.locale,
      breakpoints: has("bp") ? breakpointsFromParam(get("bp")) : base.breakpoints,
    },
    base,
  );
}

/** Reads settings from localStorage; returns defaults where storage is unavailable. */
export function loadSettings(defaults: Settings): Settings {
  try {
    return restoreSettings(localStorage.getItem(SETTINGS_KEY), defaults);
  } catch {
    return defaults;
  }
}

/** Writes settings to localStorage; does nothing where storage is unavailable, so as not to block the user. */
export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    return;
  }
}

/** Settings at startup; items in the URL query take precedence over the localStorage values (or defaults if none). */
export function initialSettings(defaults: Settings): Settings {
  return settingsFromQuery(location.search, loadSettings(defaults));
}

/** Saves settings to localStorage and rewrites the URL query without adding a history entry. */
export function persistSettings(settings: Settings): void {
  saveSettings(settings);
  history.replaceState(history.state, "", `${location.pathname}?${settingsToQuery(settings)}${location.hash}`);
}
