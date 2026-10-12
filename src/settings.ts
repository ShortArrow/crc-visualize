import type { ConfigForm } from "./domain/parse";
import type { InputMode } from "./domain/presets";
import type { SpeedMode } from "./playback/playback";
import { RATES } from "./ui/Controls";

/**
 * 次に開いたときに復元する設定。再生位置は含めない。
 * wide は内容を画面の横幅いっぱいに使うか。見る人の画面に合わせる設定なので URL のクエリには載せない。
 */
export type Settings = Readonly<{ form: ConfigForm; speedMode: SpeedMode; rate: number; loop: boolean; wide: boolean }>;

/** localStorage のキー。保存形式を変えるときは版を上げる。 */
export const SETTINGS_KEY = "crc-visualize:settings:v1";

const INPUT_MODES: readonly InputMode[] = ["bits", "hex", "text"];
const SPEED_MODES: readonly SpeedMode[] = ["auto", "steady"];

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

/** 保存文字列 raw から設定を復元する。読めない・形や範囲が正しくない項目は defaults の値にする。 */
export function restoreSettings(raw: string | null, defaults: Settings): Settings {
  let parsed: unknown;
  try {
    parsed = raw === null ? undefined : JSON.parse(raw);
  } catch {
    parsed = undefined;
  }
  return validate(parsed, defaults);
}

/** 形の分からない値 v を設定として検証する。正しくない項目は defaults の値にする。 */
function validate(v: unknown, defaults: Settings): Settings {
  const s = isRecord(v) ? v : {};
  return {
    form: restoreForm(s.form, defaults.form),
    speedMode: pick(s.speedMode, oneOf(SPEED_MODES), defaults.speedMode),
    rate: pick(s.rate, oneOf<number>(RATES), defaults.rate),
    loop: pick(s.loop, isBoolean, defaults.loop),
    wide: pick(s.wide, isBoolean, defaults.wide),
  };
}

const TEXT_FIELDS = ["width", "poly", "init", "xorout", "inputMode", "input"] as const;
const FLAG_FIELDS = ["refin", "refout"] as const;
const flag = (b: boolean) => (b ? "1" : "0");
const unflag = (v: string): unknown => (v === "1" ? true : v === "0" ? false : v);

/** 設定を URL のクエリ文字列（先頭の ? は含まない）にする。真偽値は 1/0、速度モードは speed。 */
export function settingsToQuery({ form, speedMode, rate, loop }: Settings): string {
  const q = new URLSearchParams();
  for (const k of TEXT_FIELDS) q.set(k, form[k]);
  for (const k of FLAG_FIELDS) q.set(k, flag(form[k]));
  q.set("speed", speedMode);
  q.set("rate", String(rate));
  q.set("loop", flag(loop));
  return q.toString();
}

/** URL のクエリ search から設定を読む。クエリに無い項目と正しくない項目は base の値にする。 */
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
      wide: base.wide,
    },
    base,
  );
}

/** localStorage から設定を読む。ストレージが使えない環境では defaults を返す。 */
export function loadSettings(defaults: Settings): Settings {
  try {
    return restoreSettings(localStorage.getItem(SETTINGS_KEY), defaults);
  } catch {
    return defaults;
  }
}

/** 設定を localStorage に書く。ストレージが使えない環境では、操作を妨げないよう何もしない。 */
export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    return;
  }
}

/** 起動時の設定。URL のクエリにある項目を、localStorage の保存値（無ければ defaults）より優先する。 */
export function initialSettings(defaults: Settings): Settings {
  return settingsFromQuery(location.search, loadSettings(defaults));
}

/** 設定を localStorage に保存し、履歴を増やさずに URL のクエリを書き換える。 */
export function persistSettings(settings: Settings): void {
  saveSettings(settings);
  history.replaceState(history.state, "", `${location.pathname}?${settingsToQuery(settings)}${location.hash}`);
}
